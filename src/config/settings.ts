import { z } from "zod";
import type { ReviewTag } from "@/domain/constants";

/**
 * Typed business configuration. Each key has a schema, a safe default and, when the value is
 * not yet professionally decided, a review tag. Admins override values at runtime through the
 * Settings console (stored in the `settings` table); overrides are validated by the same schema.
 */
export const SETTING_DEFS = {
  brand: {
    label: "Brand and support contact",
    schema: z.object({
      name: z.string(),
      tagline: z.string(),
      supportEmail: z.string(),
      supportPhone: z.string(),
      supportHours: z.string(),
      clinicalHours: z.string(),
    }),
    default: {
      name: "LeaveBridge Health",
      tagline: "Clinical clarity when mental health affects work.",
      supportEmail: "support@example.invalid",
      supportPhone: "(000) 000-0000",
      supportHours: "Monday to Friday, 9 a.m. to 5 p.m. Central",
      clinicalHours: "Clinicians respond to secure messages within two business days",
    },
    reviewTag: "OWNER_DECISION_REQUIRED" as ReviewTag,
    reviewNote: "OWN-08: support and clinical hours; real contact details.",
  },
  pricing: {
    label: "What the fee covers",
    schema: z.object({
      includes: z.array(z.string()),
      excludes: z.array(z.string()),
      paymentTiming: z.string(),
    }),
    default: {
      includes: [
        "Review of your intake, questionnaires and the forms you upload",
        "A telehealth assessment with a licensed mental-health clinician when the clinician determines one is needed",
        "The clinician's independent determination, explained in your portal",
        "Completion of supported documentation for one leave request when clinically supported",
        "Secure delivery of completed documents through your portal",
      ],
      excludes: [
        "A guaranteed diagnosis, certification or documentation",
        "Approval of leave by your employer, insurer or leave administrator",
        "Ongoing therapy, medication management or emergency care",
        "Recertifications or extensions (separate services when offered)",
      ],
      paymentTiming: "Payment is collected after you choose your service and before your secure intake opens.",
    },
    reviewTag: "OWNER_DECISION_REQUIRED" as ReviewTag,
    reviewNote: "OWN-05, OWN-06: exact inclusions and payment timing.",
  },
  refundPolicy: {
    label: "Cancellation and refund rules",
    schema: z.object({
      summary: z.string(),
      rules: z.array(
        z.object({
          trigger: z.enum([
            "before_intake_submitted",
            "after_intake_before_review",
            "clinician_out_of_scope",
            "emergency_routed",
            "no_show",
            "late_cancel",
            "after_determination",
          ]),
          refundPercent: z.number().min(0).max(100),
          note: z.string(),
        }),
      ),
      lateCancelHours: z.number().int().min(0),
    }),
    default: {
      summary:
        "Refund amounts depend on how far your case has progressed. The full policy is shown before you pay and is final only after legal review.",
      rules: [
        { trigger: "before_intake_submitted", refundPercent: 100, note: "Cancel before submitting intake." },
        { trigger: "after_intake_before_review", refundPercent: 100, note: "Placeholder pending owner decision." },
        { trigger: "clinician_out_of_scope", refundPercent: 100, note: "Clinician determines the service is not appropriate." },
        { trigger: "emergency_routed", refundPercent: 100, note: "Case paused for safety reasons." },
        { trigger: "no_show", refundPercent: 0, note: "Placeholder pending owner decision." },
        { trigger: "late_cancel", refundPercent: 0, note: "Placeholder pending owner decision." },
        { trigger: "after_determination", refundPercent: 0, note: "The fee covers the assessment, whatever the outcome." },
      ],
      lateCancelHours: 24,
    },
    reviewTag: "LEGAL_REVIEW_REQUIRED" as ReviewTag,
    reviewNote: "OWN-07, LEG-09: refund amounts per exit path.",
  },
  turnaround: {
    label: "Turnaround messaging",
    schema: z.object({ publicMessage: z.string(), showPublicly: z.boolean() }),
    default: {
      publicMessage: "Most people can start their intake the same day they create an account. Clinical timelines depend on your case.",
      showPublicly: true,
    },
    reviewTag: "OWNER_DECISION_REQUIRED" as ReviewTag,
    reviewNote: "OWN-09, CLN-08: whether to publish a documentation turnaround commitment.",
  },
  scheduling: {
    label: "Scheduling",
    schema: z.object({
      minNoticeHours: z.number().int().min(0),
      horizonDays: z.number().int().min(1),
      slotIntervalMinutes: z.number().int().min(5),
      bufferMinutes: z.number().int().min(0),
    }),
    default: { minNoticeHours: 24, horizonDays: 21, slotIntervalMinutes: 30, bufferMinutes: 10 },
    reviewTag: null,
    reviewNote: "CLN-11: session length lives on each service.",
  },
  security: {
    label: "Session security",
    schema: z.object({
      patientIdleMinutes: z.number().int().min(5).max(120),
      staffIdleMinutes: z.number().int().min(5).max(60),
      absoluteHours: z.number().int().min(1).max(24),
      stepUpMinutes: z.number().int().min(1).max(30),
      maxFailedLogins: z.number().int().min(3).max(20),
      lockoutMinutes: z.number().int().min(5),
      breakGlassMaxHours: z.number().int().min(1).max(12),
      requireStaffMfa: z.boolean(),
    }),
    default: {
      patientIdleMinutes: 30,
      staffIdleMinutes: 15,
      absoluteHours: 12,
      stepUpMinutes: 5,
      maxFailedLogins: 5,
      lockoutMinutes: 15,
      breakGlassMaxHours: 4,
      requireStaffMfa: true,
    },
    reviewTag: "SECURITY_REVIEW_REQUIRED" as ReviewTag,
    reviewNote: "SEC-01: session lifetimes and MFA policy.",
  },
  operations: {
    label: "Operations thresholds",
    schema: z.object({
      agingDays: z.number().int().min(1),
      abandonedDays: z.number().int().min(1),
      followUpDays: z.number().int().min(1),
      deadlineWarningDays: z.number().int().min(1),
    }),
    default: { agingDays: 5, abandonedDays: 14, followUpDays: 3, deadlineWarningDays: 5 },
    reviewTag: null,
    reviewNote: "",
  },
  features: {
    label: "Feature switches",
    schema: z.object({
      messaging: z.boolean(),
      measures: z.boolean(),
      identityVerification: z.boolean(),
      aiDrafting: z.boolean(),
      formExtraction: z.boolean(),
      externalDelivery: z.boolean(),
      smsNotifications: z.boolean(),
      waitlist: z.boolean(),
    }),
    default: {
      messaging: true,
      measures: true,
      identityVerification: true,
      aiDrafting: false,
      formExtraction: false,
      externalDelivery: false,
      smsNotifications: false,
      waitlist: true,
    },
    reviewTag: null,
    reviewNote: "AI drafting and form extraction stay off until LEG-06/SEC-04 close. External delivery off until LEG-07.",
  },
  crisis: {
    label: "Crisis and emergency content",
    schema: z.object({
      headline: z.string(),
      body: z.string(),
      resources: z.array(z.object({ label: z.string(), detail: z.string(), href: z.string() })),
    }),
    default: {
      headline: "If you are in danger or thinking about harming yourself, get help now.",
      body: "LeaveBridge Health is not an emergency or crisis service and cannot respond in real time. Please contact one of these resources right away.",
      resources: [
        { label: "Call or text 988", detail: "Suicide & Crisis Lifeline, available 24/7 in the U.S.", href: "tel:988" },
        { label: "Call 911", detail: "For immediate danger or a medical emergency.", href: "tel:911" },
        { label: "Go to the nearest emergency room", detail: "If you can do so safely.", href: "" },
      ],
    },
    reviewTag: "CLINICAL_REVIEW_REQUIRED" as ReviewTag,
    reviewNote: "CLN-01, CLN-02: crisis workflow and content.",
  },
  retention: {
    label: "Retention",
    schema: z.object({
      abandonedScreeningDays: z.number().int().min(1),
      clinicalRecordYears: z.number().int().min(1),
      auditLogYears: z.number().int().min(1),
    }),
    default: { abandonedScreeningDays: 30, clinicalRecordYears: 7, auditLogYears: 7 },
    reviewTag: "STATE_RULE_REQUIRED" as ReviewTag,
    reviewNote: "STR-05, LEG-10: retention periods per state and license type.",
  },
} as const;

export type SettingKey = keyof typeof SETTING_DEFS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTING_DEFS)[K]["schema"]>;
export const SETTING_KEYS = Object.keys(SETTING_DEFS) as SettingKey[];
