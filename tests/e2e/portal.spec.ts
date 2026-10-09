import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, expectOneH1, freshIp, signIn } from "./helpers";

test("signed-out visitors are sent to sign in from the portal and ops", async ({ page }) => {
  await freshIp(page);
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto("/ops");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("a patient sees their case with neutral status language and accessible pages", async ({ page }) => {
  await signIn(page, "patient@leavebridge.test");
  await expectOneH1(page);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  await page.locator('a[href^="/portal/cases/"]').first().click();
  await page.waitForURL(/\/portal\/cases\/[0-9a-f-]{36}/);
  // Only an opaque id in the URL.
  expect(new URL(page.url()).search).not.toMatch(/name|state|diagnos/i);
  await expectOneH1(page);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  const text = (await page.locator("main").innerText()).toLowerCase();
  for (const banned of ["approved", "qualified", "certified", "guaranteed"]) expect(text).not.toContain(banned);

  // CLN-05: completed questionnaires show the patient their own total score, never a severity label.
  const caseId = page.url().match(/\/portal\/cases\/([0-9a-f-]{36})/)![1];
  await page.goto(`/portal/cases/${caseId}/measures`);
  await expect(page.getByText(/Your score: \d+ out of 27/)).toBeVisible();
  await expect(page.getByText(/A score is not a diagnosis/)).toBeVisible();
  expect((await page.locator("main").innerText()).toLowerCase()).not.toMatch(/moderately severe|severe|mild|minimal/);
  await expectAccessible(page);

  for (const path of ["/portal/messages", "/portal/documents", "/portal/notifications", "/portal/account"]) {
    await page.goto(path);
    await expectOneH1(page);
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  }
  await page.goto("/portal/messages");
  await expect(page.getByText(/not for emergencies|emergenc/i).first()).toBeVisible();
});

test("a patient cannot open the operations console", async ({ page }) => {
  await signIn(page, "patient@leavebridge.test");
  await page.goto("/ops");
  await expect(page).not.toHaveURL(/\/ops/);
});

test("a patient cannot open a case id that is not theirs", async ({ page }) => {
  await signIn(page, "patient@leavebridge.test");
  const res = await page.goto("/portal/cases/00000000-0000-4000-8000-000000000000");
  expect(res?.status()).toBe(404);
});

test("file downloads require a session", async ({ request }) => {
  const res = await request.get("/api/files/00000000-0000-4000-8000-000000000000");
  expect([401, 404]).toContain(res.status());
});
