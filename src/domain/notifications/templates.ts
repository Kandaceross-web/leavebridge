/**
 * Email and SMS are notification channels, never care channels. Templates may only use
 * variables on this allow-list, and rendered output never includes clinical content.
 */
export const ALLOWED_TEMPLATE_VARS = ["first_name", "portal_link", "support_email", "brand_name"] as const;
export type TemplateVar = (typeof ALLOWED_TEMPLATE_VARS)[number];

const VAR_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Words that suggest clinical content leaked into a template. Advisory, checked on save. */
const RISKY_WORDS = /\b(diagnos\w*|depress\w*|anxiety|suicid\w*|ptsd|bipolar|determination|certif\w*|approved|denied|fmla|medication|phq|gad)\b/i;

export function lintTemplate(text: string): string[] {
  const problems: string[] = [];
  for (const m of text.matchAll(VAR_RE)) {
    if (!ALLOWED_TEMPLATE_VARS.includes(m[1] as TemplateVar)) problems.push(`Variable "${m[1]}" is not allowed in notifications.`);
  }
  if (RISKY_WORDS.test(text)) problems.push("Notifications must not mention conditions, outcomes or leave decisions.");
  return problems;
}

export function renderTemplate(text: string, vars: Partial<Record<TemplateVar, string>>): string {
  return text.replace(VAR_RE, (_, name: string) => (ALLOWED_TEMPLATE_VARS.includes(name as TemplateVar) ? (vars[name as TemplateVar] ?? "") : ""));
}

export const NOTIFICATION_EVENTS = [
  "account_created",
  "payment_received",
  "intake_incomplete",
  "document_requested",
  "information_requested",
  "appointment_needed",
  "appointment_scheduled",
  "appointment_reminder",
  "case_update",
  "documents_ready",
  "new_message",
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
