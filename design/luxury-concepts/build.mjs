// Builds the three concept pages and their screenshots.
// Usage: node design/luxury-concepts/build.mjs [--shots]
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { conceptA } from "./concept-a.mjs";
import { conceptB } from "./concept-b.mjs";
import { conceptC } from "./concept-c.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pages = { "concept-a": conceptA(), "concept-b": conceptB(), "concept-c": conceptC() };
const full = (body) =>
  `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex">\n${body.replace(/<\/style>/, "</style></head><body>")}\n</body></html>\n`;
for (const [name, body] of Object.entries(pages)) writeFileSync(join(here, `${name}.html`), full(body));

if (process.argv.includes("--shots")) {
  const { chromium } = await import("playwright");
  const out = join(here, "screenshots");
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const name of Object.keys(pages)) {
    for (const [label, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: label === "mobile" ? 2 : 1 });
      await page.goto("file://" + join(here, `${name}.html`), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 0) console.warn(`${name} ${label}: horizontal overflow ${overflow}px`);
      await page.screenshot({ path: join(out, `${name}-${label}-hero.png`) });
      await page.screenshot({ path: join(out, `${name}-${label}-full.png`), fullPage: true });
      await page.close();
    }
  }
  await browser.close();
}
