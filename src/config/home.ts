/**
 * Homepage copy for the "Maison" design (owner choice, 2026-10-10). Prices are never written here: they come from the
 * live service catalog. Copy describes the existing workflow only and never promises an outcome.
 */

export const HOME_HERO = {
  eyebrow: "A more personal approach to mental healthcare",
  sub: "Professional mental health assessments and leave documentation support, thoughtfully delivered online.",
  primary: "Begin Your Assessment",
  secondary: "Explore Our Services",
  note: "Start with a brief screening to explore whether our service may be right for you.",
};

export const HOME_TRUST = [
  ["Licensed mental health professional", "Every assessment and decision is made by a licensed professional counselor."],
  ["Convenient online assessments", "A secure portal, with a video visit when your clinician needs one."],
  ["Private patient experience", "You review your documents first and decide who receives them."],
] as const;

export const HOME_UNDERSTAND = {
  body: [
    "Anxiety, depression, burnout and other symptoms can make ordinary workdays feel impossible. An assessment gives you a careful, professional look at what is happening.",
    "Your clinician considers your symptoms, how they affect your daily functioning and your work, and whether leave-related documentation is clinically appropriate.",
  ],
  notFor: ["Emergency or crisis care", "Ongoing therapy or medication", "Deciding FMLA eligibility or approving leave"],
  qualification:
    "Payment covers a clinical assessment. Documentation depends on the clinician’s findings; leave approval is determined by the applicable employer or administrator.",
};

export const HOME_EXPERIENCE = [
  ["Clinical expertise", "A licensed professional counselor reviews your case and makes every clinical decision. No software decides, and payment never does."],
  ["Discreet by design", "We do not bill insurance, and nothing reaches your employer unless you choose to share it."],
  ["Online, at your pace", "Begin whenever suits you. Save your intake and return later; a video visit is arranged only when your clinician needs one."],
  ["Clear from the start", "Each fee is published in full, and the refund rules are shown before you pay."],
] as const;

/** The three stages, mapped onto the real seven-step workflow (see /how-it-works). `{price}` is the assessment fee. */
export const HOME_STEPS = [
  {
    title: "Start your screening",
    lede: "Answer a few questions and review the next steps.",
    details: [
      "About two minutes, with no account or payment.",
      "Create your account, upload a photo ID and confirm where you are located.",
      "Pay {price} once, by card, for the assessment.",
    ],
  },
  {
    title: "Complete your assessment",
    lede: "Complete the required intake and participate in the clinical assessment process.",
    details: [
      "Share your history and answer two short questionnaires. You can save and return.",
      "Upload any forms from your employer or leave administrator.",
      "Your clinician reviews everything and books a secure video visit when one is needed.",
    ],
  },
  {
    title: "Receive your outcome",
    lede: "Review your assessment outcome and access documentation when clinically appropriate.",
    details: [
      "Your clinician makes an independent decision and explains it.",
      "Signed documents appear in your private portal.",
      "You read them first and choose who receives them.",
    ],
  },
];

/** Presentation for each service on the homepage, keyed by catalog slug. Services without an entry use their catalog summary. */
export const HOME_SERVICE_COPY: Record<
  string,
  { unit: string; forWho: string; includes: string[]; prereq: string; scope: string; cta: string; href: "start" | "portal" }
> = {
  "mental-health-leave-assessment": {
    unit: "one-time fee",
    forWho: "Adults whose mental health is affecting their work and who need leave documentation considered.",
    includes: [
      "Clinical review of your intake, questionnaires and employer forms",
      "A secure video visit when your clinician needs one",
      "A written outcome from your clinician",
      "Completed FMLA or leave forms when clinically supported",
    ],
    prereq: "18 or older and located in {states} during your care.",
    scope: "Covers the assessment, not a particular outcome.",
    cta: "Begin Your Assessment",
    href: "start",
  },
  "leave-recertification": {
    unit: "per recertification visit",
    forWho: "Patients whose employer or leave administrator has asked to recertify an existing leave.",
    includes: ["Reassessment of your current condition and functioning", "A secure video visit", "Updated documentation when clinically supported"],
    prereq: "The recertification request from your employer or administrator.",
    scope: "Recertification is not automatic.",
    cta: "Request in your portal",
    href: "portal",
  },
  "follow-up-form": {
    unit: "per form",
    forWho: "Existing patients whose employer sends an additional or updated form after the assessment.",
    includes: ["Your clinician completes the form if it matches their clinical findings", "No new visit"],
    prereq: "A completed LeaveBridge assessment.",
    scope: "Does not include a new evaluation. If one is needed, you are told before anything else is charged.",
    cta: "Request in your portal",
    href: "portal",
  },
};

export const HOME_FAQ: [string, string][] = [
  [
    "What does the assessment include?",
    "A review of your intake, two standard questionnaires and any employer forms, a secure video visit when your clinician needs one, a written outcome, and completed leave forms when they are clinically supported.",
  ],
  [
    "Does payment guarantee documentation?",
    "No. Payment covers the clinical assessment. Your clinician decides independently whether documentation is clinically appropriate, and your employer or leave administrator decides whether leave is approved.",
  ],
  [
    "Who provides the assessment?",
    "A licensed professional counselor, not a physician. Credentials and license numbers are listed below and on our About page.",
  ],
  [
    "What information or forms should I prepare?",
    "A photo ID, any form your employer or leave administrator gave you (such as a WH-380-E), the date it is due, and notes on how your symptoms have affected your work.",
  ],
  [
    "How will I receive my outcome?",
    "In your private patient portal. Signed documents appear there for you to read first. We do not send anything to your employer unless you ask us to.",
  ],
  [
    "What if documentation is not clinically appropriate?",
    "Your clinician explains the decision in your portal. The fee covers the assessment whatever the outcome, and you can request a copy of your records to share with another provider.",
  ],
];

/**
 * The Same-Day Mental Health Assessment on the homepage. Wording follows src/config/same-day.ts: the screening is
 * automated, and a work excuse letter is a separate request a licensed clinician reviews and may decline.
 * Never call it a "doctor's excuse": the clinician is a licensed professional counselor.
 */
export const HOME_SAME_DAY = {
  unit: "screening",
  forWho: "For a missed day of work, when you need something sooner than a full assessment.",
  includes: [
    "Standard anxiety and depression questionnaires (GAD-7 and PHQ-9), online at any time",
    "A digitally signed record of your results that anyone can verify",
    "The option to request a work excuse letter afterward",
    "The option to ask us to contact you about a full assessment",
  ],
  prereq: "Located in {states} when you complete it.",
  scope:
    "The screening is automated, not a clinician examination or a work excuse. A licensed clinician reviews each excuse letter request and may approve, change or decline it.",
  cta: "About the same-day assessment",
};
