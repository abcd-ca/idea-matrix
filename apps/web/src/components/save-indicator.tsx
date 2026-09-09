"use client";

import { cn } from "cn";
import { AlertCircleIcon, CheckIcon, LoaderCircleIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "react-i18next";

/**
 * The small "your edit is saved" readout shown beside editable content.
 * There is no Save button anywhere: every change is written to the file
 * about a second after it happens, and this is how the user can tell.
 */
export function SaveIndicator({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  const status = useAppStore((s) => s.status);
  const dirty = useAppStore((s) => s.dirty);
  const error = useAppStore((s) => s.error);
  const fileName = useAppStore((s) => s.fileName);
  const target = useAppStore((s) => s.target);

  let icon = <CheckIcon className="size-3.5" aria-hidden />;
  let text = t("status.savedTo", {
    fileName: fileName ?? t("status.yourFile"),
    where: t(`where.${target ?? "local"}`),
  });
  let tone = "text-muted-foreground";
  if (status === "error") {
    icon = <AlertCircleIcon className="size-3.5" aria-hidden />;
    text = error ?? t("status.couldNotSave");
    tone = "text-destructive";
  } else if (status === "saving" || dirty) {
    icon = <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />;
    text = t("status.saving");
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", tone, className)}
      role="status"
      aria-live="polite"
      title={t("status.autosave")}
    >
      {icon}
      {text}
    </span>
  );
}
