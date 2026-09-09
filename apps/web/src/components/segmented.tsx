"use client";

import { cn } from "cn";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/** A 1 to 5 (or 0 to 5) segmented control with the meaning of the pick beneath it. */
export function Segmented({
  value,
  onChange,
  onClear,
  label,
  min = 1,
  max = 5,
  meanings,
  disabledReason,
  hint,
  id,
}: {
  value: number | null;
  onChange: (next: number) => void;
  /** When given, tapping the selected value clears it (back to unscored). */
  onClear?: () => void;
  label: string;
  min?: 0 | 1;
  max?: number;
  meanings: Record<number, string>;
  /** Shown as a tooltip on the values above `max`. */
  disabledReason?: string;
  hint?: string;
  id: string;
}) {
  const { t } = useTranslation("idea");
  const [hovered, setHovered] = useState<number | null>(null);
  const options: number[] = [];
  for (let v = min; v <= 5; v++) options.push(v);
  // The caption follows the pointer, so every value can be read before picking it.
  const shown = hovered ?? value;
  const meaning = (v: number) => t("segmented.meaning", { value: v, meaning: meanings[v] ?? "" });
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span id={`${id}-label`} className="text-sm font-medium">
          {label}
        </span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex" onMouseLeave={() => setHovered(null)}>
        {options.map((v) => {
          const selected = value === v;
          const disabled = v > max;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              title={disabled ? disabledReason : meaning(v)}
              onClick={() => (selected && onClear ? onClear() : onChange(v))}
              onMouseEnter={() => setHovered(disabled ? null : v)}
              onFocus={() => setHovered(disabled ? null : v)}
              onBlur={() => setHovered(null)}
              className={cn(
                "-ml-px h-10 min-w-11 flex-1 border text-sm tabular-nums first:ml-0 first:rounded-l-md last:rounded-r-md focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                selected ? "z-10 border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                disabled && "cursor-not-allowed opacity-40 hover:bg-background",
              )}
            >
              {v}
            </button>
          );
        })}
      </div>
      <p className="min-h-4 text-xs text-muted-foreground">
        {shown === null ? t("segmented.notScored") : meaning(shown)}
      </p>
    </div>
  );
}
