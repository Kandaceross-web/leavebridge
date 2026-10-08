import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const PASSWORD = "Fictional-Dev-Pass-1";
const TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

function base32(s: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.replace(/=+$/, "")) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function totp(now = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const h = createHmac("sha1", base32(TOTP_SECRET)).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  const code = (h.readUInt32BE(o) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/** Each test gets its own client IP so per-IP rate limits do not bleed between tests. */
export async function freshIp(page: Page) {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
}

export async function signIn(page: Page, email: string, opts: { staff?: boolean } = {}) {
  await freshIp(page);
  await page.goto(opts.staff ? "/sign-in?staff=1" : "/sign-in");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  if (opts.staff) {
    await page.waitForURL(/\/mfa/);
    await page.locator('input[name="code"]').fill(totp());
    await page.getByRole("button", { name: /verify|continue/i }).click();
    await page.waitForURL(/\/ops/);
  } else {
    await page.waitForURL(/\/portal/);
  }
}

/** Fails on serious or critical WCAG 2.x A/AA violations. */
export async function expectAccessible(page: Page) {
  // Metadata streams in after navigation; wait for it so document-title is checked on the settled page.
  await expect(page).toHaveTitle(/LeaveBridge/);
  const results = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
}

export async function expectNoHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll).toBeLessThanOrEqual(client + 1);
}

export async function expectOneH1(page: Page) {
  await expect(page.locator("h1")).toHaveCount(1);
}
