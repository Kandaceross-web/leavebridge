import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, Markdown, Money, ReviewTag } from "@/components/ui";
import { launchPriceCents, statePage, summaryOf } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await statePage(slug);
  if (!page) return { title: "Not found" };
  return {
    title: page.title,
    description: summaryOf(page.bodyMd),
    alternates: { canonical: `/states/${slug}` },
  };
}

export default async function StatePage({ params }: Props) {
  const { slug } = await params;
  const [page, price] = await Promise.all([statePage(slug), launchPriceCents()]);
  if (!page) notFound();
  return (
    <article className="container-narrow page stack stack-lg">
      <header className="page-head">
        <p className="eyebrow">
          <Link href="/availability">Where we serve</Link> · {page.state.name}
        </p>
        <h1>{page.title}</h1>
        <div className="row">
          <ReviewTag tag={page.reviewTag} />
        </div>
      </header>
      {page.state.isActive ? (
        <div className="card card-mint stack stack-sm">
          <h2>Available in {page.state.name}</h2>
          <p className="muted">
            {price !== null ? (
              <>
                <Money cents={price} /> self-pay assessment.{" "}
              </>
            ) : null}
            You must be physically located in {page.state.name} during your visit.
          </p>
          <div className="btn-row">
            <ButtonLink href={appHref(`/start?entry=state-${slug}`)}>
              Begin Your Assessment
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="card card-lavender stack stack-sm">
          <h2>Not yet available in {page.state.name}</h2>
          <p className="muted">We can&rsquo;t see patients located in {page.state.name} yet.</p>
          <div className="btn-row">
            <ButtonLink href="/availability" variant="secondary">
              Where we serve
            </ButtonLink>
          </div>
        </div>
      )}
      <Markdown source={page.bodyMd} />
    </article>
  );
}
