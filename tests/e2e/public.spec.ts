import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, expectOneH1, freshIp } from "./helpers";

const PAGES = ["/", "/how-it-works", "/services", "/pricing", "/employers", "/faq", "/contact", "/about", "/availability", "/crisis", "/start", "/sign-in", "/sign-up"];

for (const path of PAGES) {
  test(`public page ${path} is accessible and fits the viewport`, async ({ page }) => {
    await freshIp(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expectOneH1(page);
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });
}

test("home answers what, who, how, cost, next steps and what is not guaranteed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: /who this is for/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /how it works|seven steps/i }).first()).toBeVisible();
  await expect(page.getByText("$275").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /doesn.t guarantee/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /your next step/i })).toBeVisible();
  const text = (await page.locator("main").innerText()).toLowerCase();
  for (const banned of ["guaranteed approval", "you qualify", "get approved"]) expect(text).not.toContain(banned);
});

test("security headers are present and app paths are not cacheable", async ({ request }) => {
  const home = await request.get("/");
  const csp = home.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toMatch(/script-src 'self' 'nonce-/);
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  const signIn = await request.get("/sign-in");
  expect(signIn.headers()["cache-control"]).toContain("no-store");
});

test("unknown pages return 404", async ({ page }) => {
  const res = await page.goto("/definitely-not-a-page");
  expect(res?.status()).toBe(404);
});
