import type { RulesetDefinition } from "@/domain/screening/engine";

/**
 * Screening ruleset v1 (seed). Every rule below is a conservative placeholder pending clinical
 * review (CLN-03) and legal review (LEG-01). No answer is used to decide FMLA eligibility.
 */
export const SCREENING_V1: RulesetDefinition = {
  steps: [
    { key: "location", title: "Where you are", description: "Licensure depends on where you are physically located during care." },
    { key: "safety", title: "Your safety", description: "We ask everyone this before continuing." },
    { key: "situation", title: "Your situation", description: "A few questions about why you are here." },
    { key: "leave", title: "Your leave request", description: "What you know so far. It's fine to be unsure." },
  ],
  questions: [
    { key: "age_18", step: "location", kind: "single", label: "Are you 18 or older?", required: true, options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" } ] },
    { key: "current_state", step: "location", kind: "state", label: "Which state are you in right now?", required: true },
    { key: "appointment_state", step: "location", kind: "state", label: "Which state will you be in during your assessment?", help: "You must be physically located in a state where our clinicians are licensed at the time of care.", required: true },

    { key: "safety_now", step: "safety", kind: "single", label: "Are you currently thinking about harming yourself or someone else, or are you in immediate danger?", required: true, options: [
      { value: "no", label: "No" }, { value: "yes", label: "Yes" }, { value: "unsure", label: "I'm not sure" } ] },

    { key: "reason", step: "situation", kind: "multi", label: "What is prompting you to seek an assessment?", required: true, options: [
      { value: "symptoms_affect_work", label: "Mental-health symptoms are affecting my ability to work" },
      { value: "employer_requested", label: "My employer or HR asked for medical documentation" },
      { value: "currently_on_leave", label: "I am already on leave and need documentation" },
      { value: "returning", label: "I am preparing to return to work" },
      { value: "other", label: "Something else" } ] },
    { key: "own_condition", step: "situation", kind: "single", label: "Is the leave for your own health condition?", required: true, options: [
      { value: "yes", label: "Yes, my own" }, { value: "family", label: "No, a family member's" } ] },
    { key: "employer_type", step: "situation", kind: "single", label: "What kind of employer do you work for?", required: true, options: [
      { value: "private", label: "Private company" }, { value: "public", label: "Government or public agency" },
      { value: "school", label: "School or university" }, { value: "corrections", label: "Correctional facility" },
      { value: "healthcare", label: "Healthcare organization" }, { value: "other", label: "Other or self-employed" } ] },
    { key: "employment_length", step: "situation", kind: "single", label: "How long have you worked there?", required: true, options: [
      { value: "lt_12m", label: "Less than 12 months" }, { value: "gte_12m", label: "12 months or more" }, { value: "unsure", label: "Not sure" } ] },
    { key: "hours_worked", step: "situation", kind: "single", label: "About how many hours do you work in a typical week?", required: true, options: [
      { value: "lt_24", label: "Fewer than 24" }, { value: "24_plus", label: "24 or more" }, { value: "varies", label: "It varies" } ] },
    { key: "current_provider", step: "situation", kind: "single", label: "Are you currently seeing a mental-health provider?", required: true, options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" } ] },

    { key: "leave_type", step: "leave", kind: "single", label: "What kind of leave are you requesting, if you know?", required: true, options: [
      { value: "continuous", label: "Continuous (a block of time away)" }, { value: "intermittent", label: "Intermittent (time off as needed)" },
      { value: "reduced_schedule", label: "Reduced schedule" }, { value: "unsure", label: "Not sure yet" } ] },
    { key: "hr_contacted", step: "leave", kind: "single", label: "Have you talked with HR or a leave administrator?", required: true, options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "Not yet" } ] },
    { key: "has_form", step: "leave", kind: "single", label: "Do you have a form from your employer or leave administrator?", required: true, options: [
      { value: "yes", label: "Yes" }, { value: "expected", label: "I expect to receive one" }, { value: "no", label: "No" } ] },
    { key: "provider_type_accepted", step: "leave", kind: "single", label: "Has your employer or leave administrator said which kinds of licensed providers may complete their form?", help: "Some accept forms only from certain provider types. If you are unsure, that's okay.", required: true, options: [
      { value: "any_licensed", label: "Any licensed health provider" }, { value: "restricted", label: "Only certain provider types (for example, physicians)" }, { value: "unsure", label: "I don't know" } ] },
    { key: "deadline", step: "leave", kind: "date", label: "Is there a deadline for your documentation?", help: "Leave blank if there is no deadline.", required: false },
    { key: "previous_leave", step: "leave", kind: "single", label: "Is this a new request or a renewal of an earlier leave?", required: true, options: [
      { value: "new", label: "New request" }, { value: "recert", label: "Recertification or extension of an earlier leave" } ] },
  ],
  rules: [
    { id: "emergency-safety", when: { q: "safety_now", op: "eq", value: "yes" }, outcome: "EMERGENCY", reasonCode: "SAFETY_IMMEDIATE" },
    { id: "review-safety-unsure", when: { q: "safety_now", op: "eq", value: "unsure" }, outcome: "NEEDS_REVIEW", reasonCode: "SAFETY_UNSURE" },
    { id: "na-under-18", when: { q: "age_18", op: "eq", value: "no" }, outcome: "NOT_AVAILABLE", reasonCode: "UNDER_18" },
    { id: "na-state-current", when: { q: "current_state", op: "state_inactive" }, outcome: "NOT_AVAILABLE", reasonCode: "STATE_NOT_ACTIVE" },
    { id: "na-state-appointment", when: { q: "appointment_state", op: "state_inactive" }, outcome: "NOT_AVAILABLE", reasonCode: "APPOINTMENT_STATE_NOT_ACTIVE" },
    { id: "na-family", when: { q: "own_condition", op: "eq", value: "family" }, outcome: "NOT_AVAILABLE", reasonCode: "NOT_OWN_CONDITION" },
    { id: "review-states-differ", when: { op: "answers_differ", a: "current_state", b: "appointment_state" }, outcome: "NEEDS_REVIEW", reasonCode: "LOCATION_CHANGE" },
    { id: "review-provider-restricted", when: { q: "provider_type_accepted", op: "eq", value: "restricted" }, outcome: "NEEDS_REVIEW", reasonCode: "PROVIDER_TYPE_RESTRICTED" },
    { id: "review-deadline-soon", when: { q: "deadline", op: "date_within_days", value: 3 }, outcome: "NEEDS_REVIEW", reasonCode: "DEADLINE_IMMINENT" },
    { id: "review-recert", when: { q: "previous_leave", op: "eq", value: "recert" }, outcome: "NEEDS_REVIEW", reasonCode: "RECERT_REQUEST" },
  ],
};

export const REASON_CODE_LABEL: Record<string, string> = {
  SAFETY_IMMEDIATE: "Immediate safety concern reported",
  SAFETY_UNSURE: "Unsure about immediate safety",
  UNDER_18: "Under 18",
  STATE_NOT_ACTIVE: "Current state not active",
  APPOINTMENT_STATE_NOT_ACTIVE: "Appointment state not active",
  NOT_OWN_CONDITION: "Leave for a family member",
  LOCATION_CHANGE: "Current and appointment states differ",
  PROVIDER_TYPE_RESTRICTED: "Employer may restrict provider types",
  DEADLINE_IMMINENT: "Documentation deadline within 3 days",
  RECERT_REQUEST: "Recertification or extension request",
};
