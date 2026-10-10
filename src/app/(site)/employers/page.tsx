import type { Metadata } from "next";
import { ActionForm, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Icon } from "@/components/ui";
import { SiteHero } from "@/components/illustration";
import { employerInquiryAction } from "../actions";
import { OpensAtLaunch } from "@/components/opens-at-launch";

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
  "Employee assistance programs (EAPs)",
  "Unions",
];

export default function EmployersPage() {
  return (
    <div className="container page stack stack-xl">
      <SiteHero
        eyebrow="Employer services"
        title="A clear referral pathway for your people"
        lede="Point employees to an independent clinical assessment with one dedicated link."
      />

      <section className="stack" aria-labelledby="who-title">
        <h2 id="who-title">Who we work with</h2>
        <ul className="chips">
          {AUDIENCES.map((a) => (
            <li key={a} className="chip">
              <Icon name="check" />
              {a}
            </li>
          ))}
        </ul>
      </section>

      <section className="stack" aria-labelledby="offer-title">
        <h2 id="offer-title">What we offer</h2>
        <div className="grid g3">
          <div className="feature">
            <span className="bubble">
              <Icon name="arrow" size={24} />
            </span>
            <h3>A referral pathway</h3>
            <p>A simple way to send employees to a licensed mental-health clinician.</p>
          </div>
          <div className="feature">
            <span className="bubble bubble-sun">
              <Icon name="file" size={24} />
            </span>
            <h3>A dedicated landing link</h3>
            <p>A neutral page for your organization that starts the same screening everyone uses.</p>
          </div>
          <div className="feature">
            <span className="bubble bubble-mint">
              <Icon name="info" size={24} />
            </span>
            <h3>Plain-language info</h3>
            <p>Material your HR team can share about how the process works.</p>
          </div>
        </div>
      </section>

      <section className="split" aria-labelledby="boundaries-title">
        <div className="feature">
          <span className="bubble bubble-teal">
            <Icon name="lock" size={24} />
          </span>
          <h2 id="boundaries-title" className="h3-size">
            What stays with the patient
          </h2>
          <ul className="list-check">
            <li>
              <Icon name="lock" />
              <span>The patient alone decides what is shared, and with whom.</span>
            </li>
            <li>
              <Icon name="lock" />
              <span>No clinical information reaches you without their written authorization.</span>
            </li>
            <li>
              <Icon name="lock" />
              <span>We don&rsquo;t tell you whether an employee used the link.</span>
            </li>
          </ul>
          <p className="small muted">
            We don&rsquo;t make leave decisions, determine FMLA eligibility, or act as a leave
            administrator. Clinicians make independent clinical determinations only.
          </p>
        </div>
      </section>

      <section className="grid g2" aria-labelledby="inquiry-title">
        <div className="stack">
          <h2 id="inquiry-title">Ask about a referral link</h2>
          <p className="muted">
            We reply by email. Please don&rsquo;t include anything about an individual employee.
          </p>
        </div>
        <div className="card">
          <OpensAtLaunch>
            <ActionForm action={employerInquiryAction}>
              <TextField
                name="name"
                label="Your name"
                autoComplete="name"
                maxLength={120}
                required
              />
              <TextField
                name="email"
                label="Work email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
              />
              <TextField
                name="organization"
                label="Organization"
                autoComplete="organization"
                maxLength={200}
              />
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
          </OpensAtLaunch>
        </div>
      </section>
    </div>
  );
}
