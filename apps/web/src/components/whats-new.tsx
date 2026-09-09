"use client";

import { BellIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { usePreferences } from "@/lib/preferences-store";
import { WHATS_NEW, latestId, shownEntries, unseenEntries } from "@/lib/whats-new";

/**
 * The bell in the header: a red dot while there are entries this device has
 * not seen, and a popover with the newest entries. Opening it marks
 * everything seen, through the preferences store, so the dot goes at once
 * and stays away after a reload. Before the preferences have hydrated the
 * count is zero, so the first client render matches the prerendered page.
 */
export function WhatsNewBell() {
  const { t } = useTranslation("whatsnew");
  const hydrated = usePreferences((s) => s.hydrated);
  const language = usePreferences((s) => s.language);
  const seenId = usePreferences((s) => s.whatsNewSeen);
  const markSeen = usePreferences((s) => s.markWhatsNewSeen);

  const entries = shownEntries(WHATS_NEW);
  const unread = hydrated ? unseenEntries(entries, seenId).length : 0;
  const label = unread > 0 ? t("unread", { count: unread }) : t("label");

  return (
    <Popover
      onOpenChange={(open) => {
        const latest = latestId(WHATS_NEW);
        if (open && latest !== undefined && latest !== seenId) markSeen(latest);
      }}
    >
      <PopoverTrigger render={<Button variant="ghost" size="icon-sm" className="relative" aria-label={label} />}>
        <BellIcon />
        {unread > 0 ? (
          <span
            aria-hidden
            data-slot="whats-new-dot"
            className="absolute top-1 right-1 size-2 rounded-full bg-red-500 ring-2 ring-background"
          />
        ) : null}
      </PopoverTrigger>
      {/* Sized to fit a phone with every entry in view: no max height, no scrolling, so the copy stays short. */}
      <PopoverContent align="end" className="flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        <PopoverTitle>{t("title")}</PopoverTitle>
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-0.5">
              <h3 className="font-medium">{t(`entries.${entry.id}.title`)}</h3>
              <p className="text-muted-foreground">{t(`entries.${entry.id}.text`)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(entry.date, language)}
                {entry.version ? ` · ${entry.version}` : null}
              </p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
