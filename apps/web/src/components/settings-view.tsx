"use client";

import { renameDocument } from "@idea-matrix/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BuildInfo } from "@/components/build-info";
import { ConnectAiPanel } from "@/components/connect-ai";
import { ExportMenu } from "@/components/export-menu";
import { GitHubMark } from "@/components/github-mark";
import { InstallApp } from "@/components/install-app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME, APP_VERSION, ISSUES_URL, MAINTAINER_NAME, MAINTAINER_URL, SOURCE_URL } from "@/lib/config";
import {
  closeFile,
  flushSave,
  moveToDrive,
  moveToLocal,
  openDriveFile,
  openExistingFile,
  signOutOfDrive,
} from "@/lib/file-session";
import { driveConfigured } from "@/lib/storage/google-drive";
import { supportsLocalFile } from "@/lib/storage/local-file";
import { useAppStore } from "@/lib/store";
import { LanguageSelect, ThemeSelect } from "@/components/device-preferences";
import { StartOver } from "@/components/start-over-dialog";
import { StorageIcon } from "@/components/storage-icon";
import { Trans, useTranslation } from "react-i18next";
import { useNameField } from "@/lib/use-name-field";

export function SettingsView() {
  const { t } = useTranslation("settings");
  const router = useRouter();
  const doc = useAppStore((s) => s.doc);
  const fileName = useAppStore((s) => s.fileName);
  const target = useAppStore((s) => s.target);
  const mutate = useAppStore((s) => s.mutate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matrixName = useNameField(doc?.name ?? "", (name) => setError(mutate((d) => renameDocument(d, name))));

  if (!doc) return null;

  // The buttons' title attributes never show on a touch screen, so the reasons are spelled out in the paragraph too.
  const whereNotes = [t("where.explain")];
  if (target === "drive" && !supportsLocalFile()) whereNotes.push(t("where.needsChromeLong"));
  whereNotes.push(t("where.dropboxLater"));
  if (target === "drive") whereNotes.push(t("where.signOutExplain"));

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{t("title")}</h1>

      <Section title={t("device.title")}>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="language">{t("language", { ns: "common" })}</Label>
            <LanguageSelect id="language" className="w-fit" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="theme">{t("theme", { ns: "common" })}</Label>
            <ThemeSelect id="theme" className="w-fit" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("device.note")}</p>
        <StartOver />
      </Section>

      <Section title={t("install.title")}>
        <InstallApp />
      </Section>

      <Section title={t("where.title")}>
        <p>
          <Trans
            t={t}
            i18nKey="where.yourMatrixIs"
            values={{ where: t(`where.${target ?? "local"}`, { ns: "common" }) }}
            components={{ file: <strong>{fileName ?? t("where.aFile")}</strong> }}
          />
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await flushSave();
              const result = target === "drive" ? await openDriveFile() : await openExistingFile();
              setBusy(false);
              if (result === "error") setError(useAppStore.getState().error);
            }}
          >
            {t("actions.openDifferentFile", { ns: "common" })}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await closeFile();
              setBusy(false);
              router.replace("/setup/");
            }}
          >
            {t("where.createNew")}
          </Button>
          {target === "drive" ? (
            <Button
              variant="outline"
              disabled={busy || !supportsLocalFile()}
              title={supportsLocalFile() ? undefined : t("where.needsChrome")}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const result = await moveToLocal();
                setBusy(false);
                if (result === "error") setError(useAppStore.getState().error);
              }}
            >
              <StorageIcon kind="local" data-icon="inline-start" className="size-4" /> {t("where.moveToLocal")}
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={busy || !driveConfigured()}
              title={driveConfigured() ? undefined : t("where.comingLater")}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const result = await moveToDrive({ kind: "pick" });
                setBusy(false);
                if (result === "error") setError(useAppStore.getState().error);
              }}
            >
              <StorageIcon kind="drive" data-icon="inline-start" className="size-4" /> {t("where.moveToDrive")}
            </Button>
          )}
          <Button variant="outline" disabled title={t("where.comingLater")}>
            <StorageIcon kind="dropbox" data-icon="inline-start" className="size-4" /> {t("where.moveToDropbox")}
          </Button>
          {target === "drive" ? (
            <Button variant="outline" disabled={busy} onClick={() => signOutOfDrive()}>
              {t("where.signOut")}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{whereNotes.join(" ")}</p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </Section>

      <Section title={t("name.title")}>
        <div className="flex max-w-sm flex-col gap-1.5">
          <Label htmlFor="matrix-name">{t("name.label")}</Label>
          <Input id="matrix-name" maxLength={200} {...matrixName} />
        </div>
      </Section>

      <Section title={t("export.title")}>
        <div className="flex flex-wrap items-start gap-2">
          <ExportMenu />
        </div>
        <p className="text-xs text-muted-foreground">{t("export.explain")}</p>
      </Section>

      <Section title={t("ai.title")}>
        <ConnectAiPanel />
      </Section>

      <Section title={t("privacy.title")}>
        <p>
          {t("privacy.text")}{" "}
          <Link href="/privacy/" className="underline underline-offset-4">
            {t("privacy.readMore")}
          </Link>
        </p>
      </Section>

      <Section title={t("build.title")}>
        <BuildInfo />
      </Section>

      <Section title={t("about.title")}>
        <p className="text-xs text-muted-foreground">
          {t("about.line", { app: APP_NAME, version: APP_VERSION })}{" "}
          <a href={MAINTAINER_URL} className="underline underline-offset-4" target="_blank" rel="noreferrer">
            {MAINTAINER_NAME}
          </a>
          {SOURCE_URL ? (
            <>
              {" · "}
              <a
                href={SOURCE_URL}
                className="inline-flex items-center gap-1 underline underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                <GitHubMark className="size-3.5" /> {t("about.source")}
              </a>
            </>
          ) : null}
          {ISSUES_URL ? (
            <>
              {" · "}
              <a href={ISSUES_URL} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                {t("about.report")}
              </a>
            </>
          ) : null}
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t pt-6 first-of-type:border-t-0 first-of-type:pt-0">
      <h2 className="font-heading text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
