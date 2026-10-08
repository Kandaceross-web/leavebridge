import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { withActor } from "@/server/db/actor";
import { currentScreening } from "@/server/services/screening";
import { getSetting } from "@/server/settings";
import { db } from "@/server/db/client";
import { OUTCOME_COPY } from "@/domain/screening/engine";
import { REASON_CODE_LABEL } from "@/config/screening";
import { ButtonLink, Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Your results" };

/** Reasons that are safe and useful to show the person (never clinical judgments). */
const PATIENT_REASON: Record<string, string> = {
  UNDER_18: "This service is for adults 18 and older.",
  STATE_NOT_ACTIVE: "We are not yet available in the state where you are now.",
  APPOINTMENT_STATE_NOT_ACTIVE: "We are not yet available in the state where you will be during your assessment.",
  NOT_OWN_CONDITION: "This service assesses your own health. Leave to care for a family member needs documentation from that person's provider.",
};

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
          <p className="small muted">We have not created an account or a case. When you are safe, you are welcome to come back.</p>
        </div>
      </div>
    );
  }
  const reasons = (row.reasonCodes ?? []).map((c) => PATIENT_REASON[c]).filter(Boolean) as string[];
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
                <span>Payment happens after you choose your service, before your intake opens.</span>
              </li>
              <li>
                <Icon name="check" />
                <span>A licensed clinician reviews everything and makes an independent decision.</span>
              </li>
            </ul>
            <div className="btn-row">
              <ButtonLink href="/sign-up">Create your account</ButtonLink>
              <ButtonLink href="/pricing" variant="quiet">
                Review pricing first
              </ButtonLink>
            </div>
          </>
        ) : (
          <div className="stack stack-sm">
            <p className="muted">
              If you need support now, your primary care provider or a local mental-health provider can help. If you are in crisis, call or text <a href="tel:988">988</a>.
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
        <p className="fine">Development note · rule codes: {row.reasonCodes.map((c) => REASON_CODE_LABEL[c] ?? c).join("; ")}</p>
      ) : null}
    </div>
  );
}
