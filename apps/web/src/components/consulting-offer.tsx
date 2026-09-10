"use client";

import { ArrowUpRightIcon, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CONSULTING_TIERS,
  CONSULTING_URL,
  MAINTAINER_LINKEDIN_URL,
  MAINTAINER_URL,
  type ConsultingTier,
} from "@/lib/config";
import { Trans, useTranslation } from "react-i18next";

/**
 * The paid build-planning offer: a call to action that opens a dialog listing
 * the sessions on offer, each a fixed price with its own booking link. Two
 * placements, both in the app shell so it is on every screen: at the bottom of
 * the desktop sidebar, a tile like the AI card's with one question and one
 * button, so it reads as an optional next step rather than part of the
 * navigation; and in the bar under the content on phones, which have no
 * sidebar. Nothing here looks at the matrix. The text and the links are the
 * same for everyone, the booking links are plain links that open in a new
 * tab, and the app makes no request of its own, so the rule that nothing
 * leaves the machine holds. An empty CONSULTING_URL hides the offer (see
 * config.ts).
 *
 * The offer's text is English in every language, because the sessions are
 * held in English: the `consulting` keys exist only in en-CA, and the other
 * languages fall back to them on purpose (see CONTRIBUTING.md). Prices are
 * formatted in English too, so each line stays in one language.
 */
export function ConsultingOffer({ variant }: { variant: "sidebar" | "bar" }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  if (!CONSULTING_URL) return null;
  return (
    <>
      {variant === "sidebar" ? (
        <div className="flex flex-col gap-2 rounded-md border p-3 text-xs">
          <p className="font-medium">{t("consulting.lead")}</p>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <CalendarIcon data-icon="inline-start" /> {t("consulting.button")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 text-xs">
          <p className="text-muted-foreground">{t("consulting.lead")}</p>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <CalendarIcon data-icon="inline-start" /> {t("consulting.button")}
          </Button>
        </div>
      )}
      <ConsultingDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function ConsultingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("consulting.title")}</DialogTitle>
          <DialogDescription className="text-foreground">{t("consulting.about")}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <Trans
            t={t}
            i18nKey="consulting.aboutLinks"
            components={{
              site: (
                <a href={MAINTAINER_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4" />
              ),
              linkedin: (
                <a
                  href={MAINTAINER_LINKEDIN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                />
              ),
            }}
          />
        </p>
        <ul className="flex flex-col gap-3">
          {CONSULTING_TIERS.map((tier) => (
            <Tier key={tier.id} tier={tier} />
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          {t("consulting.tax")} {t("consulting.confidential")}
        </p>
        <p className="text-xs text-muted-foreground">{t("consulting.note")}</p>
      </DialogContent>
    </Dialog>
  );
}

function Tier({ tier }: { tier: ConsultingTier }) {
  const { t } = useTranslation("common");
  const price = formatPrice(tier);
  return (
    <li className="flex flex-col gap-2 rounded-md border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium">{t(`consulting.tiers.${tier.id}.name`)}</p>
        {price ? <p className="font-medium tabular-nums">{price}</p> : null}
      </div>
      <p className="text-sm text-muted-foreground">{t(`consulting.tiers.${tier.id}.summary`)}</p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("consulting.duration", { minutes: tier.minutes })}</p>
        <Button size="sm" nativeButton={false} render={<a href={tier.url} target="_blank" rel="noreferrer" />}>
          {t("consulting.book")} <ArrowUpRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </li>
  );
}

/**
 * A tier's fixed price, in English like the rest of the offer, or null when
 * none is set yet. Canadian dollars are written "$450 CAD" rather than the
 * bare "$450" en-CA formatting gives, because a reader in the United States
 * would take that for US dollars; other currencies keep Intl's own prefix
 * ("US$450").
 */
export function formatPrice(tier: ConsultingTier): string | null {
  if (!tier.price) return null;
  const formatted = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: tier.price.currency,
    maximumFractionDigits: 0,
  }).format(tier.price.amount);
  return tier.price.currency === "CAD" ? `${formatted} CAD` : formatted;
}
