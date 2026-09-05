import type { Band } from "@idea-matrix/core";

/** Colour band classes for Potential and Score. Light and dark both covered. */
export const BAND_CLASSES: Record<Band, string> = {
  grey: "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100",
  amber: "bg-amber-200 text-amber-950 dark:bg-amber-700 dark:text-amber-50",
  lightGreen: "bg-emerald-200 text-emerald-950 dark:bg-emerald-800 dark:text-emerald-50",
  darkGreen: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
};
