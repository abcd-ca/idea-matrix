"use client";

import { addEvidence, removeEvidence, CONFIDENCE_GATE_SUMMARY, CONFIDENCE_INFO, type Idea } from "@idea-matrix/core";
import { PlusIcon, Trash2Icon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store";

function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * The receipts behind Confidence: who you talked to, what they currently do
 * about the problem, and what they committed to. Plain structure, no model.
 */
export function EvidenceLog({ idea, onError }: { idea: Idea; onError: (message: string | null) => void }) {
  const mutate = useAppStore((s) => s.mutate);
  const [open, setOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4" data-tour="evidence">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Evidence log <span className="font-normal text-muted-foreground">· {idea.evidence.length}</span>
        </p>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <PlusIcon data-icon="inline-start" /> Add
        </Button>
      </div>

      {idea.evidence.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No conversations recorded yet. Confidence stays at 1 or 2 until one is.
        </p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {idea.evidence.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  {e.who} <span className="font-normal text-muted-foreground">· {e.date}</span>
                </p>
                {confirmRemove === e.id ? (
                  <span className="flex items-center gap-1 text-xs">
                    <Button
                      size="xs"
                      variant="destructive"
                      onClick={() => {
                        onError(mutate((d) => removeEvidence(d, idea.id, e.id)));
                        setConfirmRemove(null);
                      }}
                    >
                      Remove
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setConfirmRemove(null)}>
                      Keep
                    </Button>
                  </span>
                ) : (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Remove entry"
                    onClick={() => setConfirmRemove(e.id)}
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </div>
              {e.whatTheyDoNow.trim() ? (
                <p>{e.whatTheyDoNow}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No current behaviour recorded, so this entry does not count toward Confidence.
                </p>
              )}
              {e.commitment.trim() ? (
                <p className="text-xs">
                  <span className="font-medium">Commitment:</span> {e.commitment}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-dashed pt-2 text-xs text-muted-foreground">{CONFIDENCE_GATE_SUMMARY}</p>

      <AddEvidenceDialog
        open={open}
        onOpenChange={setOpen}
        onAdd={(input) => {
          const err = mutate((d) => addEvidence(d, idea.id, input).doc);
          onError(err);
          return err;
        }}
      />
    </div>
  );
}

function AddEvidenceDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: { date: string; who: string; whatTheyDoNow: string; commitment: string }) => string | null;
}) {
  const [date, setDate] = useState(today);
  const [who, setWho] = useState("");
  const [whatTheyDoNow, setWhat] = useState("");
  const [commitment, setCommitment] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = () => {
    setDate(today());
    setWho("");
    setWhat("");
    setCommitment("");
    setLocalError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const err = onAdd({
              date,
              who: who.trim(),
              whatTheyDoNow: whatTheyDoNow.trim(),
              commitment: commitment.trim(),
            });
            if (err) {
              setLocalError(err);
              return;
            }
            reset();
            onOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a conversation</DialogTitle>
            <DialogDescription>{CONFIDENCE_INFO.rules.join(" ")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-date">Date</Label>
              <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-who">Who</Label>
              <Input
                id="ev-who"
                value={who}
                maxLength={200}
                placeholder="e.g. Strata council chair"
                onChange={(e) => setWho(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-what">What do they currently do about this problem?</Label>
            <Textarea
              id="ev-what"
              rows={3}
              value={whatTheyDoNow}
              maxLength={20000}
              placeholder="Past and present only. What they said they would do does not count."
              onChange={(e) => setWhat(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-commit">What did they commit to, if anything?</Label>
            <Textarea
              id="ev-commit"
              rows={2}
              value={commitment}
              maxLength={20000}
              placeholder="Money, an introduction, a pilot, their time. Leave empty if nothing."
              onChange={(e) => setCommitment(e.target.value)}
            />
          </div>
          {localError ? (
            <p role="alert" className="text-sm text-destructive">
              {localError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={who.trim() === ""}>
              Add conversation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
