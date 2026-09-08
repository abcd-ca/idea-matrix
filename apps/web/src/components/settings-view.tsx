"use client";

import { renameDocument } from "@idea-matrix/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BuildInfo } from "@/components/build-info";
import { ConnectAiPanel } from "@/components/connect-ai";
import { ExportMenu } from "@/components/export-menu";
import { GitHubMark } from "@/components/github-mark";
import { ImportCsv } from "@/components/import-csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME, APP_VERSION, ISSUES_URL, MAINTAINER_NAME, MAINTAINER_URL, SOURCE_URL } from "@/lib/config";
import { closeFile, flushSave, openExistingFile } from "@/lib/file-session";
import { useAppStore } from "@/lib/store";

export function SettingsView() {
  const router = useRouter();
  const doc = useAppStore((s) => s.doc);
  const fileName = useAppStore((s) => s.fileName);
  const mutate = useAppStore((s) => s.mutate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!doc) return null;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="font-heading text-3xl font-bold">Settings</h1>

      <Section title="Where your ideas live">
        <p>
          Your matrix is <strong>{fileName ?? "a file"}</strong> on this computer.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await flushSave();
              const result = await openExistingFile();
              setBusy(false);
              if (result === "error") setError(useAppStore.getState().error);
            }}
          >
            Open a different file…
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
            Create a new file…
          </Button>
          <Button variant="outline" disabled title="Coming in a later version">
            Move to Google Drive…
          </Button>
          <Button variant="outline" disabled title="Coming in a later version">
            Move to Dropbox…
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Opening a different file switches to it; the current file stays where it is with everything saved.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </Section>

      <Section title="Matrix name">
        <div className="flex max-w-sm flex-col gap-1.5">
          <Label htmlFor="matrix-name">Shown at the top of the matrix</Label>
          <Input
            id="matrix-name"
            value={doc.name}
            maxLength={200}
            onChange={(e) => setError(mutate((d) => renameDocument(d, e.target.value)))}
          />
        </div>
      </Section>

      <Section title="Export and import">
        <div className="flex flex-wrap items-start gap-2">
          <ExportMenu />
          <ImportCsv />
        </div>
        <p className="text-xs text-muted-foreground">
          Export downloads a file in the chosen format. Import CSV adds rows from a spreadsheet, such as an export
          from one you used before. Imported ideas start at Confidence 2 at most, because a spreadsheet carries no evidence log.
        </p>
      </Section>

      <Section title="AI assistant">
        <ConnectAiPanel />
      </Section>

      <Section title="Privacy and trust">
        <p>
          Nothing leaves your machine except to the storage you chose. You can check that yourself: open your browser’s
          developer tools, watch the Network tab while you edit, and see that the only traffic is the page itself.{" "}
          <Link href="/privacy/" className="underline underline-offset-4">
            Read the full page
          </Link>
        </p>
      </Section>

      <Section title="This build">
        <BuildInfo />
      </Section>

      <Section title="About">
        <p className="text-xs text-muted-foreground">
          {APP_NAME} {APP_VERSION} · open source · no telemetry · maintained by{" "}
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
                <GitHubMark className="size-3.5" /> source on GitHub
              </a>
            </>
          ) : null}
          {ISSUES_URL ? (
            <>
              {" · "}
              <a href={ISSUES_URL} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                report a problem
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
