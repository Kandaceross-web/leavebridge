/**
 * Homepage copy, verbatim from the owner's "Exact Website Corrections — Implementation Specification V1" (2026-10-10).
 * Prices are never written here: they come from the live service catalog. Wording that the code shows to be
 * inaccurate is listed in docs/SPEC-V1-REPORT.md for the owner's approval instead of being silently changed.
 */

export const HOME_HERO = {
  title: "Your Health Matters. Your Time Does, Too.",
  body: [
    "Mental health challenges don’t always happen on a convenient schedule. LeaveBridge Health offers confidential online evaluations for individuals seeking work, school, and medical leave documentation.",
    "Professional care. Convenient access. Clear next steps.",
  ],
  primary: "Explore Our Services",
  secondary: "How It Works",
  trust: [
    { icon: "lock", label: "Confidential Online Intake" },
    { icon: "badge", label: "Professional Clinical Standards" },
    { icon: "file", label: "Transparent Pricing" },
  ],
} as const;

export const HOME_SERVICES_INTRO = {
  title: "How Can We Help?",
  body: "Choose the service that fits your needs. Clear pricing, confidential intake, and a straightforward process from the beginning.",
};

export interface ServiceCardCopy {
  title: string;
  benefit: string;
  summary: string;
  includes: string[];
  cta: string;
  href: string;
  disclosure: string;
}

/** Card one: the $29.99 same-day service. Card two: the $279.99 leave assessment. */
export const SERVICE_CARD_EXCUSE: ServiceCardCopy = {
  title: "Work & School Excuse Evaluations",
  benefit: "For the days when mental health affects your ability to show up.",
  summary: "Request an evaluation for a mental health-related absence from work or school through our convenient online process.",
  includes: [
    "Confidential online intake",
    "Standardized mental health screening",
    "Assessment results",
    "Review of your documentation request, where included in the service",
    "Secure access to available documentation",
  ],
  cta: "Request an Evaluation",
  href: "/work-school-excuses",
  disclosure:
    "Work or school absence documentation is issued only when supported by an appropriate clinical evaluation. Completion of a questionnaire does not guarantee an excuse.",
};

export const SERVICE_CARD_FMLA: ServiceCardCopy = {
  title: "Mental Health Leave & FMLA Evaluations",
  benefit: "When your mental health affects your ability to work, we’re here to help you navigate the next step.",
  summary: "Receive an individualized mental health evaluation to determine whether leave-related clinical documentation is appropriate.",
  includes: [
    "Confidential clinical intake",
    "Comprehensive mental health evaluation",
    "Review of relevant symptoms and functional concerns",
    "Assessment of requested leave-related documentation",
    "Clinical recommendations and documentation when appropriate",
  ],
  cta: "Begin Your Evaluation",
  href: "/fmla-evaluations",
  disclosure: "Clinical findings determine whether documentation can be issued. FMLA eligibility and employer approval are separate determinations.",
};

export const HOME_STEPS = {
  title: "A Simpler Way to Get Started.",
  body: "We’ve designed our online process to make requesting an evaluation clear and convenient.",
  steps: [
    ["Choose Your Service", "Select the evaluation that best matches your documentation needs."],
    ["Complete Your Intake", "Provide your information and complete the required assessment steps through our secure online platform."],
    ["Receive Your Evaluation Outcome", "Review your results, any required clinical next steps, and the status of your documentation request."],
  ],
  cta: "Explore Our Services",
} as const;

export const HOME_WHY = {
  title: "Care That Respects Your Time.",
  body: "Seeking mental health support and documentation shouldn’t feel unnecessarily complicated. We combine convenient technology with professional clinical standards to make the evaluation process easier to navigate.",
  blocks: [
    ["Convenient Access", "Begin your request online, on your schedule."],
    ["Confidential Experience", "Share sensitive information through our protected intake process."],
    ["Professional Evaluation", "Clinical decisions are guided by professional judgment and appropriate assessment standards."],
    ["Clear Pricing", "Know the price of your selected evaluation before you begin."],
  ],
} as const;

export const HOME_CREDIBILITY = {
  title: "Built on Professional Clinical Expertise.",
  body: "LeaveBridge Health is founded on a commitment to accessible mental health evaluations, ethical clinical practice, and professional documentation standards.",
};

/** Part 7 and Part 9: the four documentation categories. */
export const LEAVE_CATEGORIES = [
  ["Continuous Leave", "Evaluation of mental health concerns that may require an extended period away from work."],
  ["Intermittent Leave", "Evaluation of conditions that may require periodic absences."],
  ["Reduced Work Schedule", "Evaluation of mental health concerns that may affect the ability to maintain a regular work schedule."],
  ["Workplace Accommodations", "Evaluation of clinically supported workplace adjustment requests."],
] as const;
