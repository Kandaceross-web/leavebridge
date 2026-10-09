import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, expectOneH1, freshIp, signIn } from "./helpers";

test("staff sign-in requires a second factor and lands on the console", async ({ page }) => {
  await signIn(page, "director@leavebridge.test", { staff: true });
  await expectOneH1(page);
  await expectAccessible(page);
});

test("clinician pages are accessible and fit the viewport", async ({ page }) => {
  await signIn(page, "director@leavebridge.test", { staff: true });
  for (const path of ["/ops", "/ops/board", "/ops/cases", "/ops/schedule", "/ops/safety"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expectOneH1(page);
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  }
  await page.goto("/ops/cases");
  const first = page.locator('a[href^="/ops/cases/"]').first();
  await first.click();
  await page.waitForURL(/\/ops\/cases\/[0-9a-f-]{36}/);
  await expectOneH1(page);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  // Issued Good Faith Estimates are part of the record staff can see.
  await page.goto(`${new URL(page.url()).pathname}?tab=payments`);
  await expect(page.getByRole("heading", { name: "Good Faith Estimates" })).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("support staff cannot reach admin configuration or audit", async ({ page }) => {
  await signIn(page, "support@leavebridge.test", { staff: true });
  await page.goto("/ops/admin");
  await expect(page).toHaveURL(/denied=1|\/ops$|\/ops\?/);
  await page.goto("/ops/audit");
  await expect(page).not.toHaveURL(/\/ops\/audit/);
});

test("the waitlist page shows counts by state, never addresses, and is accessible", async ({ page }) => {
  // Someone joins the waitlist from the public availability page.
  await freshIp(page);
  await page.goto("/availability");
  const email = `ops-e2e-${Date.now()}@example.test`;
  await page.locator('input[name="email"]').fill(email);
  await page.locator('select[name="stateCode"]').selectOption("AK");
  await page.getByRole("button", { name: "Notify me" }).click();
  await expect(page.getByText(/we will email you if we begin serving that state/i)).toBeVisible();

  await signIn(page, "director@leavebridge.test", { staff: true });
  const res = await page.goto("/ops/admin/waitlist");
  expect(res?.status()).toBe(200);
  await expectOneH1(page);
  const row = page.getByRole("row", { name: /Alaska/ });
  await expect(row).toBeVisible();
  await expect(row.getByRole("cell").nth(1)).not.toHaveText("0");
  const text = await page.locator("main").innerText();
  expect(text).not.toContain("@");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("support staff cannot open the waitlist page", async ({ page }) => {
  await signIn(page, "support@leavebridge.test", { staff: true });
  await page.goto("/ops/admin/waitlist");
  await expect(page).not.toHaveURL(/\/ops\/admin\/waitlist/);
});

test("admin configuration pages are accessible", async ({ page }) => {
  await signIn(page, "admin@leavebridge.test", { staff: true });
  for (const path of ["/ops/admin", "/ops/audit", "/ops/billing"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expectOneH1(page);
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  }
});
