import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Banner, PageHead } from "@/components/ui";
import { CONTACT_TOPICS } from "@/server/services/contact";
import { siteSettings } from "@/server/web/public";
import { contactAction } from "../actions";
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Reach LeaveBridge Health support about general questions, billing, technical help, employer services or privacy.",
};

export default async function ContactPage() {
  const { brand, crisis } = await siteSettings();
  const urgent = crisis.resources.filter((r) => r.href);
  return (
    <div className="container page stack stack-xl">
      <PageHead eyebrow="Contact" title="Contact us" lede="Questions about the service, billing or your account? We reply by email." />

      <Banner tone="safety" icon="alert">
        <b>Not for emergencies, and please do not include health details.</b> This form is not monitored in real time. If you are in crisis,{" "}
        {urgent.map((r, i) => (
          <span key={r.label}>
            {i > 0 ? " or " : ""}
            <a href={r.href}>{r.label.charAt(0).toLowerCase() + r.label.slice(1)}</a>
          </span>
        ))}
        . <Link href="/crisis">More crisis resources</Link>. If you are a patient, use secure messaging in your portal for anything about your care.
      </Banner>

      <div className={`grid g2 ${styles.alignStart}`}>
        <div className="card">
          <ActionForm action={contactAction}>
            <TextField name="name" label="Your name" autoComplete="name" maxLength={120} required />
            <TextField name="email" label="Email" type="email" autoComplete="email" maxLength={254} required />
            <SelectField
              name="topic"
              label="Topic"
              options={CONTACT_TOPICS.map((t) => ({ value: t.value, label: t.label }))}
              placeholder="Choose a topic"
              required
            />
            <TextArea
              name="message"
              label="Message"
              hint="Please do not include symptoms, diagnoses or other health details."
              maxLength={4000}
              rows={6}
              required
            />
            <SubmitButton pendingText="Sending…">Send message</SubmitButton>
          </ActionForm>
        </div>
        <aside className="stack">
          <div className="card-flat stack stack-sm">
            <h2>Support</h2>
            <p>
              <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
            </p>
            <p className="muted">{brand.supportHours}</p>
          </div>
          <div className="card-flat stack stack-sm">
            <h2>Already a patient?</h2>
            <p className="muted">
              <Link href="/sign-in">Sign in to your portal</Link> to message your care team securely. {brand.clinicalHours.replace(/\.$/, "")}.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
