import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, freshIp } from "./helpers";

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

test("a person in a served state reaches the available outcome with neutral copy", async ({ page }) => {
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

test("an emergency answer stops the flow and shows crisis resources, never a sign-up", async ({ page }) => {
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
  const fields = await form.locator("input:not([type=hidden]), select, textarea").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).name));
  expect(fields.sort()).toEqual(["email", "stateCode"]);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  await form.getByLabel("Email").fill(`e2e-${Date.now()}@example.test`);
  await form.getByLabel("State").selectOption("GA");
  await form.getByRole("button", { name: "Notify me" }).click();
  await expect(page.getByText(/we will email you if we begin serving that state/i)).toBeVisible();
  expect(page.url()).not.toContain("example.test");
});
