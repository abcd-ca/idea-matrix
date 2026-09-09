import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/config";

/**
 * The web app manifest, which is what lets a browser install the app with
 * its own window and icon. Exported as /manifest.webmanifest and linked from
 * every page by Next. The icons come from scripts/icons.mjs at build time.
 * The manifest has one language; the app itself switches after it opens.
 */

// A static export has no server to render it on request, so say so.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "en-CA",
    dir: "ltr",
    categories: ["productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Opening the app again, from the Dock or a launcher, focuses the window
    // that is already open rather than starting a second one on the same file.
    launch_handler: { client_mode: "focus-existing" },
  };
}
