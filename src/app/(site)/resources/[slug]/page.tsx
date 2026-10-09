import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, Markdown, ReviewTag } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { publishedResources, resourcePage, siteSettings, summaryOf } from "@/server/web/public";
import { articleLd } from "@/server/web/structured-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await resourcePage(slug);
  if (!page) return { title: "Not found" };
  const description = summaryOf(page.bodyMd);
  return { title: page.title, description, alternates: { canonical: `/resources/${slug}` }, openGraph: { type: "article", title: page.title, description } };
}

export default async function ResourcePage({ params }: Props) {
  const { slug } = await params;
  const [page, all, { brand }] = await Promise.all([resourcePage(slug), publishedResources(), siteSettings()]);
  if (!page) notFound();
  const related = all.filter((r) => r.key !== page.key).slice(0, 3);
  return (
    <article className="container-narrow page stack stack-lg">
      <JsonLd data={articleLd({ title: page.title, description: summaryOf(page.bodyMd), path: `/resources/${slug}`, updatedAt: page.updatedAt, brandName: brand.name })} />
      <header className="page-head">
        <p className="eyebrow">
          <Link href="/resources">Guides</Link>
          {page.category ? ` · ${page.category}` : ""}
        </p>
        <h1>{page.title}</h1>
        <div className="row">
          <ReviewTag tag={page.reviewTag} />
          <span className="small muted">
            Last updated {new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(page.updatedAt)}
          </span>
        </div>
      </header>
      <Markdown source={page.bodyMd} />
      <div className="card card-sun stack stack-sm">
        <h2>See if an assessment is right for you</h2>
        <p className="muted">A licensed clinician decides independently whether documentation is clinically supported. Payment never guarantees an outcome.</p>
        <div className="btn-row">
          <ButtonLink href={`/start?entry=guide-${slug}`}>Check if we can help</ButtonLink>
        </div>
      </div>
      {related.length ? (
        <nav aria-labelledby="related-title" className="stack stack-sm">
          <h2 id="related-title">Related guides</h2>
          <ul>
            {related.map((r) => (
              <li key={r.key}>
                <Link href={`/resources/${r.key.replace(/^resource\./, "")}`}>{r.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </article>
  );
}
