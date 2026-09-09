import { useSyncExternalStore } from "react";

/**
 * The tip shown over Google's file picker. The picker is Google's own dialog
 * in an iframe, so the app cannot write inside it; what it can do is know
 * when the picker is on screen (storage/google-drive.ts says so) and float a
 * line of its own next to it. The line matters most on a phone, where one
 * tap on a folder only selects it and nothing seems to happen.
 *
 * Module state with a subscribe function, read by the component through
 * useSyncExternalStore; nothing about the picker goes in the document store.
 */

/** 0 while no picker is on screen; otherwise a number that changes each time one opens. */
let session = 0;
let opened = 0;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function pickerOpened(): void {
  session = ++opened;
  notify();
}

export function pickerClosed(): void {
  session = 0;
  notify();
}

/** The current picker session, or 0 when none is on screen. A new number per opening, so a dismissal applies to one picker only. */
export function usePickerSession(): number {
  return useSyncExternalStore(
    subscribe,
    () => session,
    () => 0,
  );
}

/** Where Google's dialog is, in viewport coordinates. */
export interface Box {
  top: number;
  bottom: number;
  left: number;
  width: number;
}

export interface Placement {
  top: number;
  left: number;
  width: number;
  /** True when the line sits over the dialog's own top edge because there was no room beside it. */
  overlaps: boolean;
}

/** The line's height with its padding, and the gap kept from the dialog. */
export const TIP_HEIGHT = 44;
const GAP = 8;

/**
 * Above the dialog when there is room, below it otherwise, and as a last
 * resort over its top edge, narrowed so the dialog's own close button stays
 * reachable. Without a dialog to measure (it has not been built yet) the line
 * sits at the top of the screen.
 */
export function tipPlacement(dialog: Box | null, viewport: { width: number; height: number }): Placement {
  if (!dialog) {
    const width = Math.min(viewport.width - 2 * GAP, 640);
    return { top: GAP, left: (viewport.width - width) / 2, width, overlaps: false };
  }
  const { left, width } = dialog;
  if (dialog.top >= TIP_HEIGHT + 2 * GAP) return { top: dialog.top - TIP_HEIGHT - GAP, left, width, overlaps: false };
  if (viewport.height - dialog.bottom >= TIP_HEIGHT + 2 * GAP) {
    return { top: dialog.bottom + GAP, left, width, overlaps: false };
  }
  return { top: Math.max(dialog.top, 0) + GAP, left: left + GAP, width: Math.max(width - 72, 160), overlaps: true };
}
