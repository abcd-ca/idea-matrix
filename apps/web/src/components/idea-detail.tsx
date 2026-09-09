"use client";

import {
  CRITERIA,
  STAGES,
  band,
  deleteIdea,
  findIdea,
  maxConfidenceAllowed,
  parkIdea,
  potential,
  score,
  unparkIdea,
  updateIdea,
  type Stage,
} from "@idea-matrix/core";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { EvidenceLog } from "@/components/evidence-log";
import { ParkDialog } from "@/components/park-dialog";
import { BandPill } from "@/components/pills";
import { SaveIndicator } from "@/components/save-indicator";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store";
import { coreLevels } from "@/lib/i18n";
import { useTranslation } from "react-i18next";

export function IdeaDetail() {
  const { t } = useTranslation("idea");
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const router = useRouter();
  const doc = useAppStore((s) => s.doc);
  const mutate = useAppStore((s) => s.mutate);
  const [error, setError] = useState<string | null>(null);
  const [parkOpen, setParkOpen] = useState(false);

  const idea = doc ? findIdea(doc, id) : undefined;
  if (!doc || !idea) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" /> {t("backToMatrix")}
        </Link>
        <p className="text-muted-foreground">{t("notFound")}</p>
      </div>
    );
  }

  const change = (patch: Parameters<typeof updateIdea>[2]) => setError(mutate((d) => updateIdea(d, idea.id, patch)));
  const allowed = maxConfidenceAllowed(idea.evidence);
  // The gate sentence for the evidence so far; empty once the log allows 5.
  const gate = allowed === 5 ? "" : t(`gate.${allowed}`, { ns: "core" });
  const p = potential(idea.scores);
  const s = score(p, idea.confidence);
  const pBand = band(p);
  const sBand = band(s);
  const parked = idea.stage === "Parked";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={parked ? "/parked/" : "/"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" /> {parked ? t("backToParked") : t("backToMatrix")}
        </Link>
        <SaveIndicator />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              aria-label={t("nameLabel")}
              className="h-11 flex-1 font-heading text-2xl font-semibold md:text-2xl"
              value={idea.name}
              maxLength={200}
              onChange={(e) => change({ name: e.target.value })}
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="stage" className="sr-only">
                {t("stage")}
              </Label>
              <select
                id="stage"
                value={idea.stage}
                onChange={(e) => {
                  const next = e.target.value as Stage;
                  if (next === "Parked") setParkOpen(true);
                  else if (parked) setError(mutate((d) => unparkIdea(d, idea.id, next)));
                  else change({ stage: next });
                }}
                className="h-10 rounded-md border bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {STAGES.map((st) => (
                  <option key={st} value={st}>
                    {t(`stageName.${st}`, { ns: "core" })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {parked ? (
            <div className="rounded-md border border-dashed p-3 text-sm">
              <p className="font-medium">{t("parkedBecause")}</p>
              <p className="text-muted-foreground">{idea.parkedReason}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("chooseAnother")}</p>
            </div>
          ) : null}

          <Field label={t("description")} htmlFor="description">
            <Textarea
              id="description"
              value={idea.description}
              rows={4}
              maxLength={20000}
              onChange={(e) => change({ description: e.target.value })}
            />
          </Field>

          <Field label={t("assumption")} htmlFor="assumption" hint={t("assumptionHint")}>
            <Textarea
              id="assumption"
              value={idea.riskiestAssumption}
              rows={2}
              maxLength={20000}
              placeholder={t("assumptionPlaceholder")}
              onChange={(e) => change({ riskiestAssumption: e.target.value })}
            />
          </Field>

          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {CRITERIA.map((key) => (
              <Segmented
                key={key}
                id={`score-${key}`}
                label={t(`criterion.${key}.label`, { ns: "core" })}
                hint={t(`criterion.${key}.question`, { ns: "core" })}
                value={idea.scores[key]}
                min={key === "profitability" ? 0 : 1}
                meanings={coreLevels(t, `criterion.${key}.levels`)}
                onChange={(v) => change({ scores: { [key]: v } })}
                onClear={() => change({ scores: { [key]: null } })}
              />
            ))}
            <Segmented
              id="confidence"
              label={t("confidence.label", { ns: "core" })}
              hint={t("confidence.question", { ns: "core" })}
              value={idea.confidence}
              max={allowed}
              meanings={coreLevels(t, "confidence.levels")}
              disabledReason={gate}
              onChange={(v) => change({ confidence: v })}
            />
          </div>
          {gate ? <p className="text-xs text-muted-foreground">{gate}</p> : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-md border p-4">
            <p className="text-xs font-medium text-muted-foreground">{t("terms.potential", { ns: "common" })}</p>
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-5xl font-semibold tabular-nums">{p ?? "–"}</span>
              {pBand ? (
                <BandPill value={p} showLabel />
              ) : (
                <span className="text-sm text-muted-foreground">{t("needsAllFive")}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("formula.potential", { ns: "core" })}</p>
            <p className="text-xs font-medium text-muted-foreground">{t("terms.score", { ns: "common" })}</p>
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-5xl font-semibold tabular-nums">{s ?? "–"}</span>
              {sBand ? <BandPill value={s} showLabel /> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {p !== null && sBand ? `${capitalize(t(`band.${sBand}.advice`, { ns: "core" }))}. ` : ""}
              {t("formula.score", { ns: "core" })}
            </p>
            {p !== null && idea.confidence < 5 ? (
              <p className="text-xs text-muted-foreground">
                {t("nextConfidence", { confidence: idea.confidence + 1, score: score(p, idea.confidence + 1) })}
                {idea.confidence + 1 > allowed ? ` ${t("needsMoreEvidence")}` : ""}
              </p>
            ) : null}
          </div>

          <EvidenceLog idea={idea} onError={setError} />

          {!parked ? (
            <Button variant="outline" onClick={() => setParkOpen(true)}>
              {t("park")}
            </Button>
          ) : null}
        </div>
      </div>

      <ParkDialog
        open={parkOpen}
        onOpenChange={setParkOpen}
        ideaName={idea.name}
        onPark={(reason) => {
          const err = mutate((d) => parkIdea(d, idea.id, reason));
          setError(err);
          if (!err) router.push("/parked/");
          return err;
        }}
        onDelete={() => {
          const err = mutate((d) => deleteIdea(d, idea.id));
          setError(err);
          if (!err) router.push("/");
        }}
      />
    </div>
  );
}

/** The band advice starts a sentence here, so it gets a capital. */
function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
