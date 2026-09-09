"use client";

import { LogoMark } from "@/components/logo-mark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MOM_TEST_URL } from "@/lib/config";
import { createDriveFile, createNewFile, openDriveFile, openExistingFile, writeDocumentNow } from "@/lib/file-session";
import { MOM_TEST_SUMMARY, OVERVIEW_AI, OVERVIEW_CARDS, OVERVIEW_INTRO, OVERVIEW_TITLE } from "@/lib/overview";
import { driveConfigured } from "@/lib/storage/google-drive";
import { supportsLocalFile } from "@/lib/storage/local-file";
import { describeWhere, type TargetKind } from "@/lib/storage/target";
import { useAppStore } from "@/lib/store";
import { emptyDocument, sampleDocument } from "@idea-matrix/core";
import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

// Dropbox is a card on the screen but not a target yet.
type Where = TargetKind | "dropbox";
type Step = "welcome" | "where" | "file" | "start";

/**
 * First run. An overview of what this is, then three screens with one
 * decision each: where the file lives, which file, and (only after creating
 * a new one) what goes in it.
 */
export function SetupWizard() {
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

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-3 sm:p-4">
      <div className="flex w-full max-w-3xl flex-col gap-5 rounded-lg border bg-background p-5 shadow-sm sm:gap-6 sm:p-6 md:p-10">
        {step !== "welcome" ? <Progress step={step} /> : null}

        {step === "welcome" ? (
          <>
            <header className="flex flex-col gap-2">
              <LogoMark className="size-10" />
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Welcome</p>
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{OVERVIEW_TITLE}</h1>
              <p className="max-w-prose text-muted-foreground">{OVERVIEW_INTRO}</p>
            </header>

            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {OVERVIEW_CARDS.map((card) => (
                <Overview key={card.title} title={card.title}>
                  {card.text}
                </Overview>
              ))}
            </div>

            <p className="max-w-prose text-sm text-muted-foreground">
              The rules for what counts as evidence come from{" "}
              <a href={MOM_TEST_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                The Mom Test
              </a>
              : {MOM_TEST_SUMMARY} {OVERVIEW_AI} A short tour explains the screen once your matrix is open.
            </p>

            <footer className="flex items-center justify-end">
              <Button onClick={() => setStep("where")}>Get started</Button>
            </footer>
          </>
        ) : null}

        {step === "where" ? (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Where do you want to keep your ideas?</h1>
              <p className="max-w-prose text-muted-foreground">
                Idea Matrix has no accounts and no server of its own. Your matrix is one file, and you choose where it
                lives. You can open a different file later from Settings.
              </p>
            </header>

            {supported === false ? (
              <Alert>
                <AlertTitle>“This computer” needs Chrome or Edge</AlertTitle>
                <AlertDescription>
                  Your browser can’t save changes back to a file on disk, so this option is off. Open this page in
                  Chrome or Edge to use it, or keep your ideas in Google Drive, which works in any browser.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Where to keep your ideas">
              <ChoiceCard
                selected={where === "local"}
                disabled={supported !== true}
                onSelect={() => setWhere("local")}
                title="This computer"
                tag="Chrome or Edge"
              >
                A file you can see, back up, or keep in your iCloud, Dropbox or Drive folder.
              </ChoiceCard>
              <ChoiceCard
                selected={where === "drive"}
                disabled={!driveConfigured()}
                onSelect={() => setWhere("drive")}
                title="Google Drive"
                tag={driveConfigured() ? "Any browser" : "coming later"}
              >
                Any browser, including your phone. The app only sees the one file it creates or you open.
              </ChoiceCard>
              <ChoiceCard selected={false} disabled onSelect={() => undefined} title="Dropbox" tag="coming later">
                A visible Apps/Idea Matrix folder in your Dropbox.
              </ChoiceCard>
            </div>

            <footer className="flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep("welcome")}>
                Back
              </Button>
              <span className="flex items-center gap-3">
                {where === null ? (
                  <span className="hidden text-xs text-muted-foreground sm:inline">Choose a location to continue</span>
                ) : null}
                <Button disabled={where === null} onClick={() => setStep("file")}>
                  Continue
                </Button>
              </span>
            </footer>
          </>
        ) : null}

        {step === "file" ? (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
                Open a matrix you already have, or create a new one?
              </h1>
              <p className="text-muted-foreground">
                Keeping your ideas <strong>{describeWhere(where === "dropbox" ? null : where)}</strong>.
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
                  <h2 className="font-heading text-xl font-bold">Open an existing matrix</h2>
                  <p className="flex-1 text-sm text-muted-foreground">
                    You already have a matrix file in your Drive, maybe from another computer. Google asks you to sign
                    in, then a picker shows your JSON files. Picking one is what gives the app access to it, and to
                    nothing else in your Drive.
                  </p>
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
                    Open from Drive…
                  </Button>
                  <p className="text-xs text-muted-foreground">This is the last step: your matrix opens as it is.</p>
                </div>
                <div className="flex flex-col gap-3 rounded-md border p-5">
                  <h2 className="font-heading text-xl font-bold">Create a new matrix</h2>
                  <p className="text-sm text-muted-foreground">Google asks you to sign in, then the file is created:</p>
                  <div className="flex flex-col gap-2 text-sm" role="radiogroup" aria-label="Which folder">
                    <label className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="drive-folder"
                        className="mt-1"
                        checked={driveFolder === "new"}
                        onChange={() => setDriveFolder("new")}
                      />
                      <span className="flex flex-1 flex-col gap-1">
                        <span>In a new folder at the top of My Drive, called</span>
                        <input
                          className="w-full min-w-0 rounded-md border bg-background px-2 py-1"
                          value={driveFolderName}
                          maxLength={100}
                          disabled={driveFolder !== "new"}
                          onChange={(e) => setDriveFolderName(e.target.value)}
                          aria-label="New folder name"
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
                      <span>In a folder I choose (a picker opens)</span>
                    </label>
                  </div>
                  <label className="flex flex-1 flex-col gap-1.5 text-sm">
                    <span className="text-muted-foreground">File name</span>
                    <span className="flex items-center gap-1">
                      <input
                        className="w-full min-w-0 rounded-md border bg-background px-2 py-1"
                        value={driveName}
                        maxLength={100}
                        onChange={(e) => setDriveName(e.target.value)}
                        aria-label="File name, without the extension"
                        // A file name, not a sentence: no capital, no autocorrect on a phone keyboard.
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <span className="shrink-0 text-muted-foreground">.ideamatrix.json</span>
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
                    Create in Drive…
                  </Button>
                  <p className="text-xs text-muted-foreground">One more step: what goes in the new file.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-3 rounded-md border p-5">
                  <h2 className="font-heading text-xl font-bold">Open an existing matrix</h2>
                  <p className="flex-1 text-sm text-muted-foreground">
                    You already have a matrix file, maybe from another computer or a backup. The picker shows JSON
                    files, and the app checks that the one you choose really is a matrix before loading it.
                  </p>
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
                    Open a file…
                  </Button>
                  <p className="text-xs text-muted-foreground">This is the last step: your matrix opens as it is.</p>
                </div>
                <div className="flex flex-col gap-3 rounded-md border p-5">
                  <h2 className="font-heading text-xl font-bold">Create a new matrix</h2>
                  <p className="flex-1 text-sm text-muted-foreground">
                    A save dialog opens so you pick the folder and name. The suggested name is ideas.ideamatrix.json.
                  </p>
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
                    Create a file…
                  </Button>
                  <p className="text-xs text-muted-foreground">One more step: what goes in the new file.</p>
                </div>
              </div>
            )}

            <footer className="flex items-center justify-start">
              {/* Never disabled: going back while a picker is open is harmless, and a picker that never answers must not trap the person here. */}
              <Button variant="ghost" onClick={() => setStep("where")}>
                Back
              </Button>
            </footer>
          </>
        ) : null}

        {step === "start" ? (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">What should go in it?</h1>
              <p className="text-muted-foreground">
                <strong>{useAppStore.getState().fileName ?? "Your file"}</strong> is saved{" "}
                {describeWhere(where === "dropbox" ? null : where)}. It is empty until you choose what goes in it.
              </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="What to start with">
              <ChoiceCard selected={seed === "example"} onSelect={() => setSeed("example")} title="An example matrix">
                Nine fictional ideas, already scored, so you can see what a filled-in matrix looks like before adding
                your own. Park them whenever you like.
              </ChoiceCard>
              <ChoiceCard selected={seed === "empty"} onSelect={() => setSeed("empty")} title="Nothing yet">
                Just the columns. You’ll add your first idea from the matrix, after a short tour.
              </ChoiceCard>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <footer className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep("file")} disabled={busy}>
                Back
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await writeDocumentNow(seed === "example" ? sampleDocument() : emptyDocument("My ideas"));
                    finish();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not write the file.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Open my matrix
              </Button>
            </footer>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  const items: { key: Step; label: string }[] = [
    { key: "where", label: "1 Where" },
    { key: "file", label: step === "start" ? "2 New file" : "2 Which file" },
  ];
  if (step === "start") items.push({ key: "start", label: "3 Start with" });
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
        <li className="rounded-md border border-dashed px-2 py-0.5 text-muted-foreground">
          + one more step if you create a new file
        </li>
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
