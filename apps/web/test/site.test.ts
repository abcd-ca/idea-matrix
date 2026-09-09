import { describe, expect, it } from "vitest";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import { APP_NAME } from "../src/lib/config";
import { LANGUAGES } from "../src/lib/preferences";
import {
  DESCRIPTION,
  PAGES,
  SITE_URL,
  indexedPaths,
  pageMetadata,
  structuredData,
  structuredDataJson,
} from "../src/lib/site";

const paths = Object.keys(PAGES) as (keyof typeof PAGES)[];

describe("the pages", () => {
  it("are absolute paths with a trailing slash, the way the export serves them", () => {
    for (const path of paths) expect(path).toMatch(/^\/([a-z-]+\/)?$/);
  });

  it("carry a description of under 160 characters when they are indexed, and none when not", () => {
    for (const path of paths) {
      const page = PAGES[path];
      if (page.index) {
        expect(page.description, path).toBeTruthy();
        expect(page.description!.length, path).toBeLessThanOrEqual(160);
      } else {
        expect(page).not.toHaveProperty("description");
      }
    }
  });

  it("get a canonical URL when indexed and a noindex when not", () => {
    expect(pageMetadata("/")).toEqual({
      title: { absolute: APP_NAME },
      description: DESCRIPTION,
      alternates: { canonical: "/" },
    });
    expect(pageMetadata("/privacy/")).toMatchObject({
      title: "Privacy and trust",
      alternates: { canonical: "/privacy/" },
    });
    expect(pageMetadata("/settings/")).toEqual({ title: "Settings", robots: { index: false, follow: false } });
  });
});

describe("the sitemap and robots", () => {
  it("list exactly the indexed pages as absolute URLs", () => {
    expect(sitemap()).toEqual(indexedPaths().map((path) => ({ url: `${SITE_URL}${path}` })));
    expect(indexedPaths()).toEqual(["/", "/setup/", "/privacy/"]);
  });

  it("have nothing that changes between two builds of one commit", () => {
    for (const entry of sitemap()) expect(entry).not.toHaveProperty("lastModified");
  });

  it("allow every page and name the sitemap", () => {
    expect(robots()).toEqual({ rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_URL}/sitemap.xml` });
  });
});

describe("the structured data", () => {
  it("describes the application at the site's address", () => {
    expect(structuredData()).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: APP_NAME,
      url: `${SITE_URL}/`,
      description: DESCRIPTION,
      inLanguage: [...LANGUAGES],
      isAccessibleForFree: true,
    });
  });

  it("is JSON that cannot close its script element", () => {
    const text = structuredDataJson();
    expect(text).not.toContain("<");
    expect(JSON.parse(text)).toEqual(structuredData());
  });
});
