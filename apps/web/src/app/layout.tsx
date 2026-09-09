import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans, Nunito_Sans } from "next/font/google";
import "./globals.css";
import "driver.js/dist/driver.css";
import { AppUpdate } from "@/components/app-update";
import { FileSession } from "@/components/file-session";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DevicePreferences } from "@/components/device-preferences";
import { DEFAULT_LANGUAGE, PREFERENCES_SCRIPT } from "@/lib/preferences";
import { APP_NAME } from "@/lib/config";
import { SITE_URL, TAGLINE, structuredDataJson } from "@/lib/site";

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Headings: a humanist sans at a lighter weight than the body's bold. Large
// headings and the big numbers use 600, section titles and the rail name 700.
const nunitoSans = Nunito_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
});

// Each page sets its own title and description with pageMetadata (lib/site.ts);
// the template puts the app name after a page's title.
export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  applicationName: APP_NAME,
  // Link previews in chat apps and social sites. Without these tags each app
  // improvises from the title, description and icon, and some show nothing.
  // The image comes from opengraph-image.png and twitter-image.png beside
  // this file, generated from the icon SVG by scripts/icons.mjs at build
  // time; Next adds a content hash to their URLs, so a changed image gets a
  // new URL and the caches in those apps do not serve the old one.
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: TAGLINE,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: TAGLINE,
  },
  // Installed from Safari on iOS the app gets its own window too; the
  // manifest (app/manifest.ts) covers every other browser.
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Let the page reach the screen's edges in the installed app on an iPhone;
  // globals.css pads the body by the safe-area insets so nothing sits under
  // the status bar or the home indicator.
  viewportFit: "cover",
  // The title bar of the installed app follows the page background (globals.css).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The prerendered page is en-CA with no theme class. Before first paint
    // the inline script below sets `lang` and the `dark` class from the
    // device preferences record, and after hydration the preferences store
    // computes the same values from the same record and applies them
    // (see lib/preferences-store.ts). suppressHydrationWarning covers the
    // attributes the script changed: React does not rewrite them.
    <html
      lang={DEFAULT_LANGUAGE}
      suppressHydrationWarning
      className={`${plexSans.variable} ${nunitoSans.variable} h-full antialiased`}
    >
      <head>
        {/*
          The only dangerouslySetInnerHTML in the app, and it stays the only
          one. CLAUDE.md forbids raw HTML of user text; this is an app-owned
          constant with no user data in it (lib/preferences.ts), rendered as
          a plain <script> rather than next/script so the text in the page is
          exactly that constant and a content security policy can allow it by
          hash.
        */}
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_SCRIPT }} />
        {/*
          Structured data for search engines (lib/site.ts). A data block, not
          a script that runs, so it needs no place in a content security
          policy. React writes a script's string child unescaped, which is
          why this one needs no dangerouslySetInnerHTML.
        */}
        <script type="application/ld+json">{structuredDataJson()}</script>
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <TooltipProvider>
          <DevicePreferences />
          <FileSession />
          <AppUpdate />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
