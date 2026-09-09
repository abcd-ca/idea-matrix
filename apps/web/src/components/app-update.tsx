"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { applyUpdate, startUpdateWatch, useUpdateReady } from "@/lib/app-update";
import { APP_NAME } from "@/lib/config";
import { startInstallWatch } from "@/lib/install";

/**
 * Mounted once in the layout. Registers the service worker, starts listening
 * for the browser's install offer, and shows the one banner the worker ever
 * needs: a newer build is ready, reload to use it.
 */
export function AppUpdate() {
  const { t } = useTranslation("common");
  const ready = useUpdateReady();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stopUpdates = startUpdateWatch();
    const stopInstall = startInstallWatch();
    return () => {
      stopUpdates();
      stopInstall();
    };
  }, []);

  if (!ready || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm shadow-lg"
    >
      <p>{t("update.ready", { app: APP_NAME })}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
          {t("update.later")}
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await applyUpdate();
          }}
        >
          {t("update.reload")}
        </Button>
      </div>
    </div>
  );
}
