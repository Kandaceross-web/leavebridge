import Link from "next/link";
import type { Metadata } from "next";
import { Badge, ButtonLink, PageHead, ReviewTag } from "@/components/ui";
import { FAQ_CATEGORIES } from "@/config/catalog";
import { requireStaffSession, run } from "@/server/auth/guards";
import { listContent } from "@/server/services/admin";
import { hasRole } from "@/domain/policy";
import { label } from "../_lib/ui";

export const metadata: Metadata = { title: "Content & FAQ" };

const TONE = { draft: "action", published: "done", retired: "neutral" } as const;

export default async function ContentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { kind: rawKind } = await searchParams;
  const { actor } = await requireStaffSession(["admin", "compliance", "clinical_director"]);
  const canEdit = hasRole(actor, ["admin"]);
  const all = await run(actor, (ctx) => listContent(ctx));
  const kinds = [...new Set(["faq", "legal", ...all.map((c) => c.kind)])];
  const kind = rawKind && kinds.includes(rawKind) ? rawKind : "faq";
  const rows = all.filter((c) => c.kind === kind);
  const catLabel = (k: string | null) => FAQ_CATEGORIES.find((c) => c.key === k)?.label ?? k ?? "—";
  return (
    <>
      <PageHead
        eyebrow="Configuration"
        title="Content & FAQ"
        lede="Public FAQ, legal pages and other managed text. Entries keep their review tags until the named review is complete."
        actions={canEdit && (kind === "faq" || kind === "legal") ? <ButtonLink href={`/ops/admin/content/new?kind=${kind}`}>New {kind === "faq" ? "FAQ entry" : "legal entry"}</ButtonLink> : null}
      />
      <nav className="tabs" aria-label="Content kinds">
        {kinds.map((k) => (
          <Link key={k} href={`/ops/admin/content?kind=${k}`} aria-current={k === kind ? "page" : undefined}>
            {k === "faq" ? "FAQ" : label(k)} ({all.filter((c) => c.kind === k).length})
          </Link>
        ))}
      </nav>
      {rows.length ? (
        <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
          <table className="t">
            <caption className="visually-hidden">{label(kind)} entries</caption>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
                <th scope="col">Review tag</th>
                <th scope="col">Order</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <th scope="row">
                    <Link href={`/ops/admin/content/${c.id}`}>{c.title}</Link>
                    <div className="fine mono break">{c.key}</div>
                  </th>
                  <td>{kind === "faq" ? catLabel(c.category) : (c.category ?? "—")}</td>
                  <td>
                    <Badge tone={TONE[c.status]}>{c.status}</Badge>
                  </td>
                  <td>{c.reviewTag ? <ReviewTag tag={c.reviewTag} /> : <span className="muted">None</span>}</td>
                  <td className="num">{c.sortOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No entries of this kind.</p>
      )}
    </>
  );
}
