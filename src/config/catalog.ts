import type { ConsentStage, DocumentationType, ReviewTag } from "@/domain/constants";

/**
 * Seed catalog: the initial rows the admin console manages afterwards. Changing these values
 * in production happens in the console (audited), not by editing this file.
 */

/** Owner decision 2026-10-08 (OWN-05): $279.99 covers the assessment and its paperwork only. */
export const LAUNCH_PRICE_CENTS = 27999;
/** Owner decision 2026-10-08: recertification visit. */
export const RECERTIFICATION_PRICE_CENTS = 11999;
/** Owner decision 2026-10-08: each follow-up form. Assumed to mean per form request, no visit (confirm with owner). */
export const FOLLOW_UP_FORM_PRICE_CENTS = 999;
/** Owner request 2026-10-09: Same-Day Mental Health Assessment (automated screening record). */
export const SAME_DAY_SCREENING_PRICE_CENTS = 2999;
export const SAME_DAY_SERVICE_SLUG = "same-day-mental-health-assessment";

export interface ServiceSeed {
  slug: string;
  name: string;
  summary: string;
  description: string;
  documentationType: DocumentationType;
  enabled: boolean;
  requiresSession: boolean;
  requiresIdentityVerification: boolean;
  requiresEmployerForm: boolean;
  sessionMinutes: number;
  displayOrder: number;
  priceCents: number;
  reviewTag: ReviewTag | null;
}

export const SERVICES: ServiceSeed[] = [
  {
    slug: "mental-health-leave-assessment",
    name: "Mental Health Leave Assessment",
    summary: "An independent clinical assessment when mental-health symptoms may be affecting your ability to work.",
    description:
      "A licensed mental-health clinician reviews your intake, questionnaires and employer forms, meets with you by secure video when needed, and makes an independent clinical determination. When documentation is clinically supported, the clinician completes it for continuous leave, intermittent leave or a reduced schedule, as appropriate.",
    documentationType: "initial",
    enabled: true,
    requiresSession: true,
    requiresIdentityVerification: true,
    requiresEmployerForm: false,
    sessionMinutes: 30, // CLN-11: owner chose 30-minute assessment visits on 2026-10-09
    displayOrder: 1,
    priceCents: LAUNCH_PRICE_CENTS,
    reviewTag: null,
  },
  {
    slug: "leave-recertification",
    name: "Leave Recertification",
    summary: "Re-evaluation when your employer requests recertification of an existing leave.",
    description:
      "For people whose employer or leave administrator has asked for recertification. The clinician reassesses your current condition and functioning; recertification is not automatic.",
    documentationType: "recertification",
    enabled: true,
    requiresSession: true,
    requiresIdentityVerification: true,
    requiresEmployerForm: true,
    sessionMinutes: 30,
    displayOrder: 2,
    priceCents: RECERTIFICATION_PRICE_CENTS,
    reviewTag: null,
  },
  {
    slug: "follow-up-form",
    name: "Follow-up Form",
    summary: "An additional or updated form after your assessment, such as a follow-up form your employer sends.",
    description:
      "For existing patients whose employer or leave administrator sends an additional or updated form after the assessment. Your clinician completes it only if it is consistent with their clinical findings; if a new evaluation is needed, they will tell you before anything else is charged.",
    documentationType: "follow_up_form",
    enabled: true,
    requiresSession: false,
    requiresIdentityVerification: true,
    requiresEmployerForm: true,
    sessionMinutes: 0,
    displayOrder: 3,
    priceCents: FOLLOW_UP_FORM_PRICE_CENTS,
    reviewTag: "OWNER_DECISION_REQUIRED",
  },
  {
    slug: SAME_DAY_SERVICE_SLUG,
    name: "Same-Day Mental Health Assessment",
    summary: "An automated mental-health screening (PHQ-9, GAD-7 or both) with a secure, verifiable screening record, available any time.",
    description:
      "You answer standard screening questionnaires and questions about how symptoms affect your work. The system scores them automatically and issues an Automated Mental Health Screening Record. It is an automated screening, not an examination by a clinician, a diagnosis, an FMLA certification or a work excuse. A clinician-reviewed work excuse letter can be requested separately.",
    documentationType: "automated_screening",
    enabled: true,
    requiresSession: false,
    requiresIdentityVerification: false,
    requiresEmployerForm: false,
    sessionMinutes: 0,
    displayOrder: 6,
    priceCents: SAME_DAY_SCREENING_PRICE_CENTS,
    reviewTag: "CLINICAL_REVIEW_REQUIRED",
  },
  {
    slug: "leave-extension",
    name: "Leave Extension Review",
    summary: "Clinical review when you may need more time than originally documented.",
    description: "The clinician reviews whether an extension is clinically supported based on your current condition. An extension is not guaranteed.",
    documentationType: "extension",
    enabled: false,
    requiresSession: true,
    requiresIdentityVerification: true,
    requiresEmployerForm: false,
    sessionMinutes: 30,
    displayOrder: 4,
    priceCents: LAUNCH_PRICE_CENTS,
    reviewTag: "OWNER_DECISION_REQUIRED",
  },
  {
    slug: "return-to-work-review",
    name: "Return-to-Work Review",
    summary: "Clinical review of readiness to return to work, where clinically and legally appropriate.",
    description: "Offered only where appropriate for the clinician's scope and the patient's situation. Pending clinical and legal review.",
    documentationType: "return_to_work",
    enabled: false,
    requiresSession: true,
    requiresIdentityVerification: true,
    requiresEmployerForm: false,
    sessionMinutes: 30,
    displayOrder: 5,
    priceCents: LAUNCH_PRICE_CENTS,
    reviewTag: "CLINICAL_REVIEW_REQUIRED",
  },
];

