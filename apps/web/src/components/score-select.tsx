"use client";

import { cn } from "cn";

/**
 * A compact native select for a 1 to 5 score. Native so it is fast in a
 * table, keyboard-friendly and works on phones. Values above `max` are
 * disabled, which is how the Confidence gate shows up in the matrix.
 */
export function ScoreSelect({
  value,
  onChange,
  label,
  min = 1,
  max = 5,
  meanings,
  className,
  allowEmpty = true,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  label: string;
  min?: 0 | 1;
  max?: number;
  meanings?: Record<number, string>;
  className?: string;
  allowEmpty?: boolean;
}) {
  const options: number[] = [];
  for (let v = min; v <= 5; v++) options.push(v);
  return (
    <select
      aria-label={label}
      value={value === null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "h-8 w-12 rounded-md border bg-background px-1 text-center text-sm tabular-nums focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        value === null && "text-muted-foreground",
        className,
      )}
    >
      {allowEmpty || value === null ? <option value="">–</option> : null}
      {options.map((v) => (
        <option key={v} value={v} disabled={v > max} title={meanings?.[v]}>
          {v}
        </option>
      ))}
    </select>
  );
}
