import type { Metadata } from "next";
import { ActionForm, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Banner, Icon, PageHead } from "@/components/ui";
import { employerInquiryAction } from "../actions";
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "Employer services",
  description:
    "A referral pathway and dedicated landing link for employers, HR teams, leave administrators, schools, public agencies, correctional facilities and healthcare organizations.",
};

const AUDIENCES = [
  "Employers and HR teams",
  "Leave administrators",
  "Correctional facilities",
  "Schools and universities",
  "Public agencies",
  "Healthcare organizations",
];

export default function EmployersPage() {
  return (
    <div className="container page stack stack-xl">
      <PageHead
        eyebrow="Employer services"
        title="A clear referral pathway for your people"
        lede="When an employee asks where to get a mental-health leave assessment, you can point them to an independent clinical service with a dedicated link."
      />

      <section className="stack" aria-labelledby="who-title">
        <h2 id="who-title">Who we work with</h2>
        <ul className="grid g3 list-plain">
          {AUDIENCES.map((a) => (
            <li key={a} className={`card-flat row ${styles.tight}`}>
              <Icon name="check" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid g2">
        <section className="card stack" aria-labelledby="offer-title">
          <h2 id="offer-title">What we offer</h2>
          <ul className="list-check">
            <li>
              <Icon name="check" />
              <span>
                <b>A referral pathway.</b> A simple way to direct employees to an assessment by a licensed mental-health clinician.
              </span>
            </li>
            <li>
              <Icon name="check" />
              <span>
                <b>A dedicated landing link.</b> A page for your organization that explains the service in neutral terms and starts the same screening everyone uses.
              </span>
            </li>
            <li>
              <Icon name="check" />
              <span>
                <b>Plain-language information</b> your HR team can share about how the process works.
              </span>
            </li>
          </ul>
        </section>

        <section className="card stack" aria-labelledby="boundaries-title">
          <h2 id="boundaries-title">What stays with the patient</h2>
          <ul className="list-check">
            <li>
              <Icon name="lock" />
              <span>The patient alone decides what is shared, and with whom.</span>
            </li>
            <li>
              <Icon name="lock" />
              <span>Employers never receive clinical information without the patient&rsquo;s written authorization.</span>
            </li>
            <li>
              <Icon name="lock" />
              <span>We do not tell your organization whether an individual employee used the link.</span>
            </li>
          </ul>
          <Banner tone="info" icon="info">
            We do not make leave decisions, determine FMLA eligibility, or act as a leave administrator. Clinicians make independent clinical determinations only.
          </Banner>
        </section>
      </div>

      <section className="grid g2" aria-labelledby="inquiry-title">
        <div className="stack">
          <h2 id="inquiry-title">Ask about a referral link</h2>
          <p className="muted">
            Tell us about your organization and we will reply by email. Please do not include information about any individual employee.
          </p>
        </div>
        <div className="card">
          <ActionForm action={employerInquiryAction}>
            <TextField name="name" label="Your name" autoComplete="name" maxLength={120} required />
            <TextField name="email" label="Work email" type="email" autoComplete="email" maxLength={254} required />
            <TextField name="organization" label="Organization" autoComplete="organization" maxLength={200} />
            <TextArea
              name="message"
              label="How can we help?"
              hint="No employee names or health details, please."
              maxLength={3500}
              rows={5}
              required
            />
            <SubmitButton pendingText="Sending…">Send inquiry</SubmitButton>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
