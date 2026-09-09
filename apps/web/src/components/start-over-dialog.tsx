"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { startOver } from "@/lib/file-session";
import { useTranslation } from "react-i18next";

/**
 * "Start over on this device": the button in Settings and the confirmation
 * behind it. Nothing of the person's is destroyed, so the confirm button is
 * an ordinary primary button, not a destructive one; the matrix file stays
 * where it is and only what this browser remembers goes.
 */
export function StartOver() {
  const { t } = useTranslation("settings");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="outline" className="w-fit" onClick={() => setOpen(true)}>
        {t("startOver.button")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("startOver.note")}</p>
      <Dialog open={open} onOpenChange={(o) => (busy ? undefined : setOpen(o))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("startOver.title")}</DialogTitle>
            <DialogDescription>{t("startOver.body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              {t("actions.cancel", { ns: "common" })}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await startOver();
              }}
            >
              {t("actions.startOver", { ns: "common" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
