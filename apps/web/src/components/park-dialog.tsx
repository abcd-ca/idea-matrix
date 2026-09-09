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
            <DialogTitle>Park “{ideaName}”</DialogTitle>
            <DialogDescription>
              Parking keeps the idea, its scores and its evidence as history, and takes it out of the matrix. A sentence
              on why is required, so you remember later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="park-reason">Parked because</Label>
            <Textarea
              id="park-reason"
              autoFocus
              rows={3}
              value={reason}
              maxLength={20000}
              placeholder="e.g. Two conversations showed people are happy with what they use today."
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
                <span className="text-muted-foreground">Delete for good?</span>
                <Button type="button" size="xs" variant="destructive" onClick={onDelete}>
                  Yes, delete
                </Button>
                <Button type="button" size="xs" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  No
                </Button>
              </span>
            ) : (
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setConfirmDelete(true)}
              >
                Added by mistake? Delete it instead
              </button>
            )}
            <span className="flex gap-2">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={reason.trim() === ""}>
                Park idea
              </Button>
            </span>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
