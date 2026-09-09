import { PAGES, SITE_URL, type PageInfo } from "../src/lib/site";
import { expect, test } from "./helpers";

/**
 * What a search engine gets from the export: each page's title, description,
 * canonical URL or noindex, the structured data, and robots.txt and
 * sitemap.xml. These read the HTML as served rather than the rendered page,
 * because a crawler starts from the same bytes and the home page sends a
 * browser on to setup before it has finished loading.
 */
const paths = Object.keys(PAGES) as (keyof typeof PAGES)[];

const attribute = (html: string, selector: RegExp): string | undefined => selector.exec(html)?.[1];
const description = (html: string) => attribute(html, /<meta name="description" content="([^"]*)"/);
const canonical = (html: string) => attribute(html, /<link rel="canonical" href="([^"]*)"/);
const robotsMeta = (html: string) => attribute(html, /<meta name="robots" content="([^"]*)"/);
const title = (html: string) => attribute(html, /<title>([^<]*)<\/title>/);

for (const path of paths) {
  const page: PageInfo = PAGES[path];
  test(`${path} tells search engines what it is`, async ({ request }) => {
    const html = await (await request.get(path)).text();
    expect(title(html)).toBe(page.title ? `${page.title} · Idea Matrix` : "Idea Matrix");
    if (page.index) {
      expect(description(html)).toBe(page.description);
      expect(canonical(html)).toBe(`${SITE_URL}${path}`);
      expect(robotsMeta(html)).toBeUndefined();
    } else {
      expect(robotsMeta(html)).toBe("noindex, nofollow");
      expect(canonical(html)).toBeUndefined();
    }
    // The link preview tags stay on every page, with the image Next hashed.
    expect(html).toContain(`<meta property="og:site_name" content="Idea Matrix"/>`);
    expect(html).toMatch(/<meta property="og:image" content="[^"]*\/opengraph-image[^"]*"/);
    expect(html).toMatch(/<meta name="twitter:card" content="summary_large_image"\/>/);
    // The structured data, as one JSON block that parses.
    const json = attribute(html, /<script type="application\/ld\+json">([^<]*)<\/script>/);
    expect(json).toBeTruthy();
    expect(JSON.parse(json!)).toMatchObject({ "@type": "WebApplication", name: "Idea Matrix", url: `${SITE_URL}/` });
  });
}

test("robots.txt allows everything and points at the sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("text/plain");
  const text = await response.text();
  expect(text).toContain("User-Agent: *");
  expect(text).toContain("Allow: /");
  expect(text).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
});

test("sitemap.xml lists the pages a stranger can read, and only those", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBe(true);
  const xml = await response.text();
  const listed = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  expect(listed).toEqual(paths.filter((path) => PAGES[path].index).map((path) => `${SITE_URL}${path}`));
});
