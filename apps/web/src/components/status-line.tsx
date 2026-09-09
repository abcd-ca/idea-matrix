"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { describeWhere } from "@/lib/storage/target";
import { useAppStore } from "@/lib/store";

function ago(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** The small "where is my file and is it saved" readout. */
export function StatusLine({ compact = false }: { compact?: boolean }) {
  const fileName = useAppStore((s) => s.fileName);
  const target = useAppStore((s) => s.target);
  const status = useAppStore((s) => s.status);
  const dirty = useAppStore((s) => s.dirty);
  const lastSavedAt = useAppStore((s) => s.lastSavedAt);
  const error = useAppStore((s) => s.error);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  let text: string;
  let tone = "text-muted-foreground";
  if (status === "error") {
    text = error ?? "Could not save";
    tone = "text-destructive";
  } else if (status === "saving") text = "Saving…";
  else if (dirty) text = "Unsaved changes";
  else if (lastSavedAt) text = `Saved ${ago(lastSavedAt, now)}`;
  else if (status === "needs-permission") text = "Needs permission";
  else text = "Up to date";

  if (compact) {
    return (
      <p className={cn("text-xs", tone)}>
        {fileName ?? "No file"} · {text}
      </p>
    );
  }
  return (
    <div className="rounded-md border border-dashed p-3 text-xs">
      <p className="truncate font-medium" title={fileName ?? undefined}>
        {fileName ?? "No file"}
      </p>
      <p className="text-muted-foreground">Data is stored {describeWhere(target)}</p>
      <p className={tone} aria-live="polite">
        {text}
      </p>
    </div>
  );
}
