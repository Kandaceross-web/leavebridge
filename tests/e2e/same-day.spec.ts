import { createHmac, randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import {
  PASSWORD,
  expectAccessible,
  expectNoHorizontalScroll,
  expectOneH1,
  freshIp,
  signIn,
} from "./helpers";

/** The server's HMAC (src/server/crypto.ts) with the fictional development secret. */
const hmac = (data: string) =>
  createHmac("sha256", process.env.HMAC_SECRET ?? "dev-only-hmac-secret-change-me")
    .update(data)
    .digest("hex");
const ownerDb = () =>
  new Pool({
    connectionString:
      process.env.E2E_DATABASE_OWNER_URL ??
      "postgres://lb_owner:lb_owner_dev@localhost:5432/leavebridge",
    max: 1,
  });

async function check(page: Page) {
  await expectOneH1(page);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
}

/**
 * The emailed link carries a random token whose HMAC is stored. The test cannot read the email from
 * the server process, so it issues its own link the same way and replaces the unused one.
 */
async function issueVerificationLink(email: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const pool = ownerDb();
  try {
    const { rows } = await pool.query<{ id: string }>(
      "select id from users where lower(email) = lower($1)",
      [email],
    );
    await pool.query(
      "delete from email_verification_tokens where user_id = $1 and used_at is null",
      [rows[0]!.id],
    );
    await pool.query(
      "insert into email_verification_tokens (user_id, token_hash, expires_at) values ($1, $2, now() + interval '1 hour')",
      [rows[0]!.id, hmac(`verify-email:${token}`)],
    );
  } finally {
    await pool.end();
  }
  return token;
}

test("same-day screening: sign up, confirm email, pay, answer, get a signed record and verify it publicly", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await freshIp(page);

  // Public service page.
  await page.goto("/work-school-excuses");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/missed work or school\?/i);
  await expect(page.getByText(/does not guarantee an excuse/i)).toBeVisible();
  await check(page);

  // Short availability check: location and safety only.
  await page.goto("/start?product=same-day");
  await check(page);
  await page.getByRole("button", { name: "Begin" }).click();
  await page.waitForURL(/\/start\/location/);
  await page.locator('input[name="age_18"][value="yes"]').check({ force: true });
  await page.locator('select[name="current_state"]').selectOption("MS");
  await page.locator('select[name="appointment_state"]').selectOption("MS");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/start\/safety/);
  await expect(page.getByText(/question set 2 of 2/i)).toBeVisible();
  await page.locator('input[name="safety_now"][value="no"]').check({ force: true });
  await page.getByRole("button", { name: /continue|see results/i }).click();
  await page.waitForURL(/\/start\/result/);
  await expect(page.getByText(/confirm your email address/i)).toBeVisible();
  await check(page);

  // Account.
  const email = `same-day-e2e-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}@example.test`;
  await page.getByRole("link", { name: /create your account/i }).click();
  await page.waitForURL(/\/sign-up/);
  await page.locator('input[name="firstName"]').fill("Jordan");
  await page.locator('input[name="lastName"]').fill("Examplecase");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('input[name="dateOfBirth"]').fill("1991-05-06");
  await page.locator('input[name="ageAttest"]').check();
  await page.locator('input[name="termsAccept"]').check();
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL(/\/portal\/screening\/[0-9a-f-]+\?welcome=1/);
  const screeningUrl = page.url().replace(/\?.*$/, "");
  await expect(page.getByText(/please confirm your email address/i)).toBeVisible();
  await check(page);

  // Email confirmation: opening the link does not use it; the button does.
  const token = await issueVerificationLink(email);
  await page.goto(`/verify-email/${token}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Confirm your email");
  await check(page);
  await page.getByRole("button", { name: /confirm my email/i }).click();
  await page.waitForURL(/\/verify-email\/done/);
  await page.goto(`/verify-email/${token}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /expired or was already used/i,
  );

  // Payment, with the written estimate and the acknowledgement.
  await page.goto(screeningUrl);
  await page.getByRole("link", { name: /review and pay/i }).click();
  await page.waitForURL(/\/pay$/);
  await expect(page.getByTestId("good-faith-estimate")).toBeVisible();
  await expect(page.getByText("$29.99").first()).toBeVisible();
  await check(page);
  await page.locator('input[name="acknowledge"]').check();
  await page.getByRole("button", { name: /continue to secure payment/i }).click();
  await page.waitForURL(/\/portal\/checkout\/simulated/);
  await page.getByRole("button", { name: /pay .*simulated/i }).click();
  await page.waitForURL(/\/portal\/screening\/[0-9a-f-]+/);
  await expect(page.getByText(/payment received/i)).toBeVisible();

  // Questionnaires.
  await page.locator('input[name="instruments"][value="gad7"]').check({ force: true });
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("link", { name: /start gad-7/i }).click();
  await page.waitForURL(/\/questionnaire\/gad7/);
  await check(page);
  for (let i = 1; i <= 7; i++)
    await page.locator(`input[name="gad7_${i}"][value="1"]`).check({ force: true });
  await page.getByRole("button", { name: /submit answers/i }).click();
  await page.waitForURL(/\/portal\/screening\/[0-9a-f-]+$/);

  await page.getByRole("link", { name: /^answer$/i }).click();
  await page.waitForURL(/\/work$/);
  await check(page);
  for (const [name, value] of [
    ["main_concerns", "worry"],
    ["symptom_duration", "2_4w"],
    ["difficulty", "somewhat"],
    ["work_status", "full"],
    ["work_effect", "somewhat_less"],
    ["work_areas", "focus"],
    ["safety_now", "no"],
  ]) {
    await page.locator(`input[name="${name}"][value="${value}"]`).check({ force: true });
  }
  await page.locator('input[name="missed_days"]').fill("1");
  await page.locator('input[name="partial_days"]').fill("0");
  await page.getByRole("button", { name: /save answers/i }).click();
  await page.waitForURL(/\/portal\/screening\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: /finish and get my record/i }).click();
  await page.waitForURL(/\?finished=1/);
  await expect(
    page.getByRole("heading", { name: "Automated Mental Health Screening Record" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /download pdf/i })).toBeVisible();
  await check(page);
  const number = (await page.locator(".kv .mono").first().innerText()).trim();
  expect(number).toMatch(/^LB-[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/);
  // Nothing about the person or their answers is in any URL.
  expect(page.url()).not.toMatch(/jordan|examplecase|gad|worry/i);

  // The PDF downloads as the signed file.
  const pdf = await page.request.get(
    (await page.getByRole("link", { name: /download pdf/i }).getAttribute("href"))!,
  );
  expect(pdf.status()).toBe(200);
  const body = await pdf.body();
  expect(body.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(body.toString("latin1")).toContain("/adbe.pkcs7.detached");

  // Optional follow-up: the patient can ask to be contacted about a full assessment.
  await page.getByRole("button", { name: /yes, please contact me/i }).click();
  await expect(
    page.getByText(/we will contact you to arrange your assessment/i).first(),
  ).toBeVisible();
  await check(page);

  // Public verification, signed out: status only, no health information or identity.
  await page.context().clearCookies();
  await page.goto("/verify");
  await check(page);
  await page.locator('input[name="documentNumber"]').fill(number.toLowerCase());
  await page.getByRole("button", { name: /check document/i }).click();
  await page.waitForURL(new RegExp(`/verify/${number}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "This document is genuine and valid",
  );
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/jordan|examplecase|1991|gad|worry|score/i);
  await check(page);

  // Comparing the downloaded copy confirms it is unchanged.
  await page
    .locator('input[name="copy"]')
    .setInputFiles({ name: "record.pdf", mimeType: "application/pdf", buffer: body });
  await page.getByRole("button", { name: /compare/i }).click();
  await expect(page.getByText(/identical to the issued document/i)).toBeVisible();

  await page.goto("/verify/LB-0000-0000-0000-0000-0000");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Document not found");
  await check(page);
});

test("ops: the same-day console shows counts and queues and passes accessibility checks", async ({
  page,
}) => {
  await signIn(page, "clinician@leavebridge.test", { staff: true });
  await page.goto("/ops/same-day");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Same-day screenings");
  await expect(page.getByRole("region", { name: /same-day screening totals/i })).toBeVisible();
  // The side navigation is collapsed into a menu on phones.
  if (test.info().project.name === "desktop")
    await expect(page.getByRole("link", { name: "Same-day screenings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  await check(page);
});