export const JURISDICTIONS: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"],
  ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

const PLACEHOLDER = (id: string) =>
  `> **[LEGAL REVIEW REQUIRED: ${id}]** This is placeholder text for development. It is not final legal language and must be replaced by attorney-approved content before production use.\n\n`;

export interface ConsentSeed {
  key: string;
  title: string;
  requiredBefore: ConsentStage;
  order: number;
  body: string;
}

export const CONSENTS: ConsentSeed[] = [
  {
    key: "financial_policy",
    title: "Financial and refund policy",
    requiredBefore: "payment",
    order: 1,
    body:
      PLACEHOLDER("LEG-04, LEG-09") +
      "The fee pays for a professional clinical assessment service. It does not purchase a diagnosis, a certification, documentation, a particular leave type or duration, or any decision by an employer, insurer or leave administrator.\n\nRefunds follow the cancellation and refund rules shown on the pricing page at the time of purchase.",
  },
  {
    key: "self_pay_agreement",
    title: "Self-pay agreement",
    requiredBefore: "payment",
    order: 2,
    body: PLACEHOLDER("LEG-04, LEG-08") + "LeaveBridge Health does not bill insurance. You agree to pay for this service yourself. A Good Faith Estimate will be provided where required by law.",
  },
  {
    key: "service_limitations",
    title: "Service limitations",
    requiredBefore: "payment",
    order: 3,
    body:
      PLACEHOLDER("LEG-04") +
      "This service is a time-limited assessment. It is not ongoing therapy, medication management or emergency care. The clinician uses independent professional judgment and may determine that documentation is not clinically supported or that another type of care is more appropriate.",
  },
  {
    key: "informed_consent",
    title: "Consent to assessment",
    requiredBefore: "intake",
    order: 4,
    body: PLACEHOLDER("LEG-04, STR-06") + "You consent to a mental-health assessment by a licensed clinician, including review of the information and documents you provide.",
  },
  {
    key: "telehealth_consent",
    title: "Telehealth consent",
    requiredBefore: "intake",
    order: 5,
    body: PLACEHOLDER("LEG-04, STR-04") + "You consent to receive services by secure video and messaging, and you understand the benefits and limits of telehealth, including technology failures and emergency procedures.",
  },
  {
    key: "privacy_acknowledgement",
    title: "Notice of Privacy Practices acknowledgement",
    requiredBefore: "intake",
    order: 6,
    body: PLACEHOLDER("LEG-03, LEG-15") + "You acknowledge that you received the Notice of Privacy Practices describing how your health information may be used and disclosed.",
  },
  {
    key: "communication_consent",
    title: "Email and text notification consent",
    requiredBefore: "intake",
    order: 7,
    body: PLACEHOLDER("LEG-13") + "Notifications by email (and text, if you opt in) only tell you that something changed in your portal. They never contain health details. You can change preferences anytime.",
  },
  {
    key: "release_authorization",
    title: "Authorization to release documentation",
    requiredBefore: "release",
    order: 8,
    body: PLACEHOLDER("LEG-07") + "You authorize LeaveBridge Health to send the documents you select to the recipient you name, until the expiration date you choose or until you revoke this authorization.",
  },
];

export interface ContentSeed {
  kind: "faq" | "legal" | "page_section" | "resource" | "state";
  key: string;
  category?: string;
  title: string;
  body: string;
  reviewTag: ReviewTag | null;
  order: number;
}

export const FAQ_CATEGORIES: { key: string; label: string }[] = [
  { key: "about", label: "About the assessment" },
  { key: "fmla", label: "FMLA and workplace leave" },
  { key: "payment", label: "Payment" },
  { key: "documentation", label: "Documentation" },
  { key: "telehealth", label: "Telehealth" },
  { key: "privacy", label: "Privacy" },
  { key: "appointments", label: "Appointments" },
  { key: "forms", label: "Employer forms" },
  { key: "after", label: "After the assessment" },
];

