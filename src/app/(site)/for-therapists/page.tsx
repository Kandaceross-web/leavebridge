import type { Metadata } from "next";
import { ActionForm, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Icon } from "@/components/ui";
import { SiteHero } from "@/components/illustration";
import { employerInquiryAction } from "../actions";
import { OpensAtLaunch } from "@/components/opens-at-launch";

export const metadata: Metadata = {
  title: "For therapists: when a client needs leave paperwork",
  description:
    "When your client needs FMLA or leave paperwork your practice doesn't complete, refer them for an independent assessment by a licensed mental-health clinician.",
  alternates: { canonical: "/for-therapists" },
};

export default function ForTherapistsPage() {
  return (
    <div className="container page stack stack-xl">
      <SiteHero
        eyebrow="For therapists and EAPs"
        title="When a client needs leave paperwork you don’t complete"
        lede="Refer them for an independent assessment, and keep therapy separate from the paperwork."
      />
      <section className="stack" aria-labelledby="how-title">
        <h2 id="how-title">How referral works</h2>
        <ol className="flow flow-3">
          <li>
            <span className="num" aria-hidden="true">1</span>
            <h3>Share the link</h3>
            <p>Our site or your practice&rsquo;s own link. Your client screens and books.</p>
          </li>
          <li className="clin">
            <span className="num" aria-hidden="true">2</span>
            <h3>Independent assessment</h3>
            <p>A licensed clinician decides if documentation is clinically supported.</p>
          </li>
          <li>
            <span className="num" aria-hidden="true">3</span>
            <h3>Only with consent</h3>
            <p>
              We may ask you for treatment history only with your client&rsquo;s written
              authorization. Never without it.
            </p>
          </li>
        </ol>
      </section>
      <section className="feature" aria-labelledby="terms-title">
        <h2 id="terms-title" className="h3-size">
          What we don&rsquo;t do
        </h2>
        <ul className="list-check">
          <li>
            <Icon name="x" />
            <span>Provide ongoing therapy or take over your client&rsquo;s care</span>
          </li>
          <li>
            <Icon name="x" />
            <span>Promise any outcome to your client</span>
          </li>
        </ul>
      </section>
      <section className="grid g2" aria-labelledby="inquiry-title">
        <div className="stack">
          <h2 id="inquiry-title">Ask for a referral link</h2>
          <p className="muted">
            We reply by email. Please don&rsquo;t include anything about a specific client.
          </p>
        </div>
        <div className="card">
          <OpensAtLaunch>
            <ActionForm action={employerInquiryAction}>
              <input type="hidden" name="source" value="therapist" />
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
                label="Practice or program"
                autoComplete="organization"
                maxLength={200}
              />
              <TextArea
                name="message"
                label="How can we help?"
                hint="No client names or health details, please."
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
