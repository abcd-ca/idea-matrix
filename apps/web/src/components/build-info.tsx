"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { APP_NAME, APP_VERSION, BUILD_COMMIT, SOURCE_URL, VERIFY_DOCS_URL } from "@/lib/config";
import { Trans, useTranslation } from "react-i18next";

// build.json is written next to the exported files by scripts/fingerprint.mjs
// after every build. It is the one request the app makes beyond loading the
// page, and it goes to this same site.
const BuildFile = z.object({
  app: z.literal("idea-matrix"),
  version: z.string(),
  commit: z.string(),
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  builtAt: z.string(),
  fileCount: z.number().int().nonnegative(),
  files: z.record(z.string(), z.string()),
});
type BuildFile = z.infer<typeof BuildFile>;

type State = { kind: "loading" } | { kind: "missing" } | { kind: "ready"; build: BuildFile };

const shortCommit = (commit: string, dirtySuffix: string) =>
  commit.replace(/-dirty$/, "").slice(0, 7) + (commit.endsWith("-dirty") ? dirtySuffix : "");
const commitSha = (commit: string) => commit.replace(/-dirty$/, "");
const isSha = (commit: string) => /^[0-9a-f]{40}$/.test(commitSha(commit));

export function BuildInfo() {
  const { t } = useTranslation("common");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/build.json", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const build = BuildFile.parse(await res.json());
        if (!cancelled) setState({ kind: "ready", build });
      } catch {
        if (!cancelled) setState({ kind: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const link = "underline underline-offset-4";
  const commitLink = isSha(BUILD_COMMIT) ? `${SOURCE_URL}/commit/${commitSha(BUILD_COMMIT)}` : SOURCE_URL;
  const checksLink = isSha(BUILD_COMMIT) ? `${SOURCE_URL}/commit/${commitSha(BUILD_COMMIT)}/checks` : SOURCE_URL;
  const dirtySuffix = t("build.withLocalChanges");

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        <Trans
          t={t}
          i18nKey="build.line"
          values={{ app: APP_NAME, version: APP_VERSION, commit: shortCommit(BUILD_COMMIT, dirtySuffix) }}
          components={{ a: <a href={commitLink} className={`font-mono ${link}`} target="_blank" rel="noreferrer" /> }}
        />
      </p>
      {state.kind === "loading" ? (
        <p className="text-muted-foreground">{t("build.reading")}</p>
      ) : state.kind === "missing" ? (
        <p className="text-muted-foreground">{t("build.missing")}</p>
      ) : (
        <>
          <p>
            {t("build.fingerprint")}{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs break-all">{state.build.fingerprint}</code>
          </p>
          {state.build.commit !== BUILD_COMMIT ? (
            <p role="alert" className="text-destructive">
              {t("build.mismatch", {
                fileCommit: shortCommit(state.build.commit, dirtySuffix),
                pageCommit: shortCommit(BUILD_COMMIT, dirtySuffix),
              })}
            </p>
          ) : null}
        </>
      )}
      <p className="text-muted-foreground">
        <Trans
          t={t}
          i18nKey="build.explain"
          components={{
            checks: <a href={checksLink} className={link} target="_blank" rel="noreferrer" />,
            how: <a href={VERIFY_DOCS_URL} className={link} target="_blank" rel="noreferrer" />,
          }}
        />
      </p>
    </div>
  );
}
