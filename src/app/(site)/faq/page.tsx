import Link from "next/link";
import type { Metadata } from "next";
import { FAQ_CATEGORIES } from "@/config/catalog";
import { Markdown, PageHead, ReviewTag } from "@/components/ui";
import { publishedFaq } from "@/server/web/public";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about the assessment, FMLA and workplace leave, payment, documentation, telehealth, privacy, appointments and employer forms.",
};

export default async function FaqPage() {
  const entries = await publishedFaq();
  const known = new Set(FAQ_CATEGORIES.map((c) => c.key));
  const groups = [
    ...FAQ_CATEGORIES.map((c) => ({ ...c, items: entries.filter((e) => e.category === c.key) })),
    { key: "other", label: "Other questions", items: entries.filter((e) => !e.category || !known.has(e.category)) },
  ].filter((g) => g.items.length);
  return (
    <div className="container-narrow page stack stack-xl">
      <PageHead eyebrow="FAQ" title="Common questions" lede="Plain answers about how the assessment works and what it can and cannot do." />
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
      <div className="card-quiet stack stack-sm">
        <h2 className="mt-0">Still have a question?</h2>
        <p className="muted">
          <Link href="/contact">Contact our support team</Link>. Please do not include health details, and do not use the contact form in an emergency.
        </p>
      </div>
    </div>
  );
}
