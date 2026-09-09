import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans, Nunito_Sans } from "next/font/google";
import "./globals.css";
import "driver.js/dist/driver.css";
import { FileSession } from "@/components/file-session";
import { TooltipProvider } from "@/components/ui/tooltip";

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

const TITLE = "Idea Matrix";
const DESCRIPTION =
  "Score your project ideas, and keep the file yourself. No accounts, no server, nothing leaves your machine.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: TITLE,
  // Link previews in chat apps and social sites. Without these tags each app
  // improvises from the title, description and icon, and some show nothing.
  // og.png is generated from the icon SVG by scripts/icons.mjs at build time.
  metadataBase: new URL("https://ideamatrix.io"),
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Idea Matrix: score your project ideas." }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${nunitoSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <TooltipProvider>
          <FileSession />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
