"use client";

import { RefreshCwIcon } from "lucide-react";
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
    // Inverted from the page (dark on light, light on dark) so it reads as
    // something new, and it slides up so the eye goes to it.
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg bg-primary p-3 text-sm text-primary-foreground shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <RefreshCwIcon className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 font-medium">{t("update.ready", { app: APP_NAME })}</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          onClick={() => setDismissed(true)}
        >
          {t("update.later")}
        </Button>
        <Button
          size="sm"
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
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
