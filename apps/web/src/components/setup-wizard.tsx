"use client";

import { FILE_EXTENSION, emptyDocument, sampleDocument } from "@idea-matrix/core";
import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { createDriveFile, createNewFile, openDriveFile, openExistingFile, writeDocumentNow } from "@/lib/file-session";
import { MOM_TEST_URL } from "@/lib/config";
import { overview } from "@/lib/overview";
import { driveConfigured } from "@/lib/storage/google-drive";
import { supportsLocalFile } from "@/lib/storage/local-file";
import type { TargetKind } from "@/lib/storage/target";
import { useAppStore } from "@/lib/store";
import { LanguageSelect } from "@/components/device-preferences";
import { Trans, useTranslation } from "react-i18next";

// Dropbox is a card on the screen but not a target yet.
type Where = TargetKind | "dropbox";
type Step = "welcome" | "where" | "file" | "start";

/**
 * First run. An overview of what this is, then three screens with one
 * decision each: where the file lives, which file, and (only after creating
 * a new one) what goes in it.
 */
export function SetupWizard() {
  const { t } = useTranslation("setup");
  const router = useRouter();
  const setTourPending = useAppStore((s) => s.setTourPending);
  const storeError = useAppStore((s) => s.error);
  const [step, setStep] = useState<Step>("welcome");
  const [where, setWhere] = useState<Where | null>(null);
  const [seed, setSeed] = useState<"example" | "empty">("example");
  const [driveName, setDriveName] = useState("ideas");
  const [driveFolder, setDriveFolder] = useState<"new" | "pick">("new");
  const [driveFolderName, setDriveFolderName] = useState("Idea Matrix");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // On a phone the picker closes with the page scrolled to the buttons, and
  // the message sits above the fold. Bring it into view when it appears.
  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) alertRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [error]);
  // null while rendering on the server, a real answer once in the browser.
  const supported = useSyncExternalStore(
    () => () => undefined,
    () => supportsLocalFile(),
    () => null,
  );

  const finish = () => {
    setTourPending(true);
    router.replace("/");
  };

  const o = overview(t);
  // "on this computer" / "in Google Drive", for the sentences about the file.
  const whereText = t(`where.${where === "drive" ? "drive" : "local"}`, { ns: "common" });

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-3 sm:p-4">
      <div className="flex w-full max-w-3xl flex-col gap-5 rounded-lg border bg-background p-5 shadow-sm sm:gap-6 sm:p-6 md:p-10">
        {step !== "welcome" ? <Progress step={step} /> : null}

        {step === "welcome" ? (
          <>
            <header className="flex flex-col gap-2">
              <LogoMark className="size-10" />
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("welcome")}</p>
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{o.title}</h1>
              <p className="max-w-prose text-muted-foreground">{o.intro}</p>
            </header>

            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {o.cards.map((card) => (
                <Overview key={card.title} title={card.title}>
                  {card.text}
                </Overview>
              ))}
            </div>

            <p className="max-w-prose text-sm text-muted-foreground">
              <Trans
                t={t}
                i18nKey="common:overview.momTestFrom"
                values={{ momTest: o.momTest }}
                components={{
                  a: (
                    <a href={MOM_TEST_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4" />
                  ),
                }}
              />{" "}
              {o.ai} {t("tourNote")}
            </p>

            <footer className="flex items-center justify-between gap-3">
              <LanguageSelect compact />
              <Button onClick={() => setStep("where")}>{t("getStarted")}</Button>
            </footer>
          </>
        ) : null}

        {step === "where" ? (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{t("where.title")}</h1>
              <p className="max-w-prose text-muted-foreground">{t("where.intro")}</p>
            </header>

            {supported === false ? (
              <Alert>
                <AlertTitle>{t("where.needsChromeTitle")}</AlertTitle>
                <AlertDescription>{t("where.needsChromeBody")}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label={t("where.groupLabel")}>
              <ChoiceCard
                selected={where === "local"}
                disabled={supported !== true}
                onSelect={() => setWhere("local")}
                title={t("where.local")}
                tag={t("where.localTag")}
              >
                {t("where.localText")}
              </ChoiceCard>
              <ChoiceCard
                selected={where === "drive"}
                disabled={!driveConfigured()}
                onSelect={() => setWhere("drive")}
                title={t("where.drive")}
                tag={driveConfigured() ? t("where.driveTag") : t("where.comingLater")}
              >
                {t("where.driveText")}
              </ChoiceCard>
              <ChoiceCard
                selected={false}
                disabled
                onSelect={() => undefined}
                title={t("where.dropbox")}
                tag={t("where.comingLater")}
              >
                {t("where.dropboxText")}
              </ChoiceCard>
            </div>

            <footer className="flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep("welcome")}>
                {t("actions.back", { ns: "common" })}
              </Button>
              <span className="flex items-center gap-3">
                {where === null ? (
                  <span className="hidden text-xs text-muted-foreground sm:inline">{t("where.chooseToContinue")}</span>
                ) : null}
                <Button disabled={where === null} onClick={() => setStep("file")}>
                  {t("actions.continue", { ns: "common" })}
                </Button>
              </span>
            </footer>
          </>
        ) : null}

        {step === "file" ? (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{t("file.title")}</h1>
              <p className="text-muted-foreground">
                <Trans t={t} i18nKey="file.keeping" values={{ where: whereText }} components={{ strong: <strong /> }} />{" "}
                <button type="button" className="underline underline-offset-4" onClick={() => setStep("where")}>
                  {t("file.change")}
                </button>
              </p>
            </header>

            {error || storeError ? (
              <p ref={alertRef} role="alert" className="text-sm text-destructive">
                {error ?? storeError}
              </p>
            ) : null}

            {where === "drive" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-3 rounded-md border p-5">
                  <h2 className="font-heading text-xl font-bold">{t("file.openTitle")}</h2>
                  <p className="flex-1 text-sm text-muted-foreground">{t("file.openDriveText")}</p>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      const result = await openDriveFile();
                      setBusy(false);
                      if (result === "opened") router.replace("/");
                      else if (result === "error") setError(useAppStore.getState().error);
                    }}
                  >
                    {t("file.openFromDrive")}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t("file.lastStep")}</p>
                </div>
                <div className="flex flex-col gap-3 rounded-md border p-5">
                  <h2 className="font-heading text-xl font-bold">{t("file.createTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("file.createDriveText")}</p>
                  <div className="flex flex-col gap-2 text-sm" role="radiogroup" aria-label={t("file.folderGroup")}>
                    <label className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="drive-folder"
                        className="mt-1"
                        checked={driveFolder === "new"}
                        onChange={() => setDriveFolder("new")}
                      />
                      <span className="flex flex-1 flex-col gap-1">
                        <span>{t("file.newFolder")}</span>
                        <input
                          className="w-full min-w-0 rounded-md border bg-background px-2 py-1"
                          value={driveFolderName}
                          maxLength={100}
                          disabled={driveFolder !== "new"}
                          onChange={(e) => setDriveFolderName(e.target.value)}
                          aria-label={t("file.newFolderName")}
                        />
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="drive-folder"
                        checked={driveFolder === "pick"}
                        onChange={() => setDriveFolder("pick")}
                      />
                      <span>{t("file.pickFolder")}</span>
                    </label>
                  </div>
                  <label className="flex flex-1 flex-col gap-1.5 text-sm">
                    <span className="text-muted-foreground">{t("file.fileName")}</span>
                    <span className="flex items-center gap-1">
                      <input
                        className="w-full min-w-0 rounded-md border bg-background px-2 py-1"
                        value={driveName}
                        maxLength={100}
                        onChange={(e) => setDriveName(e.target.value)}
                        aria-label={t("file.fileNameLabel")}
                      />
                      <span className="shrink-0 text-muted-foreground">{FILE_EXTENSION}</span>
                    </span>
                  </label>
                  <Button
                    disabled={
                      busy || driveName.trim() === "" || (driveFolder === "new" && driveFolderName.trim() === "")
                    }
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      const result = await createDriveFile(
                        driveName,
                        driveFolder === "new" ? { kind: "new", name: driveFolderName } : { kind: "pick" },
                      );
                      setBusy(false);
                      if (result === "created") setStep("start");
                      else if (result === "error") setError(useAppStore.getState().error);
                    }}
                  >
                    {t("file.createInDrive")}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t("file.oneMoreStep")}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-3 rounded-md border p-5">
                  <h2 className="font-heading text-xl font-bold">{t("file.openTitle")}</h2>
                  <p className="flex-1 text-sm text-muted-foreground">{t("file.openLocalText")}</p>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      const result = await openExistingFile();
                      setBusy(false);
                      if (result === "opened") router.replace("/");
                      else if (result === "error") setError(useAppStore.getState().error);
                    }}
                  >
                    {t("file.openFile")}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t("file.lastStep")}</p>
                </div>
                <div className="flex flex-col gap-3 rounded-md border p-5">
                  <h2 className="font-heading text-xl font-bold">{t("file.createTitle")}</h2>
                  <p className="flex-1 text-sm text-muted-foreground">{t("file.createLocalText")}</p>
                  <Button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      const result = await createNewFile();
                      setBusy(false);
                      if (result === "created") setStep("start");
                      else if (result === "error") setError(useAppStore.getState().error);
                    }}
                  >
                    {t("file.createFile")}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t("file.oneMoreStep")}</p>
                </div>
              </div>
            )}

            <footer className="flex items-center justify-start">
              <Button variant="ghost" onClick={() => setStep("where")} disabled={busy}>
                {t("actions.back", { ns: "common" })}
              </Button>
            </footer>
          </>
        ) : null}

        {step === "start" ? (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{t("start.title")}</h1>
              <p className="text-muted-foreground">
                <Trans
                  t={t}
                  i18nKey="start.saved"
                  values={{ where: whereText }}
                  components={{ file: <strong>{useAppStore.getState().fileName ?? t("start.yourFile")}</strong> }}
                />
              </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label={t("start.groupLabel")}>
              <ChoiceCard selected={seed === "example"} onSelect={() => setSeed("example")} title={t("start.example")}>
                {t("start.exampleText")}
              </ChoiceCard>
              <ChoiceCard selected={seed === "empty"} onSelect={() => setSeed("empty")} title={t("start.empty")}>
                {t("start.emptyText")}
              </ChoiceCard>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <footer className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep("file")} disabled={busy}>
                {t("actions.back", { ns: "common" })}
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await writeDocumentNow(
                      seed === "example" ? sampleDocument() : emptyDocument(t("start.defaultName")),
                    );
                    finish();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : t("errors.couldNotWrite", { ns: "common" }));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("start.open")}
              </Button>
            </footer>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  const { t } = useTranslation("setup");
  const items: { key: Step; label: string }[] = [
    { key: "where", label: t("progress.where") },
    { key: "file", label: step === "start" ? t("progress.newFile") : t("progress.whichFile") },
  ];
  if (step === "start") items.push({ key: "start", label: t("progress.startWith") });
  const order: Step[] = ["where", "file", "start"];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {items.map((item) => {
        const done = order.indexOf(item.key) < order.indexOf(step);
        const current = item.key === step;
        return (
          <li
            key={item.key}
            className={cn(
              "rounded-md border px-2 py-0.5",
              current && "border-primary bg-primary text-primary-foreground",
              done && "bg-muted text-muted-foreground",
            )}
            aria-current={current ? "step" : undefined}
          >
            {item.label}
            {done ? " ✓" : ""}
          </li>
        );
      })}
      {step !== "start" ? (
        <li className="rounded-md border border-dashed px-2 py-0.5 text-muted-foreground">{t("progress.oneMore")}</li>
      ) : null}
    </ol>
  );
}

function Overview({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border p-4">
      <h2 className="font-heading text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function ChoiceCard({
  selected,
  disabled = false,
  onSelect,
  title,
  tag,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-2 rounded-md border p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
    >
      <span className="font-heading text-lg font-bold">{title}</span>
      <span className="flex-1 text-sm text-muted-foreground">{children}</span>
      {tag ? <span className="self-start rounded-full border px-2 py-0.5 text-xs">{tag}</span> : null}
    </button>
  );
}
