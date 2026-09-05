"use client";

import { cn } from "cn";

/** A 1 to 5 (or 0 to 5) segmented control with the meaning of the pick beneath it. */
export function Segmented({
  value,
  onChange,
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
  label: string;
  min?: 0 | 1;
  max?: number;
  meanings: Record<number, string>;
  /** Shown as a tooltip on the values above `max`. */
  disabledReason?: string;
  hint?: string;
  id: string;
}) {
  const options: number[] = [];
  for (let v = min; v <= 5; v++) options.push(v);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span id={`${id}-label`} className="text-sm font-medium">
          {label}
        </span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex">
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
              title={disabled ? disabledReason : meanings[v]}
              onClick={() => onChange(v)}
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
        {value === null ? "Not scored yet" : `${value} = ${meanings[value] ?? ""}`}
      </p>
    </div>
  );
}
