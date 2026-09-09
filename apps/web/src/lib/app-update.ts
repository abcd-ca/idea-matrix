import { useSyncExternalStore } from "react";
import { flushSave } from "./file-session";

/**
 * The page side of the service worker (src/service-worker.js): register it,
 * notice when a newer build has installed and is waiting, and switch to it
 * when the person says so. Production only: `next dev` serves no worker, and
 * a plain site is the right behaviour there.
 *
 * The "ready" flag is module state with a subscribe function, read by the
 * banner component through useSyncExternalStore, so nothing about updates
 * goes in the document store.
 */

export const SERVICE_WORKER_URL = "/sw.js";
/** How often, at most, a visible page asks the browser to look for a newer worker. Navigations check too. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

let registration: ServiceWorkerRegistration | null = null;
let ready = false;
let reloading = false;
const listeners = new Set<() => void>();

function setReady(): void {
  if (ready) return;
  ready = true;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True once a newer build is installed and waiting to take over. */
export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => ready,
    () => false,
  );
}

export function serviceWorkerSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/** Register the worker and watch for a newer build. Returns a cleanup function. */
export function startUpdateWatch(): () => void {
  if (!serviceWorkerSupported() || process.env.NODE_ENV !== "production") return () => {};
  let cancelled = false;
  let lastCheck = Date.now();

  const watchInstalling = (reg: ServiceWorkerRegistration) => {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      // "installed" with a controller means a newer build is waiting; on the
      // very first visit there is no controller and the worker simply takes over.
      if (worker.state === "installed" && navigator.serviceWorker.controller) setReady();
    });
  };
  const onUpdateFound = () => {
    if (registration) watchInstalling(registration);
  };
  const onControllerChange = () => {
    if (reloading) window.location.reload();
  };
  const check = () => {
    if (document.visibilityState !== "visible" || !registration) return;
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
    lastCheck = Date.now();
    registration.update().catch(() => {
      // Offline, or the site is gone for the moment: try again next time.
    });
  };

  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
  document.addEventListener("visibilitychange", check);
  navigator.serviceWorker
    .register(SERVICE_WORKER_URL, { updateViaCache: "none" })
    .then((reg) => {
      if (cancelled) return;
      registration = reg;
      if (reg.waiting && navigator.serviceWorker.controller) setReady();
      reg.addEventListener("updatefound", onUpdateFound);
      watchInstalling(reg);
    })
    .catch(() => {
      // Registration refused (a private window, storage turned off): the app
      // runs as a plain site, exactly as it did before there was a worker.
    });

  return () => {
    cancelled = true;
    navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    document.removeEventListener("visibilitychange", check);
    registration?.removeEventListener("updatefound", onUpdateFound);
  };
}

/**
 * Switch to the waiting build: write any pending change to the file first,
 * then tell the new worker to take over. The controllerchange event that
 * follows reloads the page from the new cache.
 */
export async function applyUpdate(): Promise<void> {
  await flushSave();
  const waiting = registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  reloading = true;
  waiting.postMessage({ type: "skip-waiting" });
}
