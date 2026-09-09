"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { formatTime } from "@/lib/format";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

function ago(ts: number, now: number, t: TFunction, language: string): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return t("status.justNow");
  if (s < 60) return t("status.secondsAgo", { count: s });
  const m = Math.round(s / 60);
  if (m < 60) return t("status.minutesAgo", { count: m });
  return formatTime(ts, language);
}

/** The small "where is my file and is it saved" readout. */
export function StatusLine({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation("common");
  const fileName = useAppStore((s) => s.fileName);
  const target = useAppStore((s) => s.target);
  const status = useAppStore((s) => s.status);
  const dirty = useAppStore((s) => s.dirty);
  const lastSavedAt = useAppStore((s) => s.lastSavedAt);
  const externalChangeAt = useAppStore((s) => s.externalChangeAt);
  const error = useAppStore((s) => s.error);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);

  let text: string;
  let tone = "text-muted-foreground";
  if (status === "error") {
    text = error ?? t("status.couldNotSave");
    tone = "text-destructive";
  } else if (status === "saving") text = t("status.saving");
  else if (dirty) text = t("status.unsaved");
  else if (lastSavedAt) text = t("status.saved", { when: ago(lastSavedAt, now, t, i18n.language) });
  else if (status === "needs-permission") text = t("status.needsPermission");
  else text = t("status.upToDate");

  // One quiet line once the watcher has seen a change this tab did not make.
  const elsewhere = externalChangeAt
    ? t("status.alsoOpen", { when: ago(externalChangeAt, now, t, i18n.language) })
    : null;

  const name = fileName ?? t("status.noFile");
  if (compact) {
    return (
      <div className="text-xs">
        <p className={tone}>{t("status.compact", { fileName: name, text })}</p>
        {elsewhere ? <p className="text-muted-foreground">{elsewhere}</p> : null}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-dashed p-3 text-xs">
      <p className="truncate font-medium" title={fileName ?? undefined}>
        {name}
      </p>
      <p className="text-muted-foreground">{t("status.storedWhere", { where: t(`where.${target ?? "local"}`) })}</p>
      <p className={tone} aria-live="polite">
        {text}
      </p>
      {elsewhere ? <p className="text-muted-foreground">{elsewhere}</p> : null}
    </div>
  );
}
