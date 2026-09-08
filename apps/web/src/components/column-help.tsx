"use client";

import {
  BANDS,
  CONFIDENCE_GATE_SUMMARY,
  CONFIDENCE_INFO,
  CRITERION_INFO,
  CRITERIA,
  FORMULA_INFO,
  STAGE_INFO,
  STAGES,
  type Band,
  type Criterion,
} from "@idea-matrix/core";
import { cn } from "cn";
import { InfoIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BAND_CLASSES } from "@/lib/bands";

/** The coloured band key, reused by the tour and the column help. */
export function BandChips() {
  return (
    <ul className="flex flex-col gap-1">
      {(Object.keys(BANDS) as Band[]).map((key) => {
        const b = BANDS[key];
        return (
          <li key={key} className="flex items-center gap-2">
            <span className={cn("inline-block min-w-9 rounded-md px-2 py-0.5 text-center font-semibold tabular-nums", BAND_CLASSES[key])}>
              {b.min}
            </span>
            <span>
              <b>
                {b.min}
                {b.max < 100 ? ` to ${b.max}` : " and up"}
              </b>
              : {b.advice}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Levels({ levels }: { levels: Record<number, string> }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {Object.entries(levels).map(([k, v]) => (
        <li key={k}>
          <b className="tabular-nums">{k}</b> {v}
        </li>
      ))}
    </ul>
  );
}

const isCriterion = (id: string): id is Criterion => (CRITERIA as readonly string[]).includes(id);

/** What each matrix column means, for the heading hover. Null for columns that need no help. */
export function columnHelp(columnId: string): ReactNode | null {
  if (isCriterion(columnId)) {
    const info = CRITERION_INFO[columnId];
    return (
      <>
        <p className="font-medium">{info.question}</p>
        <Levels levels={info.levels} />
      </>
    );
  }
  switch (columnId) {
    case "stage":
      return (
        <ul className="flex flex-col gap-0.5">
          {STAGES.map((s) => (
            <li key={s}>
              <b>{s}</b>: {STAGE_INFO[s]}
            </li>
          ))}
        </ul>
      );
    case "confidence":
      return (
        <>
          <p className="font-medium">{CONFIDENCE_INFO.question}</p>
          <Levels levels={CONFIDENCE_INFO.levels} />
          <p className="opacity-80">{CONFIDENCE_GATE_SUMMARY}</p>
        </>
      );
    case "potential":
      return (
        <>
          <p>{FORMULA_INFO.potential}</p>
          <BandChips />
        </>
      );
    case "score":
      return (
        <>
          <p>{FORMULA_INFO.score}</p>
          <BandChips />
        </>
      );
    default:
      return null;
  }
}

/** Wraps a column heading so hovering or focusing it explains the column. */
export function ColumnHelp({ columnId, children }: { columnId: string; children: ReactNode }) {
  const content = columnHelp(columnId);
  if (!content) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className="inline-flex cursor-help items-center gap-1 underline decoration-dotted underline-offset-4 focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        }
      >
        {children}
        <InfoIcon className="size-3 opacity-60" aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm flex-col items-start gap-1.5 px-3 py-2.5 text-left text-xs leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
