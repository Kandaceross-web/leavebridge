import { ActionForm, SelectField, SubmitButton, TextArea } from "@/components/forms";
import { Icon } from "@/components/ui";
import type { caseWorkspace } from "@/server/services/ops-queries";
import type { Actor } from "@/domain/actor";
import type { DeterminationDecision } from "@/domain/constants";
import { hasRole } from "@/domain/policy";
import { isDomainError } from "@/domain/errors";
import { requestAccessAction } from "./actions";

export type Workspace = Awaited<ReturnType<typeof caseWorkspace>>;
export type StaffActor = Extract<Actor, { kind: "staff" }>;
export interface TabProps {
  ws: Workspace;
  actor: StaffActor;
}

/** Staff-facing labels for the four clinician-only decisions. Order matches DETERMINATION_DECISIONS. */
export const DECISION_LABEL: Record<DeterminationDecision, string> = {
  DOCUMENTATION_CLINICALLY_SUPPORTED: "Documentation is clinically supported",
  ADDITIONAL_INFORMATION_REQUIRED: "Additional information is required",
  DOCUMENTATION_NOT_CLINICALLY_SUPPORTED: "Documentation is not clinically supported",
  REFER_OUTSIDE_SCOPE: "Refer outside the scope of this service",
};

export const LEAVE_TYPE_LABEL: Record<string, string> = {
  continuous: "Continuous",
  intermittent: "Intermittent",
  reduced_schedule: "Reduced schedule",
  unsure: "Not sure",
};

export const FORM_KIND_LABEL: Record<string, string> = {
  wh_380_e: "WH-380-E (employee's serious health condition)",
  administrator_form: "Leave administrator form",
  employer_form: "Employer form",
  disability_form: "Disability form",
  other: "Other",
  unknown: "Not yet identified",
};

export const REVIEW_OUTCOME_LABEL: Record<string, string> = {
  session_required: "Session required",
  info_required: "Information required",
  ready_for_determination: "Ready for determination",
};

export const isAssigned = (ws: Workspace, actor: StaffActor) => Boolean(actor.clinicianId) && ws.row.assignedClinicianId === actor.clinicianId && hasRole(actor, ["clinician", "clinical_director"]);

/**
 * Shown in place of clinical content when the viewer does not have clinical access. Neutral by
 * design: it does not say what the clinical record contains.
 */
export function LimitedPanel({ ws, actor }: TabProps) {
  const canRequest = hasRole(actor, ["compliance", "clinician", "clinical_director"]);
  return (
    <div className="card-quiet stack" role="region" aria-label="Limited access">
      <p className="row">
        <Icon name="lock" />
        <b>Clinical information is limited to the assigned clinician.</b>
      </p>
      <p className="muted small">
        Clinical directors and approved, time-limited access grants can also view it. Every view is recorded in the audit log.
      </p>
      {canRequest ? (
        <details>
          <summary className="btn btn-secondary btn-sm">Request break-glass access</summary>
          <div className="mt-2">
            <ActionForm action={requestAccessAction.bind(null, ws.row.id)}>
              <TextArea name="reason" label="Why do you need access to this case?" hint="At least 15 characters. Reviewed by a clinical director or admin." required rows={3} maxLength={500} />
              <SelectField
                name="hours"
                label="How long"
                defaultValue="1"
                options={[
                  { value: "1", label: "1 hour" },
                  { value: "2", label: "2 hours" },
                  { value: "4", label: "4 hours" },
                ]}
              />
              <SubmitButton variant="secondary">Submit request</SubmitButton>
            </ActionForm>
          </div>
        </details>
      ) : null}
    </div>
  );
}

/** Resolves to null when a clinical read is refused, so the tab can show LimitedPanel instead. */
export async function tryClinical<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (isDomainError(e) && e.code === "forbidden") return null;
    throw e;
  }
}
