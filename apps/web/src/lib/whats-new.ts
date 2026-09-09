/**
 * The "What's new" feed: the features added to the app, newest first, shown
 * from the bell in the header. Owned by the app and bundled with it, never
 * fetched. Each entry is an id, a date and, when it shipped in a release,
 * the version; its title and one sentence live in the `whatsnew` namespace
 * of every locale under `entries.<id>`.
 *
 * The rules, also in CLAUDE.md:
 *
 * - Every pull request that adds a user-visible feature adds an entry at the
 *   top, with copy in every locale. Bug fixes never do.
 * - An id is stable forever: devices store the id of the newest entry the
 *   person has seen (`whatsNewSeen` in the preferences record), and a changed
 *   id would make everything look unread again.
 * - The bell shows the WHATS_NEW_LIMIT newest entries and never scrolls.
 *   Older entries drop off the end of the bell by themselves; they can stay
 *   in this array for the record or be pruned when a new one lands. A seen
 *   marker that points at a pruned entry still works: it is simply older
 *   than everything shown, so everything shown is new.
 *
 * Pure functions only, so the rules can be unit tested; the store and the
 * bell component apply them.
 */

export interface WhatsNewEntry {
  /** Stable forever. Date first, then a short slug: "2026-09-09-languages". */
  id: string;
  /** YYYY-MM-DD, the day the feature landed. */
  date: string;
  /** The release it shipped in, once known. */
  version?: string;
}

/** How many entries the bell shows. Anything older is out of the bell. */
export const WHATS_NEW_LIMIT = 5;

/** Newest first. */
export const WHATS_NEW: readonly WhatsNewEntry[] = [
  { id: "2026-09-09-install-app", date: "2026-09-09" },
  { id: "2026-09-09-start-over", date: "2026-09-09" },
  { id: "2026-09-09-whats-new", date: "2026-09-09" },
  { id: "2026-09-09-languages", date: "2026-09-09" },
  { id: "2026-09-09-phone-layout", date: "2026-09-09", version: "0.1.1" },
  { id: "2026-09-08-google-drive", date: "2026-09-08", version: "0.1.1" },
];

/** The entries the bell shows: the newest, up to the limit. */
export function shownEntries(entries: readonly WhatsNewEntry[]): WhatsNewEntry[] {
  return entries.slice(0, WHATS_NEW_LIMIT);
}

/** The id the seen marker becomes once the person has looked. */
export function latestId(entries: readonly WhatsNewEntry[]): string | undefined {
  return entries[0]?.id;
}

/**
 * The entries newer than the one the person last saw. All of them when there
 * is no marker or the marker names an entry that is not in the list (pruned,
 * or from a newer copy of the app): either way nothing here has been seen.
 */
export function unseenEntries(entries: readonly WhatsNewEntry[], seenId: string | undefined): WhatsNewEntry[] {
  const seenAt = seenId === undefined ? -1 : entries.findIndex((entry) => entry.id === seenId);
  return seenAt < 0 ? [...entries] : entries.slice(0, seenAt);
}

/**
 * The seen marker the session should start with. Someone who has never used
 * the app (no file remembered, no marker) has nothing "new" relative to them,
 * so their marker becomes the latest id and the bell starts quiet. Anyone
 * else keeps whatever they have: a marker, or none, in which case a
 * remembered file means an existing user who sees every entry as new once,
 * because the feed itself is new.
 */
export function seenIdAtStart(
  entries: readonly WhatsNewEntry[],
  state: { rememberedFile: boolean; seenId: string | undefined },
): string | undefined {
  if (state.seenId !== undefined || state.rememberedFile) return state.seenId;
  return latestId(entries);
}
