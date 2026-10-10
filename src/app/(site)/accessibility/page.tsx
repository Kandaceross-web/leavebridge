import type { Metadata } from "next";
import { siteSettings } from "@/server/web/public";

// States only what is true today: automated WCAG checks run on every change; no independent audit yet.
// Update the "How we check" section if an outside audit is done.

export const metadata: Metadata = {
  title: "Accessibility",
  description: "How LeaveBridge Health works to make its website and patient portal usable by everyone, and how to tell us about a barrier.",
  alternates: { canonical: "/accessibility" },
};

export default async function AccessibilityPage() {
  const { brand } = await siteSettings();
  return (
    <div className="container-narrow page stack stack-lg">
      <header className="stack">
        <p className="eyebrow">Accessibility</p>
        <h1>Accessibility statement</h1>
        <p className="lede">
          We want everyone to be able to learn about our services, complete an assessment and read their documents,
          including people who use assistive technology.
        </p>
      </header>

      <section className="stack" aria-labelledby="goal-title">
        <h2 id="goal-title">Our goal</h2>
        <p>
          We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA across this website and the
          patient portal.
        </p>
      </section>

      <section className="stack" aria-labelledby="check-title">
        <h2 id="check-title">How we check</h2>
        <ul>
          <li>Every change is tested with automated accessibility checks on phone-sized and desktop screens.</li>
          <li>Pages are built to work with a keyboard alone, with screen readers, and when text is enlarged.</li>
          <li>We keep color contrast high and do not rely on color alone to show meaning.</li>
        </ul>
        <p>
          Automated checks cannot catch every barrier, and the site has not yet been reviewed by an independent
          accessibility auditor. If something does not work for you, please tell us.
        </p>
      </section>

      <section className="stack" aria-labelledby="contact-title">
        <h2 id="contact-title">Tell us about a barrier</h2>
        <p>
          Email <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> ({brand.supportHours}). Let us
          know the page, what you were trying to do and the device or assistive technology you use. Please do not
          include health details in your email. We will work with you to provide the information or complete the step
          another way.
        </p>
      </section>
    </div>
  );
}
