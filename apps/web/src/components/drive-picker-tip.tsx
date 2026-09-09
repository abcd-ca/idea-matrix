"use client";

import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { tipPlacement, usePickerSession, type Placement } from "@/lib/drive-picker-tip";

/** Google gives its dialog this class; it is the one thing of Google's the app looks at on the page. */
const DIALOG = ".picker-dialog";
/** Frames to wait for the dialog to appear after the picker is asked to show, about a second. */
const PATIENCE = 60;

/**
 * Mounted once in the layout. While Google's picker is on screen, a line
 * beside it says how to open a folder; the dialog is measured once it
 * exists and again whenever the window changes size. The placement and a
 * dismissal each remember which picker session they belong to, so an old
 * one never shows for a new picker.
 */
export function DrivePickerTip() {
  const { t } = useTranslation("common");
  const session = usePickerSession();
  const [placed, setPlaced] = useState<{ session: number; placement: Placement } | null>(null);
  const [dismissedSession, setDismissedSession] = useState(0);

  useEffect(() => {
    if (session === 0) return;
    let frame = 0;
    let waited = 0;
    const measure = () => {
      const dialog = document.querySelector(DIALOG);
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      if (dialog) {
        const r = dialog.getBoundingClientRect();
        const box = { top: r.top, bottom: r.bottom, left: r.left, width: r.width };
        setPlaced({ session, placement: tipPlacement(box, viewport) });
      } else if (waited++ < PATIENCE) {
        frame = requestAnimationFrame(measure);
      } else {
        setPlaced({ session, placement: tipPlacement(null, viewport) });
      }
    };
    frame = requestAnimationFrame(measure);
    const onResize = () => {
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [session]);

  if (session === 0 || placed?.session !== session || dismissedSession === session) return null;
  const { placement } = placed;

  return (
    <div
      role="note"
      style={{ top: placement.top, left: placement.left, width: placement.width }}
      // Above Google's dialog (z-index 1001) and its backdrop (1000).
      className="fixed z-[1002] flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-lg"
    >
      <p className="flex-1">{t("picker.folderTip")}</p>
      {placement.overlaps ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("actions.close")}
          onClick={() => setDismissedSession(session)}
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}
