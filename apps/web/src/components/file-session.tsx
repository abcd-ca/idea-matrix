"use client";

import { attachPersistence, startSession } from "@/lib/file-session";
import { useAppStore } from "@/lib/store";
import { useEffect } from "react";

/** Mounted once in the layout. Boots the file session after the cache hydrates. */
export function FileSession() {
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    void startSession();
    return attachPersistence();
  }, [hydrated]);

  return null;
}
