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
} as const;

export const HOME_SERVICES_INTRO = {
  title: "How Can We Help?",
};

export interface ServiceCardCopy {
  title: string;
  benefit: string;
  includes: string[];
  cta: string;
  href: string;
  disclosure: string;
}

/** Card one: the $29.99 same-day service. Card two: the $279.99 leave assessment. */
export const SERVICE_CARD_EXCUSE: ServiceCardCopy = {
  title: "Work & School Excuse Evaluations",
  benefit: "For the days when mental health affects your ability to show up.",
  includes: [
    "Standardized PHQ-9 and GAD-7 mental health screening",
    "Licensed clinician review of your letter request",
    "Digitally signed letter with a verification code, when approved",
  ],
  cta: "Request an Evaluation",
  href: "/work-school-excuses",
  disclosure:
    "Work or school absence documentation is issued only when supported by an appropriate clinical evaluation. Completion of a questionnaire does not guarantee an excuse.",
};

export const SERVICE_CARD_FMLA: ServiceCardCopy = {
  title: "Mental Health Leave & FMLA Evaluations",
  benefit: "When your mental health affects your ability to work, we’re here to help you navigate the next step.",
  includes: [
    "Comprehensive mental health evaluation by a licensed clinician",
    "Review of your symptoms and how they affect your work",
    "Completed leave paperwork when clinically appropriate",
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
} as const;

export const HOME_WHY = {
  title: "Care That Respects Your Time.",
  body: "Seeking mental health support and documentation shouldn’t feel unnecessarily complicated. We combine convenient technology with professional clinical standards to make the evaluation process easier to navigate.",
  points: [
    "Your records stay in a private portal that only you control.",
    "Nothing is shared with an employer or school without your written authorization.",
    "Every document we issue carries a code anyone can use to confirm it is genuine.",
  ],
} as const;

export const HOME_FINAL = {
  title: "Take the Next Step With Confidence.",
  cta: "Get Started",
};

/** Owner's credentials redesign (2026-10-10): a compact trust section near the bottom of the homepage. */
export const HOME_CREDIBILITY = {
  title: "Licensed Across Five States",
  body: "Professional mental health services delivered with clinical expertise, discretion, and convenience.",
};

/** Homepage FAQ preview: questions from the published FAQ, by key, linking to /faq for the rest. */
export const HOME_FAQ = {
  title: "Frequently Asked Questions",
  keys: ["faq.excuses.guarantee", "faq.excuses.online-assessment", "faq.excuses.acceptance", "faq.fmla.continuous"],
  more: "See all questions",
};

/** Part 7 and Part 9: the four documentation categories. */
export const LEAVE_CATEGORIES = [
  ["Continuous Leave", "Evaluation of mental health concerns that may require an extended period away from work."],
  ["Intermittent Leave", "Evaluation of conditions that may require periodic absences."],
  ["Reduced Work Schedule", "Evaluation of mental health concerns that may affect the ability to maintain a regular work schedule."],
  ["Workplace Accommodations", "Evaluation of clinically supported workplace adjustment requests."],
] as const;
