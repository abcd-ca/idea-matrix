"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { openDriveFile, openExistingFile, resume } from "@/lib/file-session";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "react-i18next";

/**
 * Gate for every screen that needs an open matrix. Sends first-time visitors
 * to setup, asks for the one click the browser needs on a return visit, and
 * otherwise renders the screen.
 */
export function RequireFile({ children }: { children: ReactNode }) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const hydrated = useAppStore((s) => s.hydrated);
  const status = useAppStore((s) => s.status);
  const doc = useAppStore((s) => s.doc);
  const fileName = useAppStore((s) => s.fileName);
  const target = useAppStore((s) => s.target);
  const error = useAppStore((s) => s.error);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && status === "no-file") router.replace("/setup/");
  }, [hydrated, status, router]);

  if (!hydrated || status === "loading") {
    return <Centered>{t("gate.opening")}</Centered>;
  }

  if (status === "no-file") {
    return <Centered>{t("gate.toSetup")}</Centered>;
  }

  if (status === "needs-permission") {
    return (
      <Centered>
        <div className="flex max-w-md flex-col gap-4">
          <h1 className="font-heading text-2xl font-semibold">
            {t("gate.resumeWith", { fileName: fileName ?? t("gate.yourMatrix") })}
          </h1>
          <p className="text-muted-foreground">{target === "drive" ? t("gate.resumeDrive") : t("gate.resumeLocal")}</p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await resume();
                setBusy(false);
              }}
            >
              {target === "drive" ? t("actions.signInWithGoogle") : t("actions.resume")}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await (target === "drive" ? openDriveFile() : openExistingFile());
                setBusy(false);
              }}
            >
              {t("actions.openDifferentFile")}
            </Button>
          </div>
        </div>
      </Centered>
    );
  }

  if (!doc) {
    return (
      <Centered>
        <div className="flex max-w-md flex-col gap-4">
          <h1 className="font-heading text-2xl font-semibold">{t("gate.couldNotOpen")}</h1>
          <p className="text-sm text-destructive">{error ?? t("gate.somethingWrong")}</p>
          <div className="flex gap-2">
            <Button onClick={() => void (target === "drive" ? openDriveFile() : openExistingFile())}>
              {t("actions.openDifferentFile")}
            </Button>
            <Button variant="outline" onClick={() => router.push("/setup/")}>
              {t("actions.startOver")}
            </Button>
          </div>
        </div>
      </Centered>
    );
  }

  return <>{children}</>;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-svh items-center justify-center p-6 text-muted-foreground">{children}</div>;
}
