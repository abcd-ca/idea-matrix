"use client";

import { band, type Stage } from "@idea-matrix/core";
import { cn } from "cn";
import { BAND_CLASSES } from "@/lib/bands";
import { useTranslation } from "react-i18next";

export function BandPill({
  value,
  showLabel = false,
  className,
  emptyText = "–",
}: {
  value: number | null;
  showLabel?: boolean;
  className?: string;
  emptyText?: string;
}) {
  const { t } = useTranslation("core");
  const b = band(value);
  if (b === null || value === null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>{emptyText}</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex min-w-10 items-center justify-center gap-1 rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums",
        BAND_CLASSES[b],
        className,
      )}
      title={t(`band.${b}.advice`)}
    >
      {value}
      {showLabel ? <span className="font-normal">· {t(`band.${b}.label`)}</span> : null}
    </span>
  );
}

/** Light and dark both covered, like the band classes in lib/bands.ts. */
const STAGE_CLASSES: Record<Stage, string> = {
  Backlog:
    "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700",
  Exploring: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800",
  "Talking to customers":
    "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-800",
  Validated:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  Building:
    "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800",
  Parked:
    "bg-neutral-100 text-neutral-500 border-neutral-200 line-through decoration-neutral-400 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 dark:decoration-neutral-500",
};

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const { t } = useTranslation("core");
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        STAGE_CLASSES[stage],
        className,
      )}
    >
      {t(`stageName.${stage}`)}
    </span>
  );
}
