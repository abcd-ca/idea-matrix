"use client";

import { LANGUAGE_NAMES, LANGUAGES, type Language } from "@/lib/preferences";
import { usePreferences } from "@/lib/preferences-store";
import { cn } from "cn";
import { LanguagesIcon } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/** Mounted once in the layout. Reads the device preferences after hydration and puts them into effect. */
export function DevicePreferences() {
  const hydrate = usePreferences((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}

const isLanguage = (value: string): value is Language => (LANGUAGES as readonly string[]).includes(value);

/**
 * The language select, shown in Settings and in the setup wizard. Each
 * language is named in itself, so anyone can find their own. A native select:
 * it works on a phone, and the browser draws it.
 */
export function LanguageSelect({
  id,
  className,
  compact = false,
}: {
  id?: string;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation("common");
  const language = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);
  const select = (
    <select
      id={id}
      aria-label={id ? undefined : t("language")}
      value={language}
      onChange={(e) => {
        if (isLanguage(e.target.value)) setLanguage(e.target.value);
      }}
      className={cn(
        "rounded-md border bg-background text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        compact ? "h-8 px-2" : "h-10 px-3",
        className,
      )}
    >
      {LANGUAGES.map((tag) => (
        <option key={tag} value={tag} lang={tag}>
          {LANGUAGE_NAMES[tag]}
        </option>
      ))}
    </select>
  );
  if (!compact) return select;
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <LanguagesIcon className="size-4" aria-hidden />
      {select}
    </span>
  );
}