const faq = (category: string, order: number, key: string, title: string, body: string, reviewTag: ReviewTag | null = "LEGAL_REVIEW_REQUIRED"): ContentSeed => ({
  kind: "faq",
  key: `faq.${category}.${key}`,
  category,
  title,
  body,
  reviewTag,
  order,
});

export const CONTENT: ContentSeed[] = [
  faq("about", 1, "what", "What is a mental health leave assessment?", "It is a professional evaluation by a licensed mental-health clinician of how your symptoms are affecting your ability to work. The clinician decides independently whether leave documentation is clinically supported.", null),
  faq("about", 2, "who", "Who is this for?", "Adults 18 and older whose mental-health symptoms may be affecting their work, who are located in a state where our clinicians are licensed, and who may need documentation for medical leave.", null),
  faq("about", 3, "guarantee", "Does paying guarantee I will get documentation?", "No. Your payment covers the professional assessment. The clinician may determine that documentation is not clinically supported, that more information is needed, or that a different kind of care is more appropriate."),
  faq("fmla", 1, "eligibility", "Does LeaveBridge decide whether I am eligible for FMLA?", "No. FMLA eligibility depends on your employer and your employment history, and leave decisions are made by your employer or leave administrator. Our clinicians provide a clinical assessment and, when supported, medical documentation."),
  faq("fmla", 2, "types", "What is the difference between continuous and intermittent leave?", "Continuous leave is a single block of time away from work. Intermittent leave is time off in separate periods as needed. A reduced schedule means working fewer hours. The clinician documents what is clinically supported, which may differ from what was requested."),
  faq("payment", 1, "cost", "How much does it cost?", "The Mental Health Leave Assessment is $279.99, self-pay, and covers the assessment and its paperwork. A recertification visit is $119.99 and each follow-up form is $9.99. We do not bill insurance.", "OWNER_DECISION_REQUIRED"),
  faq("payment", 2, "refunds", "Can I get a refund?", "Refunds depend on how far your case has progressed. The current cancellation and refund rules are shown on the pricing page and before you pay."),
  faq("documentation", 1, "what-docs", "What documentation can the clinician complete?", "When clinically supported, the clinician can complete employer or leave-administrator medical certification forms and supporting letters within their professional scope."),
  faq("documentation", 2, "provider-type", "Will my employer accept a form from your clinician?", "Employers and leave administrators set their own rules about which provider types may complete their forms. Please check with your HR department or leave administrator before you pay."),
  faq("documentation", 3, "employer-rejects", "What if my employer won't accept my form?", "First, ask your employer exactly what is missing or why the form was not accepted, and send that request to us through your portal messages. If a form we completed is incomplete or unclear, your clinician will correct or clarify it at no extra charge. If your employer only accepts certain provider types, we can give you a copy of your assessment records to take to a provider your employer accepts. Refunds follow our refund policy, which is based on how far your case progressed, not on your employer's decision.", "OWNER_DECISION_REQUIRED"),
  faq("telehealth", 1, "how", "How do telehealth appointments work?", "If your clinician needs to meet with you, you will schedule a secure video visit from your portal. You must be physically located in a state where the clinician is licensed during the visit."),
  faq("privacy", 1, "employer-see", "Will my employer see my health information?", "No information is sent to your employer unless you authorize it. You choose which completed documents to share, and with whom.", null),
  faq("privacy", 2, "security", "How do you protect my information?", "Health information is encrypted in transit and at rest, access is limited to the people involved in your care, and every access is logged.", "SECURITY_REVIEW_REQUIRED"),
  faq("appointments", 1, "when", "When will I meet with a clinician?", "After you submit your intake, a clinician reviews your information. If a video assessment is needed, you will be asked to choose an available time.", null),
  faq("forms", 1, "upload", "How do I share my employer's forms?", "Upload them securely in your portal as PDF, JPG or PNG files. You will not be asked to upload the same document twice.", null),
  faq("after", 1, "next", "What happens after the assessment?", "Your clinician records a determination and explains it in your portal. If documentation is clinically supported, it is completed, signed and delivered securely in your portal.", null),
  faq("after", 2, "employer-decision", "What if my employer denies my leave?", "Leave decisions belong to your employer or leave administrator. LeaveBridge cannot appeal on your behalf. You may wish to talk with HR or an employment attorney."),
  {
    kind: "legal", key: "legal.privacy", title: "Privacy Policy", order: 1, reviewTag: "LEGAL_REVIEW_REQUIRED",
    body: PLACEHOLDER("LEG-14, LEG-15") + "This page will describe what information LeaveBridge Health collects on its public website and in its patient portal, how it is used, and your choices.",
  },
  {
    kind: "legal", key: "legal.terms", title: "Terms of Use", order: 2, reviewTag: "LEGAL_REVIEW_REQUIRED",
    body: PLACEHOLDER("LEG-15") + "This page will contain the terms that govern use of the LeaveBridge Health website and portal.",
  },
  {
    kind: "legal", key: "legal.notice-of-privacy-practices", title: "Notice of Privacy Practices", order: 3, reviewTag: "LEGAL_REVIEW_REQUIRED",
    body: PLACEHOLDER("LEG-03") + "This notice will describe how medical information about you may be used and disclosed and how you can get access to this information.",
  },
  {
    kind: "legal", key: "legal.telehealth", title: "Telehealth Disclosures", order: 4, reviewTag: "STATE_RULE_REQUIRED",
    body: PLACEHOLDER("STR-04") + "State-specific telehealth disclosures will appear here for each active state.",
  },
  {
    kind: "legal", key: "legal.financial-policy", title: "Financial and Refund Policy", order: 5, reviewTag: "LEGAL_REVIEW_REQUIRED",
    body: PLACEHOLDER("LEG-09") + "The current refund rules are listed on the pricing page.",
  },
  {
    kind: "legal", key: "legal.records", title: "Records Access and Retention", order: 6, reviewTag: "LEGAL_REVIEW_REQUIRED",
    body: PLACEHOLDER("LEG-18, STR-05") + "This page will explain how to request a copy of your records, request an amendment, and how long records are retained.",
  },
];

