import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffSession, run } from "@/server/auth/guards";
import { caseWorkspace } from "@/server/services/ops-queries";
import { isDomainError } from "@/domain/errors";
import { hasRole } from "@/domain/policy";
import { FlagBadges, PriorityBadge, StatusBadge } from "../_ui";
import { SummaryTab } from "./_tabs/summary";
import { IntakeTab } from "./_tabs/intake";
import { MeasuresTab } from "./_tabs/measures";
import { FilesTab } from "./_tabs/files";
import { ClinicalTab } from "./_tabs/clinical";
import { DocumentsTab } from "./_tabs/documents";
import { AppointmentsTab } from "./_tabs/appointments";
import { MessagesTab } from "./_tabs/messages";
import { NotesTab } from "./_tabs/notes";
import { PaymentsTab } from "./_tabs/payments";
import { AuditTab } from "./_tabs/audit";
import type { StaffActor } from "./_shared";

// The title never includes the reference or name (it can end up in browser history).
export const metadata: Metadata = { title: "Case" };

const TABS = [
  ["summary", "Summary"],
  ["intake", "Intake"],
  ["measures", "Measures"],
  ["files", "Files"],
  ["clinical", "Clinical review"],
  ["documents", "Documents"],
  ["appointments", "Appointments"],
  ["messages", "Messages"],
  ["notes", "Notes"],
  ["payments", "Payments"],
  ["audit", "Audit"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function CaseWorkspacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { actor } = await requireStaffSession();
  const ws = await run(actor, (ctx) => caseWorkspace(ctx, id)).catch((e: unknown) => {
    if (isDomainError(e) && (e.code === "not_found" || e.code === "forbidden")) notFound();
    throw e;
  });
  const visible = TABS.filter(([k]) => k !== "audit" || hasRole(actor, ["admin", "compliance"]));
  const tab: Tab = visible.some(([k]) => k === sp.tab) ? (sp.tab as Tab) : "summary";
  const props = { ws, actor: actor as StaffActor };

  return (
    <div className="stack stack-lg">
      <nav aria-label="Breadcrumb" className="small">
        <Link href="/ops/cases">Cases</Link> <span aria-hidden="true">/</span> <span className="mono">{ws.row.reference}</span>
      </nav>
      <header className="page-head">
        <p className="eyebrow">Case {ws.row.reference}</p>
        <div className="row row-between" style={{ alignItems: "flex-end" }}>
          <h1>
            {ws.patientName}
            {ws.preferredName ? <span className="muted small"> (prefers {ws.preferredName})</span> : null}
          </h1>
          <div className="row">
            <StatusBadge status={ws.row.status} />
            <PriorityBadge priority={ws.row.priority} />
          </div>
        </div>
        <p className="muted small">
          {ws.service?.name ?? "No service selected"} · {ws.row.jurisdictionCode ?? "No state"} · {ws.clinician ? `${ws.clinician.name}, ${ws.clinician.credentials}` : "Unassigned"}
          {ws.access === "clinical" ? "" : " · operational view"}
        </p>
        {ws.flags.length ? <FlagBadges flags={ws.flags} /> : null}
      </header>

      <nav className="tabs" aria-label="Case sections">
        {visible.map(([k, label]) => (
          <Link key={k} href={k === "summary" ? `/ops/cases/${id}` : `/ops/cases/${id}?tab=${k}`} aria-current={k === tab ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>

      <section aria-label={visible.find(([k]) => k === tab)?.[1]} className="stack stack-lg">
        {tab === "summary" ? <SummaryTab {...props} /> : null}
        {tab === "intake" ? <IntakeTab {...props} /> : null}
        {tab === "measures" ? <MeasuresTab {...props} /> : null}
        {tab === "files" ? <FilesTab {...props} /> : null}
        {tab === "clinical" ? <ClinicalTab {...props} /> : null}
        {tab === "documents" ? <DocumentsTab {...props} /> : null}
        {tab === "appointments" ? <AppointmentsTab {...props} /> : null}
        {tab === "messages" ? <MessagesTab {...props} /> : null}
        {tab === "notes" ? <NotesTab {...props} /> : null}
        {tab === "payments" ? <PaymentsTab {...props} /> : null}
        {tab === "audit" ? <AuditTab {...props} /> : null}
      </section>
    </div>
  );
}
