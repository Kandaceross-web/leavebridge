/**
 * FMLA basics check content. Shared by the React component and the plain script used on the static public preview
 * (scripts/export-public-site.ts), so both show the same words.
 */
export type BasicsAnswer = "yes" | "no" | "unsure";
export type BasicsResult = "likely" | "unsure" | "unlikely";

export const BASICS_QUESTIONS = [
  {
    id: "size",
    legend:
      "Does your employer have 50 or more employees working within 75 miles of your worksite?",
    hint: "Public agencies and schools are covered by FMLA at any size, but this 50-employee rule still applies to whether you are eligible.",
  },
  {
    id: "months",
    legend: "Have you worked for this employer for at least 12 months in total?",
    hint: "The months don't need to be in a row.",
  },
  {
    id: "hours",
    legend: "Have you worked at least 1,250 hours in the last 12 months?",
    hint: "That's about 24 hours a week. Paid time off doesn't count toward it.",
  },
] as const;

export const BASICS_OPTIONS: { value: BasicsAnswer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "I'm not sure" },
];

export const BASICS_RESULTS: Record<BasicsResult, { card: string; title: string; body: string }> = {
  likely: {
    card: "card-mint",
    title: "FMLA may apply to your job",
    body: "Your answers match the basic FMLA eligibility rules. Your employer or leave administrator makes the final decision, and FMLA leave also needs a serious health condition supported by medical certification.",
  },
  unsure: {
    card: "card-sun",
    title: "Check the details with HR",
    body: "Your HR team or leave administrator can tell you your months and hours of service and whether your worksite meets the 50-employee rule.",
  },
  unlikely: {
    card: "card-lavender",
    title: "FMLA may not apply, but you may still have options",
    body: "Your employer’s own leave policy, short-term disability coverage, or a workplace accommodation may still help. Ask HR what applies to you.",
  },
};

export function basicsResult(values: BasicsAnswer[]): BasicsResult {
  return values.includes("no") ? "unlikely" : values.includes("unsure") ? "unsure" : "likely";
}
