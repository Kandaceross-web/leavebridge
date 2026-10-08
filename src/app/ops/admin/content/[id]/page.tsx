import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, KeyValue, Markdown, PageHead, ReviewTag } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { listContent } from "@/server/services/admin";
import { hasRole } from "@/domain/policy";
import { label } from "../../_lib/ui";
import s from "../../_lib/admin.module.css";
import { saveContentAction } from "../actions";
import { ContentForm } from "../content-form";

export const metadata: Metadata = { title: "Edit content" };

export default async function ContentEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { actor } = await requireStaffSession(["admin", "compliance", "clinical_director"]);
  const canEdit = hasRole(actor, ["admin"]);
  const entry = (await run(actor, (ctx) => listContent(ctx))).find((c) => c.id === id);
  if (!entry) notFound();
  const kindForSave = entry.kind === "legal" ? "legal" : "faq";
  return (
    <>
      <p className="small">
        <Link href={`/ops/admin/content?kind=${entry.kind}`}>← {entry.kind === "faq" ? "FAQ" : label(entry.kind)} entries</Link>
      </p>
      <PageHead
        eyebrow={entry.kind === "faq" ? "FAQ entry" : `${label(entry.kind)} entry`}
        title={entry.title}
        lede={
          <span className="row">
            <Badge tone={entry.status === "published" ? "done" : entry.status === "draft" ? "action" : "neutral"}>{entry.status}</Badge>
            <ReviewTag tag={entry.reviewTag} />
            <span className="tag">{entry.key}</span>
          </span>
        }
      />
      <section className="card stack" aria-labelledby="edit-h">
        <h2 id="edit-h">{canEdit ? "Edit" : "Details"}</h2>
        {canEdit ? (
          <ContentForm action={saveContentAction.bind(null, entry.id, kindForSave)} values={entry} submit="Save entry" />
        ) : (
          <KeyValue
            items={[
              ["Category", entry.category],
              ["Sort order", String(entry.sortOrder)],
            ]}
          />
        )}
      </section>
      <section className="stack" aria-labelledby="preview-h">
        <h2 id="preview-h">Preview (saved version)</h2>
        <div className={s.preview}>
          <h3>{entry.title}</h3>
          <Markdown source={entry.bodyMd} />
        </div>
      </section>
    </>
  );
}
