/** Dates and times in the current language, through Intl. */

/** A calendar date stored as YYYY-MM-DD, shown the way the language writes dates. */
export function formatDate(isoDate: string, language: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  // Built from the parts, not parsed: "2026-09-09" parsed as a string is UTC
  // midnight, which is the day before in the Americas.
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(date);
}

/** A time of day, hours and minutes. */
export function formatTime(timestamp: number, language: string): string {
  return new Intl.DateTimeFormat(language, { hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
}
