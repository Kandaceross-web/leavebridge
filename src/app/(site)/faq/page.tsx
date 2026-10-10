import Link from "next/link";
import type { Metadata } from "next";
import { FAQ_CATEGORIES } from "@/config/catalog";
import { Markdown, PageHead, ReviewTag } from "@/components/ui";
import { activeStates, publishedFaq } from "@/server/web/public";
import { JsonLd } from "@/components/json-ld";
import { faqLd } from "@/server/web/structured-data";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Answers about work and school excuse evaluations, FMLA and medical leave evaluations, evaluation requirements, pricing and refunds.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const [entries, states] = await Promise.all([publishedFaq(), activeStates()]);
  const stateNames = states.map((st) => st.name).join(" or ") || "a state we serve";
  const known = new Set(FAQ_CATEGORIES.map((c) => c.key));
  const groups = [
    ...FAQ_CATEGORIES.map((c) => ({ ...c, items: entries.filter((e) => e.category === c.key) })),
    {
      key: "other",
      label: "Other questions",
      items: entries.filter((e) => !e.category || !known.has(e.category)),
    },
  ].filter((g) => g.items.length);
  return (
    <div className="container-narrow page stack stack-xl">
      {entries.length ? <JsonLd data={faqLd(entries)} /> : null}
      <PageHead
        eyebrow="FAQs"
        title="Frequently Asked Questions"
        lede="Answers about our Work & School Excuse Evaluations and our Mental Health Leave & FMLA Evaluations."
      />
      {groups.length > 1 ? (
        <nav aria-label="FAQ topics" className="row">
          {groups.map((g) => (
            <a key={g.key} href={`#faq-${g.key}`} className="chip-link">
              {g.label}
            </a>
          ))}
        </nav>
      ) : null}
      {groups.length ? (
        groups.map((g) => (
          <section key={g.key} className="stack" aria-labelledby={`faq-${g.key}`}>
            <h2 id={`faq-${g.key}`}>{g.label}</h2>
            <div className="faq">
              {g.items.map((e) => (
                <details key={e.id}>
                  <summary>{e.title}</summary>
                  <div className="answer">
                    <Markdown source={e.bodyMd} />
                    {e.reviewTag ? (
                      <p>
                        <ReviewTag tag={e.reviewTag} />
                      </p>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))
      ) : (
        <p className="muted">Answers are being prepared. In the meantime, please contact us.</p>
      )}
      <section id="evaluation-requirements" className="stack" aria-labelledby="req-title">
        <h2 id="req-title">Evaluation Requirements</h2>
        <div className="prose">
          <h3>Who can use our services</h3>
          <p>
            Our services are for adults 18 and older who are physically located in {stateNames}{" "}
            while they receive care. Clinicians can only provide care where they are licensed, so we
            confirm your location before you pay. You create a secure account and, for the leave
            evaluation, verify your identity with a photo ID.
          </p>
          <h3>Who makes clinical decisions</h3>
          <p>
            Every clinical decision is made by a licensed professional counselor using their own
            professional judgment. No software makes a clinical decision, and payment never decides
            the outcome. Our clinicians are licensed professional counselors, not physicians.
          </p>
          <h3>How documentation decisions are made</h3>
          <p>
            Documentation is completed only when your clinician finds it clinically supported by the
            information gathered during your evaluation. The outcome may be that no documentation is
            supported, that more information is needed, or that a different kind of care is more
            appropriate. Your clinician explains the decision in your portal.
          </p>
          <h3>Work and school excuse letters</h3>
          <p>
            The Work &amp; School Excuse Evaluation starts with an automated screening. Its results
            are scored by software and are not a clinician examination. A work or school excuse
            letter is issued only if a licensed clinician reviews your request and approves it.
          </p>
          <h3>Leave and FMLA documentation</h3>
          <p>
            The Mental Health Leave &amp; FMLA Evaluation includes a clinical intake, clinician
            review and, when your clinician needs one, a secure video visit. When clinically
            supported, your clinician completes the leave documentation or the employer form you
            upload.
          </p>
          <h3>Limitations</h3>
          <ul>
            <li>
              We do not decide FMLA eligibility or approve leave. Your employer or leave
              administrator does.
            </li>
            <li>
              Employers and leave administrators set their own rules about which provider types they
              accept. Please check with them before you pay.
            </li>
            <li>
              We are not an emergency service. If you are in danger, call 911 or call or text 988.
            </li>
            <li>We do not bill insurance. Prices are self-pay and shown before you begin.</li>
          </ul>
        </div>
      </section>

      <div className="card-quiet stack stack-sm">
        <h2 className="mt-0">Still have a question?</h2>
        <p className="muted">
          <Link href="/contact">Contact our support team</Link>. Please do not include health
          details, and do not use the contact form in an emergency.
        </p>
      </div>
    </div>
  );
}
