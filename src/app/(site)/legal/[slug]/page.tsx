import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown, ReviewTag } from "@/components/ui";
import { legalPage } from "@/server/web/public";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await legalPage(slug);
  return page ? { title: page.title, description: `${page.title} for LeaveBridge Health.` } : { title: "Not found" };
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params;
  const page = await legalPage(slug);
  if (!page) notFound();
  return (
    <article className="container-narrow page stack stack-lg">
      <header className="page-head">
        <p className="eyebrow">Policies</p>
        <h1>{page.title}</h1>
        <div className="row">
          <ReviewTag tag={page.reviewTag} />
          <span className="small muted">
            Last updated{" "}
            {new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(page.updatedAt)}
          </span>
        </div>
      </header>
      <Markdown source={page.bodyMd} />
    </article>
  );
}
