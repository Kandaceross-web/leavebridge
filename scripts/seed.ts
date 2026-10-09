/**
 * Seeds reference data plus fictional staff, patients and cases (development and test only).
 * Every case after the first registration is driven through the real service layer.
 *
 *   npm run db:seed
 */
import { withActor } from "@/server/db/actor";
import { pool } from "@/server/db/client";
import { env } from "@/server/env";
import { seedReference, seedStaff, FIXTURE_PASSWORD, FIXTURE_STAFF, FIXTURE_TOTP_SECRET } from "@/server/fixtures/reference";
import { advanceClinical, advancePatient, registerPatient, runScreening, system } from "@/server/fixtures/journey";

async function main() {
  if (env.APP_ENV === "production" || env.APP_ENV === "staging") throw new Error("Refusing to seed fixtures outside development/test.");
  const existing = await withActor(system, (ctx) => ctx.tx.query.services.findFirst());
  if (existing) {
    console.log("Database already seeded. Run `npm run db:reset` for a clean slate.");
    return;
  }
  await withActor(system, (ctx) => seedReference(ctx));
  const staff = await withActor(system, (ctx) => seedStaff(ctx));

  const make = async (first: string, last: string, overrides: Record<string, string | string[]> = {}, email?: string) => {
    const { screening } = await runScreening(overrides);
    return registerPatient(screening, { first, last, email });
  };

  // One case at each meaningful stage, all fictional.
  await make("Ava", "Thompson");
  const ben = await make("Ben", "Carter");
  await advancePatient(ben, "consents_intake");
  const chloe = await make("Chloe", "Nguyen");
  await advancePatient(chloe, "submit");
  const demo = await make("Jordan", "Example", {}, "patient@leavebridge.test");
  await advancePatient(demo, "submit");
  await advanceClinical(staff, demo, "review_session");
  const erin = await make("Erin", "Park");
  await advancePatient(erin, "submit");
  await advanceClinical(staff, erin, "book");
  const farah = await make("Farah", "Haddad");
  await advancePatient(farah, "submit");
  await advanceClinical(staff, farah, "document");
  const grace = await make("Grace", "Liu");
  await advancePatient(grace, "submit");
  await advanceClinical(staff, grace, "deliver");
  const henry = await make("Henry", "Brooks", { previous_leave: "recert" });
  await advancePatient(henry, "consents_payment");
  const iris = await make("Iris", "Moreno");
  await advancePatient(iris, "submit", { safetyInIntake: true });
  // Ready to pay: shows the written Good Faith Estimate on the checkout step (e2e).
  const kai = await make("Kai", "Rivera", {}, "checkout@leavebridge.test");
  await advancePatient(kai, "consents_payment");

  console.log("Seeded fictional data.");
  console.log(`  Staff password: ${FIXTURE_PASSWORD}   TOTP secret: ${FIXTURE_TOTP_SECRET}`);
  for (const s of Object.values(FIXTURE_STAFF)) console.log(`  ${s.email.padEnd(32)} ${s.roles.join(", ")}`);
  console.log(`  patient@leavebridge.test         patient (case awaiting appointment)`);
  console.log(`  checkout@leavebridge.test        patient (case at the payment step)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
