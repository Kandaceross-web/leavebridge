import { createHmac, randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { expectAccessible, expectNoHorizontalScroll, freshIp } from "./helpers";

/** The server's HMAC (src/server/crypto.ts) with the fictional development secret. */
const hmac = (data: string) =>
  createHmac("sha256", process.env.HMAC_SECRET ?? "dev-only-hmac-secret-change-me")
    .update(data)
    .digest("hex");

type Answers = Record<string, string | string[]>;
const AVAILABLE: Answers = {
  age_18: "yes",
  current_state: "MS",
  appointment_state: "MS",
  safety_now: "no",
  reason: ["symptoms_affect_work"],
  own_condition: "yes",
  employer_type: "private",
  employment_length: "gte_12m",
  hours_worked: "24_plus",
  current_provider: "no",
  leave_type: "continuous",
  hr_contacted: "yes",
  has_form: "yes",
  provider_type_accepted: "any_licensed",
  previous_leave: "new",
};

async function answerVisible(page: Page, answers: Answers) {
  for (const [key, value] of Object.entries(answers)) {
    const select = page.locator(`select[name="${key}"]`);
    if (await select.count()) {
      await select.selectOption(String(value));
      continue;
    }
    for (const v of Array.isArray(value) ? value : [value]) {
      const input = page.locator(`input[name="${key}"][value="${v}"]`);
      if (await input.count()) await input.check({ force: true });
    }
  }
}

async function runScreening(page: Page, answers: Answers) {
  await freshIp(page);
  await page.goto("/start");
  await page.getByRole("button", { name: "Begin" }).click();
  await page.waitForURL(/\/start\/[a-z]+/);
  for (let i = 0; i < 8 && !page.url().includes("/start/result"); i++) {
    const before = page.url();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
    await answerVisible(page, answers);
    await page.getByRole("button", { name: /continue|see results/i }).click();
    await page.waitForURL((u) => u.toString() !== before);
  }
}

test("a person in a served state reaches the available outcome with neutral copy", async ({
  page,
}) => {
  await runScreening(page, AVAILABLE);
  await expect(page).toHaveURL(/\/start\/result/);
  await expect(page.getByRole("link", { name: /create your account/i })).toBeVisible();
  const text = (await page.locator("main").innerText()).toLowerCase();
  expect(text).not.toContain("you qualify");
  expect(text).not.toContain("approved");
  // Answers are never in the URL.
  expect(page.url()).not.toContain("MS");
  await expectAccessible(page);
});

test("an emergency answer stops the flow and shows crisis resources, never a sign-up", async ({
  page,
}) => {
  await runScreening(page, { ...AVAILABLE, safety_now: "yes" });
  await expect(page).toHaveURL(/\/start\/result/);
  await expect(page.locator('a[href^="tel:"]').first()).toBeVisible();
  await expect(page.getByRole("link", { name: /create your account/i })).toHaveCount(0);
  await expect(page.getByText(/not created an account or a case/i)).toBeVisible();
  await expectAccessible(page);
});

test("a person outside served states is told the service is not available", async ({ page }) => {
  await runScreening(page, { ...AVAILABLE, current_state: "AL", appointment_state: "AL" });
  await expect(page).toHaveURL(/\/start\/result/);
  await expect(page.getByRole("link", { name: /create your account/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "See where we serve" })).toBeVisible();

  // One-email waitlist offer, state preselected from the screening; only email and state are posted.
  const form = page.locator("form", { has: page.getByRole("button", { name: "Notify me" }) });
  await expect(page.getByText(/delete it after it is sent/i)).toBeVisible();
  await expect(form.getByLabel("State")).toHaveValue("AL");
  const fields = await form
    .locator("input:not([type=hidden]), select, textarea")
    .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).name));
  expect(fields.sort()).toEqual(["email", "stateCode"]);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  await form.getByLabel("Email").fill(`e2e-${Date.now()}@example.test`);
  await form.getByLabel("State").selectOption("AZ");
  await form.getByRole("button", { name: "Notify me" }).click();
  await expect(page.getByText(/we will email you if we begin serving that state/i)).toBeVisible();
  expect(page.url()).not.toContain("example.test");
});

test("an available result offers one optional continue link, with only an email field", async ({
  page,
}) => {
  await runScreening(page, AVAILABLE);
  await expect(page).toHaveURL(/\/start\/result/);
  const box = page.locator("section", {
    has: page.getByRole("heading", { name: "Not ready to create your account?" }),
  });
  await expect(box).toBeVisible();
  await expect(
    box.getByText(/do not keep it, and we will not send reminders or marketing/i),
  ).toBeVisible();
  await expect(box.getByText(/expires in 7 days/i)).toBeVisible();
  const form = box.locator("form");
  const fields = await form
    .locator("input:not([type=hidden]), select, textarea")
    .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).name));
  expect(fields).toEqual(["email"]);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  await form.getByLabel("Email").fill(`continue-${Date.now()}@example.test`);
  await form.getByRole("button", { name: "Email me a link to continue" }).click();
  await expect(page.getByText(/Sent\. Open the link in the email to continue/)).toBeVisible();
  expect(page.url()).not.toContain("example.test");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("a continue link restores the screening in a new browser once, then explains it was used", async ({
  page,
  context,
}) => {
  await runScreening(page, AVAILABLE);
  await expect(page).toHaveURL(/\/start\/result/);
  // The email goes to the in-memory dev outbox of the server process, so issue a link the way the
  // service stores one (HMAC of a token) for this browser's screening.
  const cookie = (await context.cookies()).find((c) => c.name === "lb_screening");
  expect(cookie).toBeTruthy();
  const token = randomBytes(32).toString("base64url");
  const pool = new Pool({
    connectionString:
      process.env.E2E_DATABASE_OWNER_URL ??
      "postgres://lb_owner:lb_owner_dev@localhost:5432/leavebridge",
    max: 1,
  });
  try {
    const { rows } = await pool.query<{ id: string }>(
      "select id from screenings where token_hash = $1",
      [hmac(`screening:${cookie!.value}`)],
    );
    expect(rows).toHaveLength(1);
    await pool.query(
      "insert into screening_continue_links (token_hash, screening_id, expires_at) values ($1, $2, now() + interval '7 days')",
      [hmac(`continue:${token}`), rows[0]!.id],
    );
  } finally {
    await pool.end();
  }

  await context.clearCookies();
  await page.goto(`/start/continue/${token}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Continue where you left off" }),
  ).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "Continue to create your account" }).click();
  await page.waitForURL(/\/sign-up/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Create your secure account" }),
  ).toBeVisible();

  await page.goto(`/start/continue/${token}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "This link has expired or was already used" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start again" })).toHaveAttribute("href", "/start");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});
