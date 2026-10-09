import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { withActor } from "@/server/db/actor";
import { currentScreening, screeningState, type ScreeningRow } from "@/server/services/screening";
import { waitlistStates } from "@/server/services/contact";
import { getSetting } from "@/server/settings";
import { db } from "@/server/db/client";
import { OUTCOME_COPY } from "@/domain/screening/engine";
import { REASON_CODE_LABEL } from "@/config/screening";
import { ButtonLink, Icon } from "@/components/ui";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/forms";
import { waitlistAction } from "@/app/(site)/actions";
import { continueLinkAction } from "../actions";
import { continueLinkOffer } from "@/server/services/continue-link";

export const metadata: Metadata = { title: "Your results" };

/** Reasons that are safe and useful to show the person (never clinical judgments). */
const PATIENT_REASON: Record<string, string> = {
  UNDER_18: "This service is for adults 18 and older.",
  STATE_NOT_ACTIVE: "We are not yet available in the state where you are now.",
  APPOINTMENT_STATE_NOT_ACTIVE:
    "We are not yet available in the state where you will be during your assessment.",
  NOT_OWN_CONDITION:
    "This service assesses your own health. Leave to care for a family member needs documentation from that person's provider.",
};

/** Rule codes meaning the person's state is why we could not continue. */
const STATE_REASONS = ["STATE_NOT_ACTIVE", "APPOINTMENT_STATE_NOT_ACTIVE"];

/**
 * Waitlist offer for people stopped because their state is not served. The state is preselected
 * from their screening (appointment state, else current state), but the form only ever posts an
 * email and a state: no screening answer is sent or stored with it.
 */
async function waitlistOffer(row: ScreeningRow) {
  if (!row.reasonCodes.some((c) => STATE_REASONS.includes(c))) return null;
  const features = await getSetting(db, "features");
  if (!features.waitlist) return null;
  // Jurisdictions are public configuration (no PHI, no row-level security).
  const states = await waitlistStates(db);
  if (!states.length) return null;
  const listed = (code: unknown): code is string => typeof code === "string" && states.some((s) => s.code === code);
  let preselect = listed(row.stateCode) ? row.stateCode : undefined;
  if (!preselect) {
    const current = await withActor({ kind: "anonymous" }, async (ctx) => (await screeningState(ctx, row)).answers["current_state"]);
    if (listed(current)) preselect = current;
  }
  return { states, preselect };
}

export default async function ScreeningResultPage() {
  const row = await withActor({ kind: "anonymous" }, (ctx) => currentScreening(ctx));
  if (!row) redirect("/start?expired=1");
  if (row.status === "in_progress") redirect("/start/location");
  const outcome = row.outcome ?? "NOT_AVAILABLE";
  const copy = OUTCOME_COPY[outcome];
  if (outcome === "EMERGENCY") {
    const crisis = await getSetting(db, "crisis");
    return (
      <div className="container-narrow page stack stack-lg">
        <div className="card stack" style={{ borderColor: "var(--lb-navy)", borderWidth: 2 }}>
          <h1>{crisis.headline}</h1>
          <p className="lede">{crisis.body}</p>
          <ul className="list-plain">
            {crisis.resources.map((r) => (
              <li key={r.label} className="card-quiet">
                {r.href ? (
                  <a href={r.href} className="btn btn-primary">
                    {r.label}
                  </a>
                ) : (
                  <b>{r.label}</b>
                )}
                <p className="small mt-1">{r.detail}</p>
              </li>
            ))}
          </ul>
          <p className="small muted">
            We have not created an account or a case. When you are safe, you are welcome to come
            back.
          </p>
        </div>
      </div>
    );
  }
  const reasons = (row.reasonCodes ?? []).map((c) => PATIENT_REASON[c]).filter(Boolean) as string[];
  const waitlist = outcome === "NOT_AVAILABLE" ? await waitlistOffer(row) : null;
  // OWN-25 (Q48): one optional link back here for people who can continue but are not ready yet.
  const linkExpires = continueLinkOffer(row);
  return (
    <div className="container-narrow page stack stack-lg">
      <div className="card stack">
        <p className="eyebrow">Your results</p>
        <h1>{copy.title}</h1>
        <p className="lede">{copy.body}</p>
        {outcome === "NOT_AVAILABLE" && reasons.length ? (
          <ul className="list-check">
            {reasons.map((r) => (
              <li key={r}>
                <Icon name="info" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {outcome === "AVAILABLE" || outcome === "NEEDS_REVIEW" ? (
          <>
            <ul className="list-check">
              <li>
                <Icon name="check" />
                <span>Next, create your secure account and verify your identity.</span>
              </li>
              <li>
                <Icon name="check" />
                <span>
                  Payment happens after you choose your service, before your intake opens.
                </span>
              </li>
              <li>
                <Icon name="check" />
                <span>
                  A licensed clinician reviews everything and makes an independent decision.
                </span>
              </li>
            </ul>
            <div className="btn-row">
              <ButtonLink href="/sign-up">Create your account</ButtonLink>
              <ButtonLink href="/pricing" variant="quiet">
                Review pricing first
              </ButtonLink>
            </div>
            {linkExpires ? (
              <section className="card-flat stack stack-sm" aria-labelledby="continue-title">
                <h2 id="continue-title">Not ready to create your account?</h2>
                <p className="muted">
                  We can email you one link that brings you back here without answering the
                  questions again. It works once and expires {linkExpires}. Your answers are not in
                  the email. We use your address only to send it and do not keep it, and we will not
                  send reminders or marketing. This is optional.
                </p>
                <ActionForm action={continueLinkAction}>
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                  />
                  <SubmitButton variant="secondary" pendingText="Sending…">
                    Email me a link to continue
                  </SubmitButton>
                </ActionForm>
              </section>
            ) : null}
          </>
        ) : (
          <div className="stack stack-sm">
            {waitlist ? (
              <section className="card-flat stack stack-sm" aria-labelledby="waitlist-title">
                <h2 id="waitlist-title">Hear when we open in your state</h2>
                <p className="muted">
                  Leave your email and we will send you one email when LeaveBridge Health starts
                  serving your state. We use your email only for that and delete it after it is
                  sent. Your screening answers are not saved with it.
                </p>
                <ActionForm action={waitlistAction}>
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                  />
                  <SelectField
                    name="stateCode"
                    label="State"
                    options={waitlist.states.map((s) => ({ value: s.code, label: s.name }))}
                    placeholder="Choose a state"
                    defaultValue={waitlist.preselect}
                    required
                  />
                  <SubmitButton pendingText="Saving…">Notify me</SubmitButton>
                </ActionForm>
              </section>
            ) : null}
            <p className="muted">
              If you need support now, your primary care provider or a local mental-health provider
              can help. If you are in crisis, call or text <a href="tel:988">988</a>.
            </p>
            <div className="btn-row">
              <ButtonLink href="/availability" variant="secondary">
                See where we serve
              </ButtonLink>
              <ButtonLink href="/" variant="quiet">
                Back to home
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
      {process.env.APP_ENV !== "production" && row.reasonCodes?.length ? (
        <p className="fine">
          Development note · rule codes:{" "}
          {row.reasonCodes.map((c) => REASON_CODE_LABEL[c] ?? c).join("; ")}
        </p>
      ) : null}
    </div>
  );
}
