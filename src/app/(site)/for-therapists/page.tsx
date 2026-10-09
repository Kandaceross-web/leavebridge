import type { Metadata } from "next";
import { ActionForm, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Icon, PageHead } from "@/components/ui";
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
      <PageHead
        eyebrow="For therapists and EAPs"
        title="When a client needs leave paperwork you don't complete"
        lede="Many therapy practices and employee assistance programs don't complete employer leave forms. You can refer clients here for an independent assessment, and keep your therapeutic relationship separate from the paperwork."
      />
      <div className="grid g2">
        <section className="card stack" aria-labelledby="how-title">
          <h2 id="how-title">How referral works</h2>
          <ul className="list-check">
            <li>
              <Icon name="check" />
              <span>
                Share our site or your practice&rsquo;s own referral link. Your client screens and
                books on their own.
              </span>
            </li>
            <li>
              <Icon name="check" />
              <span>
                A licensed clinician assesses them independently and decides whether documentation
                is clinically supported.
              </span>
            </li>
            <li>
              <Icon name="check" />
              <span>
                With your client&rsquo;s written authorization, the clinician may ask you for
                treatment history. We never contact you without it.
              </span>
            </li>
          </ul>
        </section>
        <section className="card-flat card-lavender stack" aria-labelledby="terms-title">
          <h2 id="terms-title">What we don&rsquo;t do</h2>
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
      </div>
      <section className="grid g2" aria-labelledby="inquiry-title">
        <div className="stack">
          <h2 id="inquiry-title">Ask for a referral link</h2>
          <p className="muted">
            Tell us about your practice and we will reply by email. Please don&rsquo;t include
            anything about a specific client.
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
