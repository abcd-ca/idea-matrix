import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";

/** Written to out/robots.txt at build time. Every page may be crawled; the app screens say noindex themselves (lib/site.ts). */
// A static export needs the route to say it is static.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
