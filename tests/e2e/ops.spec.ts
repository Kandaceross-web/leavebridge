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

test("the monthly security review reminder links to the review panel, and recording a review clears it", async ({ page }) => {
  await signIn(page, "director@leavebridge.test", { staff: true });
  await page.goto("/ops");
  const reminder = page.getByRole("link", { name: "Review the audit log and access grants" });
  // The database is reset before the run, so the first project sees the reminder; a later project
  // runs after a review was recorded and goes to the panel directly.
  if (await reminder.isVisible()) {
    await expect(page.getByText("Monthly security review due.")).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
    await reminder.click();
    await page.waitForURL(/\/ops\/admin\/security-review/);
  } else {
    await page.goto("/ops/admin/security-review");
  }
  await expectOneH1(page);
  await expect(page.getByRole("heading", { name: "Last 30 days" })).toBeVisible();
  await expect(page.getByText("Emergency access approved")).toBeVisible();
  await expect(page.getByText("Intact", { exact: true })).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  await page.getByLabel("Note (optional)").fill("Fictional e2e review: nothing to follow up.");
  await page.getByRole("button", { name: "Record review done" }).click();
  await expect(page.getByText("Monthly security review recorded.")).toBeVisible();
  await expect(page.getByText(/Last review recorded/)).toBeVisible();
  await expectAccessible(page);

  await page.goto("/ops");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review the audit log and access grants" })).toHaveCount(0);
});

test("support staff see no security review reminder and cannot open the panel", async ({ page }) => {
  await signIn(page, "support@leavebridge.test", { staff: true });
  await expect(page.getByText("Monthly security review due.")).toHaveCount(0);
  await page.goto("/ops/admin/security-review");
  await expect(page).not.toHaveURL(/\/ops\/admin\/security-review/);
});
