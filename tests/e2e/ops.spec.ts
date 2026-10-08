import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, expectOneH1, signIn } from "./helpers";

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
});

test("support staff cannot reach admin configuration or audit", async ({ page }) => {
  await signIn(page, "support@leavebridge.test", { staff: true });
  await page.goto("/ops/admin");
  await expect(page).toHaveURL(/denied=1|\/ops$|\/ops\?/);
  await page.goto("/ops/audit");
  await expect(page).not.toHaveURL(/\/ops\/audit/);
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
