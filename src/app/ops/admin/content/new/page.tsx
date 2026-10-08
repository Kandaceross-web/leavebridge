import Link from "next/link";
import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import { requireStaffSession } from "@/server/auth/guards";
import { createContentAction } from "../actions";
import { ContentForm } from "../content-form";

export const metadata: Metadata = { title: "New content entry" };

export default async function NewContentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { kind: raw } = await searchParams;
  const kind = raw === "legal" ? "legal" : "faq";
  await requireStaffSession(["admin"]);
  return (
    <>
      <p className="small">
        <Link href={`/ops/admin/content?kind=${kind}`}>← Back</Link>
      </p>
      <PageHead eyebrow="Content" title={kind === "faq" ? "New FAQ entry" : "New legal entry"} lede="New entries start as drafts with a review tag. Publish only after the named review is complete." />
      <div className="card">
        <ContentForm
          action={createContentAction.bind(null, kind)}
          values={{ kind, title: "", bodyMd: "", category: null, status: "draft", reviewTag: "LEGAL_REVIEW_REQUIRED", sortOrder: 100 }}
          submit="Create entry"
        />
      </div>
    </>
  );
}
