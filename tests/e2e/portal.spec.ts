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

  for (const path of ["/portal/messages", "/portal/documents", "/portal/notifications", "/portal/account"]) {
    await page.goto(path);
    await expectOneH1(page);
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  }
  await page.goto("/portal/messages");
  await expect(page.getByText(/not for emergencies|emergenc/i).first()).toBeVisible();
});

test("checkout shows the written Good Faith Estimate before payment, with a printable and savable copy", async ({ page }) => {
  // Fictional fixture at the payment step (scripts/seed.ts).
  await signIn(page, "checkout@leavebridge.test");
  await page.locator('a[href^="/portal/cases/"]').first().click();
  await page.waitForURL(/\/portal\/cases\/[0-9a-f-]{36}/);
  const casePath = new URL(page.url()).pathname.match(/^\/portal\/cases\/[0-9a-f-]{36}/)![0];
  await page.goto(`${casePath}/checkout`);

  await expect(page.getByRole("heading", { name: "Good Faith Estimate" })).toBeVisible();
  const estimate = page.getByTestId("good-faith-estimate");
  await expect(estimate).toBeVisible();
  const text = await estimate.innerText();
  expect(text).toContain("$279.99");
  expect(text).toContain("Not applicable: this assessment is not billed to insurance");
  expect(text).toMatch(/only an estimate/i);
  expect(text).toMatch(/scheduled separately/i);
  expect(text).toMatch(/\$400 or more/);
  expect(text).toMatch(/cms\.gov\/nosurprises/);
  expect(text).toMatch(/will not affect the quality of the care/i);
  expect(text).toMatch(/not a contract/i);

  // The estimate is on the page, above the button that opens payment.
  const pay = page.getByRole("button", { name: /continue to secure payment/i });
  await expect(pay).toBeVisible();
  expect((await estimate.boundingBox())!.y).toBeLessThan((await pay.boundingBox())!.y);
  expect(page.url()).not.toMatch(/kai|rivera|estimate=/i);
  await expectOneH1(page);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  const pdfHref = await page.getByRole("link", { name: "Download PDF" }).getAttribute("href");
  expect(pdfHref).toMatch(/^\/api\/estimates\/[0-9a-f-]{36}$/);
  const pdf = await page.request.get(pdfHref!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");

  await page.getByRole("link", { name: /printable copy/i }).click();
  await page.waitForURL(/\/estimate$/);
  await expect(page.getByTestId("good-faith-estimate")).toBeVisible();
  await expect(page.getByRole("button", { name: /print or save as pdf/i })).toBeVisible();
  await expectOneH1(page);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
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
