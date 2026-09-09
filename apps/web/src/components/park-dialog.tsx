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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";

/**
 * Parking is the normal way to set an idea aside: it keeps every field and
 * needs a reason. Delete is here only as a secondary path for accidents.
 */
export function ParkDialog({
  open,
  onOpenChange,
  ideaName,
  onPark,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaName: string;
  onPark: (reason: string) => string | null;
  onDelete: () => void;
}) {
  const { t } = useTranslation("idea");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const close = () => {
    setReason("");
    setError(null);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
        else onOpenChange(o);
      }}
    >
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const err = onPark(reason.trim());
            if (err) setError(err);
            else close();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("parkDialog.title", { name: ideaName })}</DialogTitle>
            <DialogDescription>{t("parkDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="park-reason">{t("parkedBecause")}</Label>
            <Textarea
              id="park-reason"
              autoFocus
              rows={3}
              value={reason}
              maxLength={20000}
              placeholder={t("parkDialog.placeholder")}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="items-center sm:justify-between">
            {confirmDelete ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{t("parkDialog.deleteConfirm")}</span>
                <Button type="button" size="xs" variant="destructive" onClick={onDelete}>
                  {t("parkDialog.yesDelete")}
                </Button>
                <Button type="button" size="xs" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  {t("parkDialog.no")}
                </Button>
              </span>
            ) : (
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setConfirmDelete(true)}
              >
                {t("parkDialog.deleteInstead")}
              </button>
            )}
            <span className="flex gap-2">
              <Button type="button" variant="outline" onClick={close}>
                {t("actions.cancel", { ns: "common" })}
              </Button>
              <Button type="submit" disabled={reason.trim() === ""}>
                {t("parkDialog.park")}
              </Button>
            </span>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
