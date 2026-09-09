// Every raster form of the logo, generated from the one SVG source.
//
//   node scripts/icons.mjs     npm runs it before `next build` and `next dev` in
//                              apps/web, and before `bundle` in packages/mcp
//
// The source is apps/web/src/app/icon.svg, the favicon Next serves as-is. From it:
//   apps/web/src/app/favicon.ico        16, 32 and 48 px, mark on transparent
//   apps/web/src/app/apple-icon.png     180 px, mark on a light tile (iOS home screen)
//   apps/web/public/icons/icon-192.png  installable-app icons, same tile
//   apps/web/public/icons/icon-512.png
//   apps/web/public/icons/icon-maskable-512.png   mark inside the safe zone for Android masks
//   apps/web/src/app/opengraph-image.png 1200 × 630, mark and wordmark, for link previews; Next puts a
//   apps/web/src/app/twitter-image.png    content hash in its URL, so a changed image is fetched afresh
//   apps/web/public/social-preview.png  1280 × 640, the same, for GitHub's repository preview
//   packages/mcp/icon.png               512 px tile, the Claude Desktop extension card
//
// None of these are checked in. They are built from the SVG and pinned
// package versions (sharp for rasterizing, opentype.js and the Nunito Sans
// package for the wordmark), so every build of a commit produces the same
// bytes and the build fingerprint covers them.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const WEB = join(ROOT, "apps/web/");
const MCP = join(ROOT, "packages/mcp/");
const SOURCE = join(WEB, "src/app/icon.svg");
const INK = "#1a1a1a";
const TILE = "#fafafa";
const MUTED = "#6b6b6b";

/** The mark's drawing, without the favicon's colour-scheme stylesheet. */
async function markBody() {
  const svg = await readFile(SOURCE, "utf8");
  const inner = svg
    .replace(/<style>[\s\S]*?<\/style>/, "")
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  return inner.trim();
}

/** The mark alone, `size` px square, scaled so its 64-unit box fills `inset` of the square on each side. */
function markSvg(body, size, inset = 0, background = "none") {
  const scale = (size - 2 * inset) / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${background === "none" ? "" : `<rect width="${size}" height="${size}" fill="${background}"/>`}
  <g fill="${INK}" transform="translate(${inset} ${inset}) scale(${scale})">${body}</g>
</svg>`;
}

const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();

/** An .ico container holding PNG images, which every current browser reads. */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  const blobs = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    blobs.push(data);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...blobs]);
}

function loadFont(weight) {
  const file = require.resolve(`@fontsource/nunito-sans/files/nunito-sans-latin-${weight}-normal.woff`);
  return opentype.loadSync(file);
}

/** Text as outlines, so the image does not depend on the fonts installed where it is built. */
function textPath(font, text, x, y, size, fill) {
  return `<path fill="${fill}" d="${font.getPath(text, x, y, size).toPathData(2)}"/>`;
}

function previewSvg(body, width, height, fonts) {
  const markSize = Math.round(height * 0.46);
  const markX = Math.round(width * 0.09);
  const markY = Math.round((height - markSize) / 2);
  const textX = markX + markSize + Math.round(width * 0.05);
  const titleSize = Math.round(height * 0.19);
  const tagSize = Math.round(height * 0.075);
  const titleY = Math.round(height * 0.5);
  const tagY = titleY + Math.round(height * 0.14);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${TILE}"/>
  <g fill="${INK}" transform="translate(${markX} ${markY}) scale(${markSize / 64})">${body}</g>
  ${textPath(fonts.bold, "Idea Matrix", textX, titleY, titleSize, INK)}
  ${textPath(fonts.semibold, "Score your project ideas.", textX, tagY, tagSize, MUTED)}
</svg>`;
}

async function main() {
  const body = await markBody();
  const fonts = { bold: loadFont(700), semibold: loadFont(600) };
  const out = async (relative, data, base = WEB) => {
    const path = join(base, relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  };

  const favicons = await Promise.all(
    [16, 32, 48].map(async (size) => ({ size, data: await png(markSvg(body, size)) })),
  );
  await out("src/app/favicon.ico", ico(favicons));
  await out("src/app/apple-icon.png", await png(markSvg(body, 180, 28, TILE)));
  await out("public/icons/icon-192.png", await png(markSvg(body, 192, 30, TILE)));
  await out("public/icons/icon-512.png", await png(markSvg(body, 512, 80, TILE)));
  // Maskable: platforms may crop to a circle covering the central 80 %, so keep the mark well inside it.
  await out("public/icons/icon-maskable-512.png", await png(markSvg(body, 512, 128, TILE)));
  const preview = await png(previewSvg(body, 1200, 630, fonts));
  await out("src/app/opengraph-image.png", preview);
  await out("src/app/twitter-image.png", preview);
  await out("public/social-preview.png", await png(previewSvg(body, 1280, 640, fonts)));
  await out("icon.png", await png(markSvg(body, 512, 80, TILE)), MCP);
  console.log(
    "icons: favicon.ico, apple-icon.png, icons/ (192, 512, maskable), opengraph-image.png, twitter-image.png, social-preview.png, packages/mcp/icon.png",
  );
}

await main();
