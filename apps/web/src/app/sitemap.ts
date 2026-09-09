import type { MetadataRoute } from "next";
import { SITE_URL, indexedPaths } from "../lib/site";

/**
 * Written to out/sitemap.xml at build time: the pages a stranger can read,
 * from lib/site.ts. No lastModified: it would need a timestamp or the
 * commit date, and the export has to be byte-for-byte reproducible from a
 * commit (see scripts/fingerprint.mjs).
 */
// A static export needs the route to say it is static.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexedPaths().map((path) => ({ url: `${SITE_URL}${path}` }));
}
