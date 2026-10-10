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
    summary:
      "An independent clinical assessment when mental-health symptoms may be affecting your ability to work.",
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
    summary:
      "An additional or updated form after your assessment, such as a follow-up form your employer sends.",
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
    summary:
      "An automated mental-health screening (PHQ-9, GAD-7 or both) with a secure, verifiable screening record, available any time.",
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
    description:
      "The clinician reviews whether an extension is clinically supported based on your current condition. An extension is not guaranteed.",
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
    summary:
      "Clinical review of readiness to return to work, where clinically and legally appropriate.",
    description:
      "Offered only where appropriate for the clinician's scope and the patient's situation. Pending clinical and legal review.",
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
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
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
    body:
      PLACEHOLDER("LEG-04, LEG-08") +
      "LeaveBridge Health does not bill insurance. You agree to pay for this service yourself. A Good Faith Estimate will be provided where required by law.",
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
    body:
      PLACEHOLDER("LEG-04, STR-06") +
      "You consent to a mental-health assessment by a licensed clinician, including review of the information and documents you provide.",
  },
  {
    key: "telehealth_consent",
    title: "Telehealth consent",
    requiredBefore: "intake",
    order: 5,
    body:
      PLACEHOLDER("LEG-04, STR-04") +
      "You consent to receive services by secure video and messaging, and you understand the benefits and limits of telehealth, including technology failures and emergency procedures.",
  },
  {
    key: "privacy_acknowledgement",
    title: "Notice of Privacy Practices acknowledgement",
    requiredBefore: "intake",
    order: 6,
    body:
      PLACEHOLDER("LEG-03, LEG-15") +
      "You acknowledge that you received the Notice of Privacy Practices describing how your health information may be used and disclosed.",
  },
  {
    key: "communication_consent",
    title: "Email and text notification consent",
    requiredBefore: "intake",
    order: 7,
    body:
      PLACEHOLDER("LEG-13") +
      "Notifications by email (and text, if you opt in) only tell you that something changed in your portal. They never contain health details. You can change preferences anytime.",
  },
  {
    key: "release_authorization",
    title: "Authorization to release documentation",
    requiredBefore: "release",
    order: 8,
    body:
      PLACEHOLDER("LEG-07") +
      "You authorize LeaveBridge Health to send the documents you select to the recipient you name, until the expiration date you choose or until you revoke this authorization.",
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

// Owner spec V1 (2026-10-10), Part 13: two sections with the owner's questions in this exact order. Answers state only
// what the code and settled decisions support; anything still open carries OWNER_DECISION_REQUIRED or a legal/clinical tag.
export const FAQ_CATEGORIES: { key: string; label: string }[] = [
  { key: "excuses", label: "Work & School Excuses" },
  { key: "fmla", label: "FMLA & Medical Leave" },
];

const faq = (
  category: string,
  order: number,
  key: string,
  title: string,
  body: string,
  reviewTag: ReviewTag | null = "LEGAL_REVIEW_REQUIRED",
): ContentSeed => ({
  kind: "faq",
  key: `faq.${category}.${key}`,
  category,
  title,
  body,
  reviewTag,
  order,
});

export const CONTENT: ContentSeed[] = [
  faq(
    "excuses",
    1,
    "missed-work",
    "Can I request an excuse for missing work?",
    "Yes. After you complete the screening and receive your screening record, you can request a work excuse letter in your portal. A licensed clinician reviews your screening and your request and decides whether to issue a letter. They may change it or decline.",
    null,
  ),
  faq(
    "excuses",
    2,
    "school",
    "Can mental health concerns support a school absence?",
    "Yes. When you request a letter after your screening, you can choose school instead of work. School letters are for adult students 18 and older, such as at a college, university or training program. A licensed clinician reviews your request and decides whether to issue a letter. Your school decides whether to accept it.",
    "CLINICAL_REVIEW_REQUIRED",
  ),
  faq(
    "excuses",
    3,
    "online-assessment",
    "What happens during the online assessment?",
    "You confirm where you are located and answer a few safety questions, create your account, confirm your email and pay. Then you choose the PHQ-9, the GAD-7 or both, and answer questions about your symptoms, your work and any missed time. Your answers are scored by software and a digitally signed screening record is issued in your portal. If an answer about safety needs a clinician's attention, a clinician reviews your screening on the next business day before any record is issued.",
    null,
  ),
  faq(
    "excuses",
    4,
    "guarantee",
    "Does completing the assessment guarantee an excuse?",
    "No. The screening record is not an excuse. A work or school excuse letter is issued only if a licensed clinician reviews your request and decides it is clinically supported.",
    null,
  ),
  faq(
    "excuses",
    5,
    "results-time",
    "How quickly will I receive my results?",
    "Your screening record is usually ready as soon as you finish, unless a safety answer means a clinician reviews it first, which happens on the next business day. Letter requests are reviewed by a clinician; we email you when there is an update. We do not promise a review time.",
    "OWNER_DECISION_REQUIRED",
  ),
  faq(
    "excuses",
    6,
    "clinician-review",
    "Does the $29.99 price include clinician review?",
    "The screening itself is scored by software, not by a clinician. There is no additional charge to request a work or school excuse letter, and every letter request is reviewed individually by a licensed clinician. There is no video visit.",
    "OWNER_DECISION_REQUIRED",
  ),
  faq(
    "excuses",
    7,
    "not-approved",
    "What happens if documentation isn't approved?",
    "The clinician explains their decision in your portal and may recommend a full Mental Health Leave & FMLA Evaluation. You keep your screening record. The fee covers the screening, whatever the outcome of a letter request.",
    null,
  ),
  faq(
    "excuses",
    8,
    "acceptance",
    "Will my employer or school accept my documentation?",
    "Employers and schools set their own rules about which documentation and provider types they accept, so we cannot guarantee acceptance. Please check before you pay. Anyone you share a letter with can confirm it is genuine and unchanged on our verification page.",
    null,
  ),
  faq(
    "excuses",
    9,
    "previous-absence",
    "Can I request documentation for a previous absence?",
    "Yes, within limits. The absence can start up to 14 days before the date of your screening and can last up to 31 days. A longer absence needs a full clinical evaluation. The clinician decides whether the dates are clinically supported.",
    "OWNER_DECISION_REQUIRED",
  ),
  faq(
    "excuses",
    10,
    "refunds",
    "What is the refund policy?",
    "Once your screening record is issued, the fee is not refunded, whatever the outcome of a letter request. If a clinician needs to review your answers before the record is issued, the practice reviews the payment for that screening and contacts you. See the Financial and Refund Policy for the full rules.",
    "OWNER_DECISION_REQUIRED",
  ),
  faq(
    "fmla",
    1,
    "anxiety-depression",
    "Can anxiety or depression qualify for FMLA?",
    "They can. FMLA leave can be taken for a serious health condition, which may include a mental health condition that meets the law's definition. Your employer or leave administrator decides whether you are eligible and approves leave. Our clinician evaluates your condition and, when clinically supported, completes the medical documentation.",
  ),
  faq(
    "fmla",
    2,
    "intermittent",
    "What is intermittent FMLA?",
    "Intermittent leave is time off taken in separate periods as needed, such as occasional days when symptoms flare, rather than one block of time. The clinician documents what is clinically supported, which may differ from what was requested.",
  ),
  faq(
    "fmla",
    3,
    "continuous",
    "Can I request continuous leave?",
    "Yes. Continuous leave is a single block of time away from work. Tell us what your employer or leave administrator has asked for, and your clinician documents what is clinically supported.",
    null,
  ),
  faq(
    "fmla",
    4,
    "diagnosis",
    "Do I need an existing diagnosis?",
    "No diagnosis is needed to begin. Your clinician evaluates your symptoms and how they affect your work. Any existing records you choose to share can help.",
    "CLINICAL_REVIEW_REQUIRED",
  ),
  faq(
    "fmla",
    5,
    "reduced-schedule",
    "Can I request a reduced work schedule?",
    "Yes. A reduced schedule means working fewer hours a day or days a week for a time. Your clinician documents it when it is clinically supported.",
    null,
  ),
  faq(
    "fmla",
    6,
    "accommodations",
    "Can I request workplace accommodations?",
    "A separate accommodation letter is not yet a standard document. If the form you upload from your employer asks about work restrictions or adjustments, your clinician answers those questions when they are clinically supported.",
    "OWNER_DECISION_REQUIRED",
  ),
  faq(
    "fmla",
    7,
    "after",
    "What happens after my evaluation?",
    "Your clinician records a decision and explains it in your portal. If documentation is clinically supported, it is completed, signed and made available securely in your portal. You decide who receives it. We do not send anything to your employer unless you ask us to.",
    null,
  ),
  faq(
    "fmla",
    8,
    "guarantee",
    "Does the $279.99 fee guarantee certification?",
    "No. The fee covers the clinical evaluation and its paperwork. Your clinician may find that documentation is not clinically supported, that more information is needed, or that a different kind of care is more appropriate. FMLA eligibility and employer approval are separate decisions.",
    null,
  ),
  faq(
    "fmla",
    9,
    "timing",
    "How long does documentation take?",
    "Most people can start their intake the same day they create an account. Clinical timelines depend on your case. If you have a deadline, tell us at screening so your clinician can see it.",
    "OWNER_DECISION_REQUIRED",
  ),
  faq(
    "fmla",
    10,
    "more-info",
    "What if my employer requests additional information?",
    "Send the request to us through your portal messages. If a form we completed is incomplete or unclear, your clinician will correct or clarify it at no extra charge. A new or additional form after your evaluation is a follow-up form, $9.99 per form.",
    "OWNER_DECISION_REQUIRED",
  ),
  {
    kind: "legal",
    key: "legal.privacy",
    title: "Privacy Policy",
    order: 1,
    reviewTag: "LEGAL_REVIEW_REQUIRED",
    body:
      PLACEHOLDER("LEG-14, LEG-15") +
      "This page will describe what information LeaveBridge Health collects on its public website and in its patient portal, how it is used, and your choices.",
  },
  {
    kind: "legal",
    key: "legal.terms",
    title: "Terms of Use",
    order: 2,
    reviewTag: "LEGAL_REVIEW_REQUIRED",
    body:
      PLACEHOLDER("LEG-15") +
      "This page will contain the terms that govern use of the LeaveBridge Health website and portal.",
  },
  {
    kind: "legal",
    key: "legal.notice-of-privacy-practices",
    title: "Notice of Privacy Practices",
    order: 3,
    reviewTag: "LEGAL_REVIEW_REQUIRED",
    body:
      PLACEHOLDER("LEG-03") +
      "This notice will describe how medical information about you may be used and disclosed and how you can get access to this information.",
  },
  {
    kind: "legal",
    key: "legal.telehealth",
    title: "Telehealth Disclosures",
    order: 4,
    reviewTag: "STATE_RULE_REQUIRED",
    body:
      PLACEHOLDER("STR-04") +
      "State-specific telehealth disclosures will appear here for each active state.",
  },
  {
    kind: "legal",
    key: "legal.financial-policy",
    title: "Financial and Refund Policy",
    order: 5,
    reviewTag: "LEGAL_REVIEW_REQUIRED",
    body: PLACEHOLDER("LEG-09") + "The current refund rules are listed on the pricing page.",
  },
  {
    kind: "legal",
    key: "legal.records",
    title: "Records Access and Retention",
    order: 6,
    reviewTag: "LEGAL_REVIEW_REQUIRED",
    body:
      PLACEHOLDER("LEG-18, STR-05") +
      "This page will explain how to request a copy of your records, request an amendment, and how long records are retained.",
  },
];

export interface TemplateSeed {
  key: string;
  channel: "email" | "sms" | "in_app";
  subject: string | null;
  body: string;
}

const generic =
  "There is a new update in your {{brand_name}} portal. Sign in to view it: {{portal_link}}";

export const TEMPLATES: TemplateSeed[] = [
  {
    key: "account_created",
    channel: "email",
    subject: "Welcome to {{brand_name}}",
    body: "Hi {{first_name}}, your account is ready. Sign in anytime at {{portal_link}}.",
  },
  // Owner spec V1, Part 17: purchase confirmation, assessment completed, document ready and additional information.
  {
    key: "payment_received",
    channel: "email",
    subject: "Your LeaveBridge Health Evaluation",
    body: "Thank you for choosing LeaveBridge Health.\n\nYour evaluation request has been received.\n\nYou can access your next steps securely through your patient portal: {{portal_link}}\n\nWe appreciate the opportunity to assist you.",
  },
  {
    key: "assessment_completed",
    channel: "email",
    subject: "Your Assessment Has Been Completed",
    body: "Your assessment responses have been successfully submitted.\n\nYou can review the next steps for your selected service through your secure portal: {{portal_link}}\n\nIf additional information or clinical review is required, the portal will provide further instructions.",
  },
  {
    key: "intake_incomplete",
    channel: "email",
    subject: "Pick up where you left off",
    body: "Hi {{first_name}}, you have a few steps left in your portal: {{portal_link}}",
  },
  {
    key: "document_requested",
    channel: "email",
    subject: "Action needed in your portal",
    body: generic,
  },
  {
    key: "information_requested",
    channel: "email",
    subject: "Additional Information Needed",
    body: "Additional information is needed to continue processing your evaluation request.\n\nPlease sign in to your secure portal to review the request and complete the next step: {{portal_link}}",
  },
  {
    key: "appointment_needed",
    channel: "email",
    subject: "Please choose a time",
    body: "Hi {{first_name}}, please sign in to choose an appointment time: {{portal_link}}",
  },
  {
    key: "appointment_scheduled",
    channel: "email",
    subject: "Your appointment is booked",
    body: "Hi {{first_name}}, your appointment is confirmed. Details are in your portal: {{portal_link}}",
  },
  {
    key: "appointment_reminder",
    channel: "email",
    subject: "Upcoming appointment",
    body: "Hi {{first_name}}, you have an upcoming appointment. Details are in your portal: {{portal_link}}",
  },
  { key: "case_update", channel: "email", subject: "Update in your portal", body: generic },
  {
    key: "documents_ready",
    channel: "email",
    subject: "Your LeaveBridge Health Document Is Available",
    body: "Your document is available for secure viewing.\n\nPlease sign in to your LeaveBridge Health portal to access it: {{portal_link}}\n\nFor your privacy, sensitive documentation is not included directly in this email.",
  },
  {
    key: "new_message",
    channel: "email",
    subject: "New secure message",
    body: "Hi {{first_name}}, you have a new secure message in your portal: {{portal_link}}",
  },
  {
    key: "case_update",
    channel: "sms",
    subject: null,
    body: "{{brand_name}}: there is an update in your portal. {{portal_link}}",
  },
];

export const IN_APP_COPY: Record<string, { title: string; body: string }> = {
  account_created: { title: "Welcome", body: "Your account is ready." },
  payment_received: { title: "Payment received", body: "Your secure intake is now open." },
  assessment_completed: {
    title: "Assessment completed",
    body: "Your responses were submitted. Your next steps are in your portal.",
  },
  intake_incomplete: { title: "Steps remaining", body: "Your intake has a few steps left." },
  document_requested: { title: "Document requested", body: "Your care team asked for a document." },
  information_requested: {
    title: "Information requested",
    body: "Your clinician asked for more information.",
  },
  appointment_needed: {
    title: "Choose an appointment",
    body: "Your clinician would like to meet by video.",
  },
  appointment_scheduled: {
    title: "Appointment booked",
    body: "Your telehealth appointment is confirmed.",
  },
  appointment_reminder: {
    title: "Upcoming appointment",
    body: "You have an appointment coming up.",
  },
  case_update: { title: "Case update", body: "Your case status changed." },
  documents_ready: {
    title: "Documents available",
    body: "A completed document is ready to download.",
  },
  new_message: { title: "New message", body: "You have a new secure message." },
};
