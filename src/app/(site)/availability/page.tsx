import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/forms";
import { ButtonLink, Empty, PageHead } from "@/components/ui";
import { db } from "@/server/db/client";
import { waitlistStates } from "@/server/services/contact";
import { activeStates, siteSettings, statePages, stateSlug } from "@/server/web/public";
import { waitlistAction } from "../actions";
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "Where we serve",
  description: "The states where LeaveBridge Health clinicians currently provide care, and why your physical location matters.",
};

export default async function AvailabilityPage() {
  const [{ features }, states, pages] = await Promise.all([siteSettings(), activeStates(), statePages()]);
  const withPage = new Set(pages.map((p) => p.slug));
  // Jurisdictions are public configuration (no PHI, no row-level security).
  const others = features.waitlist ? await waitlistStates(db) : [];
  return (
    <div className="container page stack stack-xl">
      <PageHead
        eyebrow="Availability"
        title="Where we serve"
        lede="Clinicians can only provide care to people who are physically located in a state where they are licensed."
      />

      <section className="stack" aria-labelledby="states-title">
        <h2 id="states-title">States we currently serve</h2>
        {states.length ? (
          <ul className={styles.stateList}>
            {states.map((s) => (
              <li key={s.code}>{withPage.has(stateSlug(s.name)) ? <Link href={`/states/${stateSlug(s.name)}`}>{s.name}</Link> : s.name}</li>
            ))}
          </ul>
        ) : (
          <Empty title="We are not serving any states yet">Please check back soon.</Empty>
        )}
      </section>

      <div className="grid g2">
        <section className="card-flat stack stack-sm" aria-labelledby="location-title">
          <h2 id="location-title">Your location during care matters</h2>
          <p className="muted">
            What counts is where you are physically located when you receive care, not where you live, work or are registered. You will confirm your location
            when you create an account and again before any video assessment.
          </p>
          <p className="muted">If you will be travelling, complete your assessment while you are in a state we serve.</p>
        </section>
        <section className="card stack stack-sm" aria-labelledby="check-title">
          <h2 id="check-title">Check if we can help</h2>
          <p className="muted">A few quick questions confirm your location and whether this service fits what you need.</p>
          <div>
            <ButtonLink href="/start?entry=availability">Start screening</ButtonLink>
          </div>
        </section>
      </div>

      {features.waitlist && others.length ? (
        <section className="grid g2" aria-labelledby="waitlist-title">
          <div className="stack stack-sm">
            <h2 id="waitlist-title">Not in your state yet?</h2>
            <p className="muted">Leave your email and we will let you know if we begin serving your state. We only use it for that.</p>
          </div>
          <div className="card">
            <ActionForm action={waitlistAction}>
              <TextField name="email" label="Email" type="email" autoComplete="email" maxLength={254} required />
              <SelectField
                name="stateCode"
                label="State"
                options={others.map((s) => ({ value: s.code, label: s.name }))}
                placeholder="Choose a state"
                required
              />
              <SubmitButton pendingText="Saving…">Notify me</SubmitButton>
            </ActionForm>
          </div>
        </section>
      ) : null}
    </div>
  );
}
