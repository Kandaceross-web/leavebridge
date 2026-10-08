import { z } from "zod";

/**
 * Intake template v1. Question wording is a starting draft for clinical review (CLN-04).
 * Stored versioned in `questionnaires`; this file is the seed and the type contract.
 */
export const intakeQuestionSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  kind: z.enum(["text", "textarea", "single", "multi", "date", "yesno", "state"]),
  label: z.string(),
  help: z.string().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  required: z.boolean().default(false),
  showIf: z.object({ q: z.string(), eq: z.string() }).optional(),
  /** A response equal to this value raises a safety flag (rule subject to CLN-01). */
  safetyValue: z.string().optional(),
  maxLength: z.number().optional(),
});
export const intakeSectionSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedMinutes: z.number(),
  questions: z.array(intakeQuestionSchema),
});
export const intakeDefinitionSchema = z.object({ sections: z.array(intakeSectionSchema).min(1) });
export type IntakeDefinition = z.infer<typeof intakeDefinitionSchema>;
export type IntakeSection = z.infer<typeof intakeSectionSchema>;
export type IntakeQuestion = z.infer<typeof intakeQuestionSchema>;

const yn = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const severity = [
  { value: "none", label: "Not at all" },
  { value: "mild", label: "A little" },
  { value: "moderate", label: "Moderately" },
  { value: "severe", label: "Very much" },
];

export const INTAKE_V1: IntakeDefinition = {
  sections: [
    {
      key: "concern",
      title: "What brings you here",
      description: "In your own words, what has been happening and how it is affecting you.",
      estimatedMinutes: 5,
      questions: [
        { key: "presenting_concern", kind: "textarea", label: "What has been going on that led you to seek this assessment?", required: true, maxLength: 4000 },
        { key: "onset", kind: "single", label: "When did these difficulties begin?", required: true, options: [
          { value: "lt_2w", label: "Less than 2 weeks ago" }, { value: "2w_3m", label: "2 weeks to 3 months ago" },
          { value: "3m_1y", label: "3 months to a year ago" }, { value: "gt_1y", label: "More than a year ago" } ] },
        { key: "recent_change", kind: "textarea", label: "Has anything changed recently, at work or at home?", maxLength: 2000 },
      ],
    },
    {
      key: "symptoms",
      title: "Symptoms and daily life",
      description: "How much each area has been affected over the past two weeks.",
      estimatedMinutes: 4,
      questions: [
        { key: "sym_mood", kind: "single", label: "Low mood", options: severity, required: true },
        { key: "sym_anxiety", kind: "single", label: "Anxiety or worry", options: severity, required: true },
        { key: "sym_sleep", kind: "single", label: "Sleep problems", options: severity, required: true },
        { key: "sym_concentration", kind: "single", label: "Trouble concentrating", options: severity, required: true },
        { key: "sym_energy", kind: "single", label: "Low energy or fatigue", options: severity, required: true },
        { key: "sym_trauma", kind: "single", label: "Distress related to a difficult or traumatic experience", options: severity },
        { key: "daily_activities", kind: "textarea", label: "How have these affected everyday activities such as self-care, household tasks or relationships?", maxLength: 2000 },
      ],
    },
    {
      key: "work",
      title: "Work and functioning",
      description: "How your symptoms affect your job. This helps the clinician understand functional impact.",
      estimatedMinutes: 5,
      questions: [
        { key: "job_title", kind: "text", label: "Job title", required: true, maxLength: 120 },
        { key: "essential_functions", kind: "textarea", label: "Main duties of your job, if you know them", maxLength: 2000 },
        { key: "work_hours", kind: "single", label: "Usual schedule", options: [
          { value: "full_time", label: "Full time" }, { value: "part_time", label: "Part time" }, { value: "shift", label: "Shift or rotating" }, { value: "other", label: "Other" } ] },
        { key: "attendance", kind: "single", label: "Have symptoms affected your attendance?", options: severity, required: true },
        { key: "performance", kind: "single", label: "Have symptoms affected your work performance?", options: severity, required: true },
        { key: "interpersonal", kind: "single", label: "Have symptoms affected how you interact with coworkers?", options: severity },
        { key: "work_examples", kind: "textarea", label: "Specific examples of how work has been affected", maxLength: 3000 },
      ],
    },
    {
      key: "history",
      title: "Health history",
      description: "Past and current care. Share what you are comfortable sharing.",
      estimatedMinutes: 5,
      questions: [
        { key: "prior_mh_care", kind: "yesno", label: "Have you received mental-health care before?", options: yn, required: true },
        { key: "prior_mh_detail", kind: "textarea", label: "Tell us about past care, including any diagnoses you were given", showIf: { q: "prior_mh_care", eq: "yes" }, maxLength: 2000 },
        { key: "hospitalization", kind: "yesno", label: "Have you ever been hospitalized for mental health?", options: yn, required: true },
        { key: "medications", kind: "textarea", label: "Current medications (any kind)", maxLength: 1500 },
        { key: "medical_conditions", kind: "textarea", label: "Medical conditions we should know about", maxLength: 1500 },
        { key: "substance_use", kind: "single", label: "Alcohol or substance use in the past month", options: [
          { value: "none", label: "None" }, { value: "occasional", label: "Occasional" }, { value: "frequent", label: "Frequent" }, { value: "prefer_not", label: "Prefer not to say" } ] },
      ],
    },
    {
      key: "leave",
      title: "Leave and current care",
      description: "Your leave situation and anyone already treating you.",
      estimatedMinutes: 3,
      questions: [
        { key: "previous_leave", kind: "yesno", label: "Have you taken medical leave before?", options: yn, required: true },
        { key: "previous_accommodations", kind: "yesno", label: "Have you had workplace accommodations before?", options: yn },
        { key: "current_providers", kind: "textarea", label: "Current therapist, psychiatrist or primary care provider, if any", maxLength: 1000 },
        { key: "leave_details", kind: "textarea", label: "Anything the clinician should know about your leave request or your employer's form", maxLength: 2000 },
      ],
    },
    {
      key: "safety",
      title: "Safety",
      description: "We ask everyone these questions. If you are in danger now, call or text 988 or call 911.",
      estimatedMinutes: 2,
      questions: [
        { key: "safety_thoughts", kind: "yesno", label: "In the past month, have you had thoughts of ending your life?", options: yn, required: true, safetyValue: "yes" },
        { key: "safety_harm_others", kind: "yesno", label: "In the past month, have you had thoughts of harming someone else?", options: yn, required: true, safetyValue: "yes" },
        { key: "emergency_contact_name", kind: "text", label: "Emergency contact name", required: true, maxLength: 120 },
        { key: "emergency_contact_phone", kind: "text", label: "Emergency contact phone", required: true, maxLength: 40 },
      ],
    },
  ],
};
