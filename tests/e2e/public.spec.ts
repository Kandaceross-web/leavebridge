import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, expectOneH1, freshIp } from "./helpers";

const PAGES = [
  "/",
  "/work-school-excuses",
  "/fmla-evaluations",
  "/how-it-works",
  "/services",
  "/pricing",
  "/employers",
  "/faq",
  "/resources",
  "/resources/who-can-complete-fmla-forms",
  "/states/mississippi",
  "/states/tennessee",
  "/states/georgia",
  "/states/minnesota",
  "/states/ohio",
  "/resources/fmla-basics-check",
  "/for-therapists",
  "/contact",
  "/about",
  "/credentials",
  "/availability",
  "/crisis",
  "/accessibility",
  "/start",
  "/sign-in",
  "/sign-up",
];

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

test("home answers what, who, how, cost, next steps and what is not guaranteed", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /your health matters\. your time does, too\./i,
  );
  await expect(page.getByRole("heading", { name: /how can we help/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /a simpler way to get started/i })).toBeVisible();
  await expect(page.getByText("$29.99").first()).toBeVisible();
  await expect(page.getByText("$279.99").first()).toBeVisible();
  await expect(page.getByText(/does not guarantee an excuse/i).first()).toBeVisible();
  await expect(
    page.getByText(/employer approval are separate determinations/i).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /licensed across five states/i }),
  ).toBeVisible();
  await expect(page.getByText("LPC-S | License #2581")).toBeVisible();
  const text = (await page.locator("main").innerText()).toLowerCase();
  for (const banned of ["guaranteed approval", "you qualify", "get approved"])
    expect(text).not.toContain(banned);
  await expect(page.getByRole("link", { name: /request an evaluation/i }).first()).toHaveAttribute(
    "href",
    "/work-school-excuses",
  );
  await expect(page.getByRole("link", { name: /begin your evaluation/i }).first()).toHaveAttribute(
    "href",
    "/fmla-evaluations",
  );
});

test("service pages lead to the right start link and the old same-day URL redirects", async ({
  page,
}) => {
  await page.goto("/services/same-day-mental-health-assessment");
  await expect(page).toHaveURL(/\/work-school-excuses$/);
  await expect(page.getByRole("link", { name: /request an excuse evaluation/i })).toHaveAttribute(
    "href",
    /\/start\?product=same-day/,
  );
  await page.goto("/fmla-evaluations");
  await expect(
    page.getByRole("link", { name: /begin your confidential evaluation/i }),
  ).toHaveAttribute("href", /\/start\?entry=fmla/);
});

test("guides and state pages carry structured data, review tags and no doorway pages", async ({
  page,
  request,
}) => {
  await page.goto("/resources");
  await page
    .getByRole("link", { name: /who can complete fmla paperwork/i })
    .first()
    .click();
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
    if (r.method() !== "GET" || /[?&](size|months|hours)=/.test(r.url()))
      sent.push(`${r.method()} ${r.url()}`);
  });
  for (const group of await page.locator("fieldset").all())
    await group.getByText("Yes", { exact: true }).click();
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

test("credentials: five cards on the homepage, full details with the Georgia privilege basis on /credentials", async ({
  page,
}) => {
  await page.goto("/");
  const cards = page.locator(".cred-card");
  await expect(cards).toHaveCount(5);
  await expect(cards.nth(0)).toContainText("LPC-S | License #2581");
  await expect(cards.nth(1)).toContainText("LPC-MHSP | License #7583");
  await expect(cards.nth(2)).toHaveText(/^\s*Georgia\s*LPC-GA-3372\s*$/i);
  await expect(cards.nth(3)).toHaveText(/^\s*Minnesota\s*LPC-MN-3470\s*$/i);
  await expect(cards.nth(4)).toHaveText(/^\s*Ohio\s*LPC-OH-3471\s*$/i);
  await expect(page.locator(".cred-cards")).not.toContainText("Counseling Compact");
  await expect(page.getByText("View Full Professional Credentials")).toHaveCount(0);
  await page.goto("/credentials");
  const panel = page.locator(".cred-panel");
  await expect(panel).toContainText("Privilege #LPC-GA-3372");
  await expect(panel).toContainText("Privilege #LPC-MN-3470");
  await expect(panel).toContainText("Privilege #LPC-OH-3471");
  await expect(panel).toContainText("practicing under a Counseling Compact privilege");
  await expect(panel).toContainText("Home State: Tennessee");
  await expect(panel).toContainText("National Certified Counselor (NCC)");
});
