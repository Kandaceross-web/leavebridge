import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, expectOneH1, signIn } from "./helpers";

/**
 * Video visits with the stub provider (the default outside production): the join check runs, and the page says
 * plainly that video is not configured. The seed books visit@leavebridge.test a visit that is open now.
 */
test("a patient confirms their state and joins the visit page; without video configured it says so", async ({ page }) => {
  await signIn(page, "visit@leavebridge.test");
  await page.locator('a[href^="/portal/cases/"]').first().click();
  await page.waitForURL(/\/portal\/cases\/[0-9a-f-]{36}/);
  const casePath = new URL(page.url()).pathname.match(/^\/portal\/cases\/[0-9a-f-]{36}/)![0];

  await page.goto(`${casePath}/appointment`);
  const go = page.getByRole("link", { name: "Go to video visit" });
  await expect(go).toHaveAttribute("href", `${casePath}/visit`);
  await go.click();
  await page.waitForURL(new RegExp(`${casePath}/visit$`));
  // Only an opaque id in the URL.
  expect(new URL(page.url()).search).toBe("");
  await expectOneH1(page);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  // Join check: a state the clinician can't serve is refused.
  await page.getByLabel("Which state are you physically in right now?").selectOption("WY");
  await page.getByRole("button", { name: "Join visit" }).click();
  await expect(page.getByText(/only meet with you while you are physically located/)).toBeVisible();

  await page.getByLabel("Which state are you physically in right now?").selectOption("MS");
  await page.getByRole("button", { name: "Join visit" }).click();
  await expect(page.getByTestId("video-not-configured")).toBeVisible();
  await expect(page.getByTestId("video-room")).toHaveCount(0);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("the stub build does not open the CSP to the video service", async ({ page }) => {
  await signIn(page, "visit@leavebridge.test");
  await page.locator('a[href^="/portal/cases/"]').first().click();
  await page.waitForURL(/\/portal\/cases\/[0-9a-f-]{36}/);
  const casePath = new URL(page.url()).pathname.match(/^\/portal\/cases\/[0-9a-f-]{36}/)![0];
  const res = await page.goto(`${casePath}/visit`);
  const csp = res?.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("connect-src 'self'");
  expect(csp).not.toContain("chime");
});

test("the booked clinician opens the visit from the schedule; other patients can't reach it", async ({ page, browser }) => {
  await signIn(page, "clinician@leavebridge.test", { staff: true });
  await page.goto("/ops/schedule");
  const link = page.getByRole("link", { name: "Video visit" }).first();
  const href = (await link.getAttribute("href"))!;
  expect(href).toMatch(/^\/ops\/visits\/[0-9a-f-]{36}$/);
  await link.click();
  await page.waitForURL(/\/ops\/visits\/[0-9a-f-]{36}$/);
  await expectOneH1(page);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  // Only the case reference, never the patient's name, on the clinician's visit page title.
  expect(await page.title()).not.toMatch(/Lee|Morgan/);

  // The fixture visit is open now (it is the earliest on the schedule).
  await page.getByRole("button", { name: "Join visit" }).click();
  await expect(page.getByTestId("video-not-configured")).toBeVisible();
  await expectAccessible(page);

  // A patient who doesn't own the visit gets a 404 or is sent away; the ops page is staff-only.
  const other = await browser.newPage();
  await signIn(other, "patient@leavebridge.test");
  await other.goto(href);
  await expect(other).not.toHaveURL(new RegExp(`${href}$`));
  await other.close();
});