export interface TemplateSeed {
  key: string;
  channel: "email" | "sms" | "in_app";
  subject: string | null;
  body: string;
}

const generic = "There is a new update in your {{brand_name}} portal. Sign in to view it: {{portal_link}}";

export const TEMPLATES: TemplateSeed[] = [
  { key: "account_created", channel: "email", subject: "Welcome to {{brand_name}}", body: "Hi {{first_name}}, your account is ready. Sign in anytime at {{portal_link}}." },
  { key: "payment_received", channel: "email", subject: "Payment received", body: "Hi {{first_name}}, we received your payment. Your next steps are waiting in your portal: {{portal_link}}" },
  { key: "intake_incomplete", channel: "email", subject: "Pick up where you left off", body: "Hi {{first_name}}, you have a few steps left in your portal: {{portal_link}}" },
  { key: "document_requested", channel: "email", subject: "Action needed in your portal", body: generic },
  { key: "information_requested", channel: "email", subject: "Action needed in your portal", body: generic },
  { key: "appointment_needed", channel: "email", subject: "Please choose a time", body: "Hi {{first_name}}, please sign in to choose an appointment time: {{portal_link}}" },
  { key: "appointment_scheduled", channel: "email", subject: "Your appointment is booked", body: "Hi {{first_name}}, your appointment is confirmed. Details are in your portal: {{portal_link}}" },
  { key: "appointment_reminder", channel: "email", subject: "Upcoming appointment", body: "Hi {{first_name}}, you have an upcoming appointment. Details are in your portal: {{portal_link}}" },
  { key: "case_update", channel: "email", subject: "Update in your portal", body: generic },
  { key: "documents_ready", channel: "email", subject: "Documents available", body: "Hi {{first_name}}, a document is available in your portal: {{portal_link}}" },
  { key: "new_message", channel: "email", subject: "New secure message", body: "Hi {{first_name}}, you have a new secure message in your portal: {{portal_link}}" },
  { key: "case_update", channel: "sms", subject: null, body: "{{brand_name}}: there is an update in your portal. {{portal_link}}" },
];

export const IN_APP_COPY: Record<string, { title: string; body: string }> = {
  account_created: { title: "Welcome", body: "Your account is ready." },
  payment_received: { title: "Payment received", body: "Your secure intake is now open." },
  intake_incomplete: { title: "Steps remaining", body: "Your intake has a few steps left." },
  document_requested: { title: "Document requested", body: "Your care team asked for a document." },
  information_requested: { title: "Information requested", body: "Your clinician asked for more information." },
  appointment_needed: { title: "Choose an appointment", body: "Your clinician would like to meet by video." },
  appointment_scheduled: { title: "Appointment booked", body: "Your telehealth appointment is confirmed." },
  appointment_reminder: { title: "Upcoming appointment", body: "You have an appointment coming up." },
  case_update: { title: "Case update", body: "Your case status changed." },
  documents_ready: { title: "Documents available", body: "A completed document is ready to download." },
  new_message: { title: "New message", body: "You have a new secure message." },
};
