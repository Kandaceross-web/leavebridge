import Link from "next/link";
import type { Metadata } from "next";
import { ButtonLink, PageHead } from "@/components/ui";
import { publishedResources, summaryOf } from "@/server/web/public";

export const metadata: Metadata = {
  title: "Guides to mental health leave paperwork",
  description: "Plain-language guides to FMLA and mental health leave: who can complete forms, what your employer sees, intermittent leave, and what to check before you pay.",
  alternates: { canonical: "/resources" },
};

export default async function ResourcesPage() {
  const guides = await publishedResources();
  const groups = [...new Set(guides.map((g) => g.category ?? "Guides"))].map((label) => ({ label, items: guides.filter((g) => (g.category ?? "Guides") === label) }));
  return (
    <div className="container page stack stack-xl">
      <PageHead eyebrow="Guides" title="Mental health leave, explained plainly" lede="Answers to the questions people ask most before they request leave. General information, not legal advice." />
      <div className="card card-mint stack stack-sm">
        <h2>FMLA basics check</h2>
        <p className="muted">Three questions about your job, not your health, to see whether the basic FMLA rules likely apply. Nothing you enter is saved.</p>
        <div className="btn-row">
          <ButtonLink href="/resources/fmla-basics-check" variant="secondary">
            Take the check
          </ButtonLink>
        </div>
      </div>
      {groups.length ? (
        groups.map((g) => (
          <section key={g.label} className="stack" aria-labelledby={`g-${g.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
            <h2 id={`g-${g.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{g.label}</h2>
            <div className="grid g3">
              {g.items.map((r) => {
                const slug = r.key.replace(/^resource\./, "");
                return (
                  <article key={r.key} className="card card-accent stack stack-sm">
                    <h3>
                      <Link href={`/resources/${slug}`}>{r.title}</Link>
                    </h3>
                    <p className="small muted">{summaryOf(r.bodyMd)}</p>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <p className="muted">Guides are being written. In the meantime, see our <Link href="/faq">common questions</Link>.</p>
      )}
      <div className="card card-sun stack stack-sm">
        <h2>Ready to see if we can help?</h2>
        <p className="muted">Answer a few questions. No account or payment needed to check.</p>
        <div className="btn-row">
          <ButtonLink href="/start?entry=resources">Check if we can help</ButtonLink>
        </div>
      </div>
    </div>
  );
}
