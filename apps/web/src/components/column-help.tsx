"use client";

import { BANDS, CRITERIA, STAGES, type Band, type Criterion } from "@idea-matrix/core";
import { cn } from "cn";
import { InfoIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BAND_CLASSES } from "@/lib/bands";
import { coreLevels } from "@/lib/i18n";
import type { TFunction } from "i18next";
import { Trans, useTranslation } from "react-i18next";

/** The coloured band key, reused by the tour and the column help. */
export function BandChips() {
  const { t } = useTranslation("matrix");
  return (
    <ul className="flex flex-col gap-1">
      {(Object.keys(BANDS) as Band[]).map((key) => {
        const b = BANDS[key];
        return (
          <li key={key} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block min-w-9 rounded-md px-2 py-0.5 text-center font-semibold tabular-nums",
                BAND_CLASSES[key],
              )}
            >
              {b.min}
            </span>
            <span>
              <Trans
                t={t}
                i18nKey="help.bandLine"
                values={{
                  range: b.max < 100 ? t("help.range", { min: b.min, max: b.max }) : t("help.andUp", { min: b.min }),
                  advice: t(`band.${key}.advice`, { ns: "core" }),
                }}
                components={{ b: <b /> }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Levels({ levels }: { levels: Record<number, string> }) {
  const { t } = useTranslation("matrix");
  return (
    <ul className="flex flex-col gap-0.5">
      {Object.entries(levels).map(([k, v]) => (
        <li key={k}>
          <Trans
            t={t}
            i18nKey="help.levelLine"
            values={{ level: k, meaning: v }}
            components={{ b: <b className="tabular-nums" /> }}
          />
        </li>
      ))}
    </ul>
  );
}

const isCriterion = (id: string): id is Criterion => (CRITERIA as readonly string[]).includes(id);

/** What each matrix column means, for the heading hover. Null for columns that need no help. */
export function columnHelp(columnId: string, t: TFunction): ReactNode | null {
  if (isCriterion(columnId)) {
    return (
      <>
        <p className="font-medium">{t(`criterion.${columnId}.question`, { ns: "core" })}</p>
        <Levels levels={coreLevels(t, `criterion.${columnId}.levels`)} />
      </>
    );
  }
  switch (columnId) {
    case "stage":
      return (
        <ul className="flex flex-col gap-0.5">
          {STAGES.map((s) => (
            <li key={s}>
              <Trans
                t={t}
                i18nKey="help.stageLine"
                values={{ stage: t(`stageName.${s}`, { ns: "core" }), description: t(`stage.${s}`, { ns: "core" }) }}
                components={{ b: <b /> }}
              />
            </li>
          ))}
        </ul>
      );
    case "confidence":
      return (
        <>
          <p className="font-medium">{t("confidence.question", { ns: "core" })}</p>
          <Levels levels={coreLevels(t, "confidence.levels")} />
          <p className="opacity-80">{t("gateSummary", { ns: "core" })}</p>
        </>
      );
    case "potential":
      return (
        <>
          <p>{t("formula.potential", { ns: "core" })}</p>
          <BandChips />
        </>
      );
    case "score":
      return (
        <>
          <p>{t("formula.score", { ns: "core" })}</p>
          <BandChips />
        </>
      );
    default:
      return null;
  }
}

/** Wraps a column heading so hovering or focusing it explains the column. */
export function ColumnHelp({ columnId, children }: { columnId: string; children: ReactNode }) {
  const { t } = useTranslation("matrix");
  const content = columnHelp(columnId, t);
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
      <TooltipContent
        side="bottom"
        className="max-w-sm flex-col items-start gap-1.5 px-3 py-2.5 text-left text-xs leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
