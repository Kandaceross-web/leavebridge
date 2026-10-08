/**
 * The patient's "what do I do next" checklist, derived purely from case facts so the dashboard,
 * the gating rules and the submit check can never disagree.
 * Order follows the agreed journey: service → identity & location → financial consents → payment
 * → care consents → intake → measures → documents → submit.
 */
export interface ChecklistFacts {
  /** True while a NEEDS_REVIEW screening awaits clinician clearance. */
  screeningReviewPending: boolean;
  serviceSelected: boolean;
  identityRequired: boolean;
  identityStatus: "not_started" | "pending" | "verified" | "rejected";
  locationConfirmed: boolean;
  paymentConsentsSigned: boolean;
  paid: boolean;
  intakeConsentsSigned: boolean;
  intakeSubmitted: boolean;
  measuresEnabled: boolean;
  measuresRemaining: number;
  employerFormRequired: boolean;
  employerFormUploaded: boolean;
  openRequests: number;
  submitted: boolean;
}

export type StepKey =
  | "service"
  | "identity"
  | "consents_payment"
  | "payment"
  | "consents_intake"
  | "intake"
  | "measures"
  | "documents"
  | "submit";

export interface ChecklistStep {
  key: StepKey;
  label: string;
  description: string;
  state: "done" | "current" | "locked" | "waiting";
}

export function buildChecklist(f: ChecklistFacts): ChecklistStep[] {
  const identityDone = !f.identityRequired || f.identityStatus === "verified" || f.identityStatus === "pending";
  const raw: { key: StepKey; label: string; description: string; done: boolean; waiting?: boolean; skip?: boolean }[] = [
    { key: "service", label: "Choose your service", description: "Select the documentation you are requesting.", done: f.serviceSelected },
    {
      key: "identity",
      label: "Verify identity and location",
      description: f.identityStatus === "pending" ? "Your ID is being reviewed. You can keep going." : "Upload a photo ID and confirm where you are located.",
      done: identityDone && f.locationConfirmed,
      waiting: f.identityStatus === "pending",
    },
    { key: "consents_payment", label: "Review policies", description: "Financial policy, self-pay agreement and service limitations.", done: f.paymentConsentsSigned },
    {
      key: "payment",
      label: "Pay securely",
      description: f.screeningReviewPending
        ? "A clinician is reviewing your screening answers first. We will notify you when you can continue."
        : "Payment covers the professional assessment, not a particular outcome.",
      done: f.paid,
    },
    { key: "consents_intake", label: "Sign consents", description: "Consent to assessment, telehealth consent and privacy acknowledgements.", done: f.intakeConsentsSigned },
    { key: "intake", label: "Complete secure intake", description: "Your history and how symptoms affect work. Saves as you go.", done: f.intakeSubmitted },
    {
      key: "measures",
      label: "Questionnaires",
      description: "Two short standardized questionnaires.",
      done: f.measuresRemaining === 0,
      skip: !f.measuresEnabled,
    },
    {
      key: "documents",
      label: "Upload your forms",
      description: f.employerFormRequired ? "Upload the employer or leave-administrator form you need completed." : "Upload any employer or leave forms you have (optional).",
      done: (!f.employerFormRequired || f.employerFormUploaded) && f.openRequests === 0,
    },
    { key: "submit", label: "Submit for clinical review", description: "Send your request to a licensed clinician.", done: f.submitted },
  ];
  const steps = raw.filter((s) => !s.skip);
  let currentAssigned = false;
  return steps.map((s) => {
    if (s.done) return { key: s.key, label: s.label, description: s.description, state: s.waiting ? "waiting" : "done" };
    if (!currentAssigned) {
      currentAssigned = true;
      return { key: s.key, label: s.label, description: s.description, state: "current" };
    }
    return { key: s.key, label: s.label, description: s.description, state: "locked" };
  });
}

/** Gate checks used by server actions (defense in depth behind the UI). */
export function gate(f: ChecklistFacts, step: StepKey): { ok: true } | { ok: false; reason: string } {
  const need = (cond: boolean, reason: string) => (cond ? null : reason);
  const identityOk = !f.identityRequired || f.identityStatus === "verified" || f.identityStatus === "pending";
  const checks: Record<StepKey, (string | null)[]> = {
    service: [],
    identity: [need(f.serviceSelected, "Choose a service first.")],
    consents_payment: [need(f.serviceSelected, "Choose a service first.")],
    payment: [
      need(f.serviceSelected, "Choose a service first."),
      need(identityOk && f.locationConfirmed, "Verify your identity and location first."),
      need(f.paymentConsentsSigned, "Review and sign the financial policies first."),
      need(!f.screeningReviewPending, "A clinician is reviewing your screening answers. We will let you know when you can continue."),
    ],
    consents_intake: [need(f.paid, "Payment is needed before intake.")],
    intake: [need(f.paid, "Payment is needed before intake."), need(f.intakeConsentsSigned, "Sign the required consents first.")],
    measures: [need(f.paid, "Payment is needed first."), need(f.intakeConsentsSigned, "Sign the required consents first.")],
    documents: [need(f.paid, "Payment is needed first.")],
    submit: [
      need(f.paid, "Payment is needed first."),
      need(f.intakeConsentsSigned, "Sign the required consents first."),
      need(f.intakeSubmitted, "Complete your intake first."),
      need(!f.measuresEnabled || f.measuresRemaining === 0, "Complete the questionnaires first."),
      need(!f.employerFormRequired || f.employerFormUploaded, "Upload your employer form first."),
      need(identityOk && f.locationConfirmed, "Verify your identity and location first."),
    ],
  };
  const reason = checks[step].find((r) => r !== null);
  return reason ? { ok: false, reason } : { ok: true };
}
