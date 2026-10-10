// Screenshots of the implemented "Maison" design against a local server on fictional data.
//   node design/luxury-concepts/site-shots.mjs http://localhost:3200 <outdir>
import { chromium } from "@playwright/test";
import { join } from "node:path";

const [base = "http://localhost:3200", out = "screenshots/site"] = process.argv.slice(2);
const PAGES = ["/", "/services", "/how-it-works", "/pricing", "/about", "/faq", "/start", "/sign-in"];
const SIZES = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
for (const [label, viewport] of Object.entries(SIZES)) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: label === "mobile" ? 2 : 1 });
  for (const path of PAGES) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const name = path === "/" ? "home" : path.slice(1).replace(/\//g, "-");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    // eslint-disable-next-line no-console -- design preview script
    if (overflow > 0) console.warn(`${name} ${label}: horizontal overflow ${overflow}px`);
    await page.screenshot({ path: join(out, `${name}-${label}.png`), fullPage: true });
  }
  await page.close();
}
await browser.close();
