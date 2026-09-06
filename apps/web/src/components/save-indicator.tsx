"use client";

import { cn } from "cn";
import { AlertCircleIcon, CheckIcon, LoaderCircleIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";

/**
 * The small "your edit is saved" readout shown beside editable content.
 * There is no Save button anywhere: every change is written to the file
 * about a second after it happens, and this is how the user can tell.
 */
export function SaveIndicator({ className }: { className?: string }) {
  const status = useAppStore((s) => s.status);
  const dirty = useAppStore((s) => s.dirty);
  const error = useAppStore((s) => s.error);
  const fileName = useAppStore((s) => s.fileName);

  let icon = <CheckIcon className="size-3.5" aria-hidden />;
  let text = `Saved to ${fileName ?? "your file"} on this computer`;
  let tone = "text-muted-foreground";
  if (status === "error") {
    icon = <AlertCircleIcon className="size-3.5" aria-hidden />;
    text = error ?? "Could not save";
    tone = "text-destructive";
  } else if (status === "saving") {
    icon = <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />;
    text = "Saving…";
  } else if (dirty) {
    icon = <LoaderCircleIcon className="size-3.5" aria-hidden />;
    text = "Saving shortly…";
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", tone, className)}
      role="status"
      aria-live="polite"
      title="Every change is saved to your file automatically. There is no Save button."
    >
      {icon}
      {text}
    </span>
  );
}
