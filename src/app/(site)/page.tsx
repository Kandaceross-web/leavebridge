import Link from "next/link";
import { ButtonLink, Icon, Money } from "@/components/ui";
import { activeStates, enabledServices, launchPriceCents, siteSettings } from "@/server/web/public";
import styles from "./site.module.css";

export default async function HomePage() {
  const [{ pricing, turnaround, crisis }, price, states, services] = await Promise.all([siteSettings(), launchPriceCents(), activeStates(), enabledServices()]);
  const primary = services[0];
  return (
    <>
      <section className="container hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">Mental health leave assessments</p>
          <h1 id="hero-title" className="mt-1">
            Clinical clarity when mental health is affecting your work.
          </h1>
          <p className="sub">
            A licensed mental-health clinician reviews your situation, meets with you by secure video when needed, and makes an independent determination about
            whether leave documentation is clinically supported.
          </p>
          <div className="btn-row">
            <ButtonLink href="/start">Check if we can help</ButtonLink>
            <ButtonLink href="/how-it-works" variant="secondary">
              How it works
            </ButtonLink>
          </div>
          <div className="trust">
            <span>
              <Icon name="badge" /> Licensed clinicians
            </span>
            <span>
              <Icon name="lock" /> Encrypted, private portal
            </span>
            <span>
              <Icon name="video" /> Secure telehealth
            </span>
          </div>
        </div>
        <aside className="svc" aria-labelledby="price-title">
          <p className="eyebrow">{primary?.name ?? "Mental Health Leave Assessment"}</p>
          <p className="price" id="price-title">
            {price !== null ? <Money cents={price} /> : "—"}
            <small>self-pay</small>
          </p>
          <ul className="list-check">
            {pricing.includes.map((item) => (
              <li key={item}>
                <Icon name="check" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="fine">
            Payment covers the professional assessment. It does not guarantee a diagnosis, documentation, or approval of leave by your employer.{" "}
            <Link href="/pricing">What&rsquo;s included</Link>
          </p>
        </aside>
      </section>

      <section className="section section-mist" aria-labelledby="who-title">
        <div className="container grid g2">
          <div className="stack">
            <h2 id="who-title">Who this is for</h2>
            <p className="lede">
              Adults 18 and older whose anxiety, depression, burnout, or other mental-health symptoms are making work difficult, and who may need medical documentation
              for continuous leave, intermittent leave, or a reduced schedule.
            </p>
            <p className="muted">
              You must be physically located in a state where our clinicians are licensed when you receive care.{" "}
              {states.length ? (
                <>
                  We currently serve {states.map((s) => s.name).join(", ")}. <Link href="/availability">Where we serve</Link>
                </>
              ) : (
                <Link href="/availability">See where we serve</Link>
              )}
            </p>
          </div>
          <div className="card-flat stack">
            <h3>This service is not</h3>
            <ul className="list-check">
              {["Emergency or crisis care", "Ongoing therapy or medication management", "A decision about FMLA eligibility or leave approval", "A guarantee of any outcome"].map((t) => (
                <li key={t}>
                  <Icon name="x" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="small muted">
              Not for emergencies. If you are in crisis:{" "}
              {crisis.resources
                .filter((r) => r.href)
                .map((r, i) => (
                  <span key={r.label}>
                    {i > 0 ? " · " : ""}
                    <a href={r.href}>{r.label}</a>
                  </span>
                ))}
              . <Link href="/crisis">More crisis resources</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <div className="container stack-lg stack">
          <div className="stack stack-sm">
            <p className="eyebrow">How it works</p>
            <h2 id="how-title">Seven steps, one secure portal</h2>
          </div>
          <div className="grid g2">
            <ol className="steps">
              <li>
                <b>Answer a few questions</b>
                <span>Two minutes to confirm we can help and that you are in a state we serve.</span>
              </li>
              <li>
                <b>Create your account and verify your identity</b>
                <span>Upload a photo ID and confirm where you are located.</span>
              </li>
              <li>
                <b>Pay {price !== null ? <Money cents={price} /> : "the assessment fee"} securely</b>
                <span>{pricing.paymentTiming}</span>
              </li>
              <li>
                <b>Complete your secure intake</b>
                <span>Your history, how symptoms affect work, two short questionnaires, and any employer forms.</span>
              </li>
              <li className="clin">
                <b>A licensed clinician reviews your case</b>
                <span>They may ask for more information or schedule a video assessment.</span>
              </li>
              <li className="clin">
                <b>Independent clinical determination</b>
                <span>The clinician decides whether documentation is clinically supported, and explains the outcome.</span>
              </li>
              <li>
                <b>Secure delivery</b>
                <span>Signed documents appear in your portal. You decide who receives them.</span>
              </li>
            </ol>
            <div className="stack">
              <div className="banner banner-sage">
                <Icon name="info" />
                <div>
                  <b>Your clinician&rsquo;s judgment is independent.</b> Steps 5 and 6 are made by a licensed clinician alone. No software makes clinical decisions,
                  and payment never determines the outcome.
                </div>
              </div>
              <div className="card-flat stack stack-sm">
                <h3>How fast</h3>
                {turnaround.showPublicly ? <p className="muted">{turnaround.publicMessage}</p> : <p className="muted">Timelines depend on your case and are shown in your portal.</p>}
                <p className="small muted">If you have a documentation deadline, tell us during screening so the clinical team can see it.</p>
              </div>
              <ButtonLink href="/how-it-works" variant="secondary">
                Read the full process
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-mist" aria-labelledby="cost-title">
        <div className="container grid g2">
          <div className="stack">
            <h2 id="cost-title">What {price !== null ? <Money cents={price} /> : "the fee"} covers</h2>
            <ul className="list-check">
              {pricing.includes.map((item) => (
                <li key={item}>
                  <Icon name="check" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="stack">
            <h2>What it doesn&rsquo;t guarantee</h2>
            <ul className="list-check">
              {pricing.excludes.map((item) => (
                <li key={item}>
                  <Icon name="x" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="small muted">
              Self-pay only; we do not bill insurance. Refunds depend on how far your case has progressed. <Link href="/pricing">Pricing and refunds</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="next-title">
        <div className={`container stack text-center ${styles.centered}`}>
          <h2 id="next-title">Your next step</h2>
          <p className="lede">Answer a few questions to see whether this service is available to you. No account or payment needed to check.</p>
          <div className={`btn-row ${styles.centerRow}`}>
            <ButtonLink href="/start">Check if we can help</ButtonLink>
            <ButtonLink href="/faq" variant="quiet">
              Read common questions
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
