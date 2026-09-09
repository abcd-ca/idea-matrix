import { useSyncExternalStore } from "react";

/**
 * Installing the app from the page. Chrome and Edge fire `beforeinstallprompt`
 * once a page qualifies (manifest, icons, a service worker); holding on to
 * that event lets the Settings button open the browser's install dialog
 * itself. Safari offers no event, and neither does a browser where the app
 * is already installed, so the button shows only when the event has arrived.
 * Feature-detected throughout: the event, the display-mode media query and
 * Safari's `navigator.standalone` are all properties, never a user agent.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState = "unavailable" | "available" | "installed";

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
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

/** True when this page is running as the installed app rather than in a tab. */
export function runningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function currentState(): InstallState {
  if (installed || runningStandalone()) return "installed";
  return deferred ? "available" : "unavailable";
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, currentState, () => "unavailable");
}

/** Listen from the moment the app's code runs, since the browser fires the event only once. Returns a cleanup function. */
export function startInstallWatch(): () => void {
  if (typeof window === "undefined") return () => {};
  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  };
  const onInstalled = () => {
    deferred = null;
    installed = true;
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

/** Open the browser's install dialog. The held event is good for one use. */
export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (!event) return;
  deferred = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") installed = true;
  notify();
}
