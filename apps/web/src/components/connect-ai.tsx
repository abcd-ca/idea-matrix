"use client";

import { CheckIcon, CopyIcon, PlugIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MCP_DOCS_URL, RELEASES_URL } from "@/lib/config";
import { useAppStore } from "@/lib/store";
import { Trans, useTranslation } from "react-i18next";

const PACKAGE = "@idea-matrix/mcp";

/**
 * The "work on this from Claude" call to action: a short pitch, a link to
 * the details, and a button that opens the connection instructions. Nothing
 * here connects to anything; it tells the user how to run the MCP server on
 * their own computer.
 */
export function ConnectAiPanel({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  return (
    <div className={compact ? "flex flex-col gap-2 rounded-md border p-3 text-xs" : "flex flex-col gap-3"}>
      {compact ? <p className="font-medium">{t("connectAi.title")}</p> : null}
      <p className="text-muted-foreground">
        {t("connectAi.pitch")}{" "}
        <a href={MCP_DOCS_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          {t("connectAi.learnMore")}
        </a>
      </p>
      <Button variant="outline" size={compact ? "sm" : "default"} onClick={() => setOpen(true)}>
        <PlugIcon data-icon="inline-start" /> {t("connectAi.button")}
      </Button>
      <ConnectAiDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function ConnectAiDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("common");
  const fileName = useAppStore((s) => s.fileName) ?? "ideas.ideamatrix.json";
  const path = `/path/to/${fileName}`;
  const claudeCode = `claude mcp add idea-matrix -- npx -y ${PACKAGE} mcp --file ${path}`;
  const generic = `npx -y ${PACKAGE} mcp --file ${path}`;
  // The file name is user text, so it goes in as a component, never interpolated into the sentence.
  const file = <strong>{fileName}</strong>;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("connectAi.dialogTitle")}</DialogTitle>
          <DialogDescription>
            <Trans t={t} i18nKey="connectAi.description" components={{ file }} />
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-5 text-sm">
          <Step n={1} title={t("connectAi.claudeDesktop")}>
            <p>
              <Trans
                t={t}
                i18nKey="connectAi.desktopSteps"
                components={{
                  code: <code />,
                  a: (
                    <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4" />
                  ),
                  file,
                }}
              />
            </p>
          </Step>
          <Step n={2} title={t("connectAi.claudeCode")}>
            <p>{t("connectAi.codeSteps")}</p>
            <Command text={claudeCode} />
          </Step>
          <Step n={3} title={t("connectAi.otherClients")}>
            <p>{t("connectAi.otherSteps")}</p>
            <Command text={generic} />
          </Step>
          <p className="text-xs text-muted-foreground">
            <Trans t={t} i18nKey="connectAi.then" components={{ code: <code /> }} />{" "}
            <a href={MCP_DOCS_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {t("connectAi.fullInstructions")}
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-medium">
        <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs tabular-nums">
          {n}
        </span>
        {title}
      </p>
      <div className="flex flex-col gap-2 pl-7">{children}</div>
    </div>
  );
}

function Command({ text }: { text: string }) {
  const { t } = useTranslation("common");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the text is still selectable.
    }
  };
  return (
    <div className="flex items-start gap-2">
      <pre className="min-w-0 flex-1 rounded-md border bg-muted/40 px-3 py-2 text-xs leading-relaxed break-all whitespace-pre-wrap">
        <code>{text}</code>
      </pre>
      <Button type="button" size="sm" variant="outline" onClick={copy} aria-label={t("connectAi.copyCommand")}>
        {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
        {copied ? t("actions.copied") : t("actions.copy")}
      </Button>
    </div>
  );
}
