import { CloudIcon, MonitorIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "cn";

export type StorageIconKind = "local" | "drive" | "dropbox";

/**
 * The picture for each place a matrix can live: on the "where" cards in the
 * setup wizard and on the move buttons in Settings.
 *
 * - This computer: a monitor from the app's own icon set.
 * - Google Drive: Google's own product logo, bundled unmodified from the file
 *   its brand page links to (public/brands/google-drive.png, the 2026 mark;
 *   Google publishes it as PNG only). Google's guidelines allow the logo to
 *   show where a file is stored or on a button that acts on Drive, resized but
 *   otherwise unaltered, always beside the full name "Google Drive". The
 *   README credits the trademark. Served from the app's own origin like
 *   everything else, so nothing is fetched from Google.
 * - Dropbox: a plain cloud until the Dropbox target exists. Dropbox's glyph
 *   goes on when there is a working feature behind it, not on a placeholder.
 *
 * Decorative: the card title or button label names the place, so the picture
 * is hidden from assistive technology.
 */
export function StorageIcon({
  kind,
  className,
  ...rest
}: {
  kind: StorageIconKind;
  className?: string;
  /** Set to "inline-start" inside a Button so the button spaces it like its other icons. */
  "data-icon"?: "inline-start" | "inline-end";
}) {
  if (kind === "drive") {
    return (
      <Image
        src="/brands/google-drive.png"
        alt=""
        aria-hidden
        width={192}
        height={192}
        className={cn("size-8 shrink-0", className)}
        {...rest}
      />
    );
  }
  const Icon = kind === "local" ? MonitorIcon : CloudIcon;
  return (
    <Icon aria-hidden className={cn("size-8 shrink-0 text-muted-foreground", className)} strokeWidth={1.5} {...rest} />
  );
}
