import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, expectOneH1, freshIp } from "./helpers";

const PAGES = ["/", "/how-it-works", "/services", "/pricing", "/employers", "/faq", "/resources", "/resources/who-can-complete-fmla-forms", "/states/mississippi", "/states/tennessee", "/resources/fmla-basics-check", "/for-therapists", "/contact", "/about", "/availability", "/crisis", "/start", "/sign-in", "/sign-up"];

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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/your wellbeing deserves exceptional care/i);
  await expect(page.getByRole("heading", { name: /who it is for/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /three stages/i })).toBeVisible();
  await expect(page.getByText("$279.99").first()).toBeVisible();
  await expect(page.getByText(/payment does not guarantee/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /clinical credentials|accountable care/i })).toBeVisible();
  await expect(page.getByText(/license no\. 2581/i)).toBeVisible();
  await expect(page.getByText(/your next step/i)).toBeVisible();
  const text = (await page.locator("main").innerText()).toLowerCase();
  for (const banned of ["guaranteed approval", "you qualify", "get approved"]) expect(text).not.toContain(banned);
  await expect(page.getByRole("link", { name: /begin your assessment/i }).first()).toHaveAttribute("href", /\/start\?entry=/);
});

test("guides and state pages carry structured data, review tags and no doorway pages", async ({ page, request }) => {
  await page.goto("/resources");
  await page.getByRole("link", { name: /who can complete fmla paperwork/i }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/who can complete/i);
  await expect(page.getByText("LEGAL_REVIEW_REQUIRED")).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld ?? "{}")["@type"]).toBe("Article");
  expect(ld).not.toMatch(/aggregateRating|review/i);

  await page.goto("/states/tennessee");
  await expect(page.locator("main").getByText(/855-274-7471/)).toBeVisible();
  // A state with no state-specific content has no page.
  expect((await request.get("/states/alabama")).status()).toBe(404);

  const home = await request.get("/");
  const html = await home.text();
  expect(html).toContain('"@type":"MedicalBusiness"');
  expect(html).not.toMatch(/aggregateRating/);
  // Non-production hosts are never indexable.
  expect(await (await request.get("/robots.txt")).text()).toMatch(/Disallow: \/\s*$/m);
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/states/mississippi");
});

test("the FMLA basics check runs in the browser and sends nothing", async ({ page }) => {
  await page.goto("/resources/fmla-basics-check");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const sent: string[] = [];
  // Link prefetches (GET page loads) are expected; anything carrying the answers is not.
  page.on("request", (r) => {
    if (r.method() !== "GET" || /[?&](size|months|hours)=/.test(r.url())) sent.push(`${r.method()} ${r.url()}`);
  });
  for (const group of await page.locator("fieldset").all()) await group.getByText("Yes", { exact: true }).click();
  await expect(page.getByRole("heading", { name: /fmla may apply/i })).toBeVisible();
  await page.locator("fieldset").first().getByText("No", { exact: true }).click();
  await expect(page.getByRole("heading", { name: /may not apply/i })).toBeVisible();
  expect(sent).toEqual([]);
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
