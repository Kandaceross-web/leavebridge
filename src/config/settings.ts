import { z } from "zod";
import type { ReviewTag } from "@/domain/constants";

/** NPI check digit: Luhn over "80840" plus the first nine digits (CMS NPI standard). Catches most typos. */
export function npiCheckDigitOk(npi: string): boolean {
  let sum = 0;
  [...("80840" + npi.slice(0, 9))].reverse().forEach((c, i) => {
    let d = Number(c);
    if (i % 2 === 0) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  });
  return (10 - (sum % 10)) % 10 === Number(npi[9]);
}

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
      supportEmail: "support@leavebridgehealth.com", // mailbox must exist before launch (OWN-08)
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
        "Completion of the paperwork for this leave request when the clinician finds it clinically supported",
        "Secure delivery of completed documents through your portal",
      ],
      excludes: [
        "A guaranteed diagnosis, certification or documentation",
        "Approval of leave by your employer, insurer or leave administrator",
        "Your employer's acceptance of the form or of your clinician's license type",
        "Ongoing therapy, medication management or emergency care",
        "Recertification visits ($119.99) and follow-up forms ($9.99 each), which are separate services",
      ],
      paymentTiming:
        "Payment is collected after you choose your service and before your secure intake opens.",
    },
    reviewTag: "OWNER_DECISION_REQUIRED" as ReviewTag,
    reviewNote: "OWN-05, OWN-06: exact inclusions and payment timing.",
  },
  goodFaithEstimate: {
    label: "Good Faith Estimate (self-pay)",
    // 45 CFR 149.610(c)(1). Provider identifiers and the service code are the owner's facts, so
    // they start empty; the release check refuses production until all three are filled in.
    schema: z.object({
      /** Legal name of the billing provider. Owner sign-off Q9 (LEG-02): Defining You Therapeutic Services for now. */
      providerName: z.string().min(2),
      providerNpi: z
        .string()
        .regex(/^(\d{10})?$/, "A National Provider Identifier is 10 digits.")
        .refine(
          (v) => !v || npiCheckDigitOk(v),
          "That NPI's last digit doesn't match. Check it at npiregistry.cms.hhs.gov.",
        ),
      providerTin: z
        .string()
        .regex(/^(\d{2}-?\d{7})?$/, "A Taxpayer Identification Number is 9 digits (12-3456789)."),
      serviceCode: z
        .string()
        .regex(/^([0-9A-Z]{5})?$/, "A service (CPT/HCPCS) code is 5 characters."),
      diagnosisCodes: z.string().min(1),
      disclaimers: z.array(z.string().min(1)).min(1),
      disputeUrl: z.string().url(),
      /**
       * Service code per service slug, when a service needs a different code from `serviceCode`
       * (for example the automated same-day screening). Empty means `serviceCode` applies.
       */
      serviceCodes: z.record(z.string(), z.string().regex(/^([0-9A-Z]{5})?$/, "A service (CPT/HCPCS) code is 5 characters.")).default({}),
    }),
    default: {
      providerName: "Defining You Therapeutic Services",
      providerNpi: "1962023812", // Kandace Ross, LPC (NPI-1, active; NPPES checked 2026-10-09)
      providerTin: "",
      serviceCode: "90791", // owner chose 2026-10-10 for the leave assessment (LEG-08)
      // CLN-12: forms carry no diagnosis field, so the estimate lists none.
      diagnosisCodes: "Not applicable: this assessment is not billed to insurance",
      disclaimers: [
        "This Good Faith Estimate shows the costs of items and services that are reasonably expected for the service listed, based on information known when the estimate was created. It is only an estimate. Actual items, services or charges may differ from this estimate.",
        "If other items or services are recommended, such as a follow-up visit or another form, they may need to be scheduled separately and are not included in this estimate.",
        "If you are billed substantially more than this estimate, meaning $400 or more above the total expected charges, you have the right to dispute the bill through the patient-provider dispute resolution process. To learn how, visit https://www.cms.gov/nosurprises. Starting the dispute process will not affect the quality of the care you receive.",
        "This Good Faith Estimate is not a contract and does not require you to get the items or services from the provider named in it.",
      ],
      disputeUrl: "https://www.cms.gov/nosurprises",
      // Owner chose 2026-10-10 (LEG-31): the automated screening uses 96127, not the assessment code.
      serviceCodes: { "same-day-mental-health-assessment": "96127" } as Record<string, string>,
    },
    reviewTag: "OWNER_DECISION_REQUIRED" as ReviewTag,
    reviewNote:
      "LEG-08: provider NPI, TIN and the service (CPT) code for the written Good Faith Estimate; confirm the disclaimer wording.",
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
        "You get a full refund if you cancel before your clinician starts reviewing your case. Once your clinician has made a determination, the fee is not refunded, whatever the outcome.",
      rules: [
        {
          trigger: "before_intake_submitted",
          refundPercent: 100,
          note: "Cancel before submitting intake.",
        },
        {
          trigger: "after_intake_before_review",
          refundPercent: 100,
          note: "Cancel before your clinician starts reviewing your case.",
        },
        {
          trigger: "clinician_out_of_scope",
          refundPercent: 100,
          note: "Clinician determines the service is not appropriate.",
        },
        {
          trigger: "emergency_routed",
          refundPercent: 100,
          note: "Case paused for safety reasons.",
        },
        {
          trigger: "no_show",
          refundPercent: 0,
          note: "You miss your video visit without cancelling.",
        },
        {
          trigger: "late_cancel",
          refundPercent: 0,
          note: "You cancel less than 24 hours before your video visit.",
        },
        {
          trigger: "after_determination",
          refundPercent: 0,
          note: "The fee covers the assessment, whatever the outcome.",
        },
      ],
      lateCancelHours: 24,
    },
    // OWN-07, LEG-09: owner chose "full refund until review" on 2026-10-09.
    reviewTag: null,
    reviewNote: "OWN-07, LEG-09: refund amounts per exit path (owner sign-off 2026-10-09).",
  },
  turnaround: {
    label: "Turnaround messaging",
    schema: z.object({ publicMessage: z.string(), showPublicly: z.boolean() }),
    default: {
      publicMessage:
        "Most people can start their intake the same day they create an account. Clinical timelines depend on your case.",
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
      // SEC-03 (owner sign-off 2026-10-09): a solo practice has no second approver, so an approver may approve their own
      // break-glass request. It is audited as self-approved and shown on the access page for later review.
      allowSelfApprovedAccess: z.boolean().default(true),
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
      allowSelfApprovedAccess: true,
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
    reviewNote:
      "AI drafting and form extraction stay off until LEG-06/SEC-04 close. External delivery off until LEG-07.",
  },
  outcomeStarters: {
    label: "Starting points for outcome messages",
    // CLN-10 (owner sign-off 2026-10-09): optional, editable starting text for the patient message the clinician writes
    // with each determination. The clinician still writes and reviews every message; bracketed parts must be replaced.
    schema: z.object({
      DOCUMENTATION_CLINICALLY_SUPPORTED: z.string(),
      ADDITIONAL_INFORMATION_REQUIRED: z.string(),
      DOCUMENTATION_NOT_CLINICALLY_SUPPORTED: z.string(),
      REFER_OUTSIDE_SCOPE: z.string(),
    }),
    default: {
      DOCUMENTATION_CLINICALLY_SUPPORTED:
        "I have finished reviewing your information and our visit. In my clinical judgment, leave documentation is supported. Your completed forms will be in your portal once I sign them. Your employer or leave administrator makes the final decision about your leave. [Add anything specific to you.]",
      ADDITIONAL_INFORMATION_REQUIRED:
        "I have reviewed your information, and I need a little more before I can make a determination. [Say what you need.] Please send it through your portal.",
      DOCUMENTATION_NOT_CLINICALLY_SUPPORTED:
        "Thank you for sharing what you are going through. After reviewing your information and our visit, I am not able to complete leave documentation based on what I assessed. This is not a judgment of how hard things are for you. [Add next steps or care options.] If you are in crisis, call or text 988.",
      REFER_OUTSIDE_SCOPE:
        "Thank you for trusting me with your situation. What you need is outside what I can assess through this service, so I am not able to complete these forms. [Add who can help.] A refund will be processed under our refund policy.",
    },
    reviewTag: "CLINICAL_REVIEW_REQUIRED" as ReviewTag,
    reviewNote: "CLN-10: the owner approves the starting-point wording before launch.",
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
        {
          label: "Call or text 988",
          detail: "Suicide & Crisis Lifeline, available 24/7 in the U.S.",
          href: "tel:988",
        },
        {
          label: "Call 911",
          detail: "For immediate danger or a medical emergency.",
          href: "tel:911",
        },
        { label: "Go to the nearest emergency room", detail: "If you can do so safely.", href: "" },
        {
          label: "Mississippi: 1-877-210-8513",
          detail: "Mississippi Department of Mental Health helpline.",
          href: "tel:18772108513",
        },
        {
          label: "Tennessee: 855-274-7471",
          detail: "Tennessee Statewide Crisis Line, available 24/7.",
          href: "tel:18552747471",
        },
      ],
    },
    reviewTag: "CLINICAL_REVIEW_REQUIRED" as ReviewTag,
    reviewNote: "CLN-01, CLN-02: crisis workflow and content.",
  },
  sameDayScreening: {
    label: "Same-Day Mental Health Assessment (automated screening)",
    schema: z.object({
      /** Turns the public page's start button and new purchases on or off. Records already issued stay verifiable. */
      enabled: z.boolean(),
      /** Practice named as the issuer on screening records and letters, and on the public verification page. */
      practiceName: z.string().min(2),
      /** Hours a verification email link stays valid. */
      emailLinkHours: z.number().int().min(1).max(168),
    }),
    default: {
      enabled: true,
      practiceName: "Defining You Therapeutic Services",
      emailLinkHours: 48,
    },
    reviewTag: "OWNER_DECISION_REQUIRED" as ReviewTag,
    reviewNote:
      "OWN-30, CLN-20, LEG-30: launch of the automated screening and the issuer name on documents. Scoring and summary wording live in src/config/same-day.ts (CLINICAL_REVIEW_REQUIRED).",
  },
  workExcuseLetter: {
    label: "Work excuse letters (clinician-approved)",
    schema: z.object({
      /** Whether patients with an issued screening record may request a letter. */
      enabled: z.boolean(),
      /** The statement the clinician confirms when approving and signing a letter. */
      attestation: z.string().min(10),
    }),
    default: {
      enabled: true,
      attestation:
        "I reviewed this patient's screening responses and the information available to me. The letter reflects my own independent clinical judgment, and I approve issuing it with my electronic signature.",
    },
    reviewTag: "OWNER_DECISION_REQUIRED" as ReviewTag,
    reviewNote:
      "OWN-31: letter requests are free (no charge is built). CLN-21: attestation and the proposed-letter wording in src/config/same-day.ts.",
  },
  retention: {
    label: "Retention",
    schema: z.object({
      abandonedScreeningDays: z.number().int().min(1),
      clinicalRecordYears: z.number().int().min(1),
      auditLogYears: z.number().int().min(1),
    }),
    default: { abandonedScreeningDays: 30, clinicalRecordYears: 7, auditLogYears: 7 },
    // STR-05 and LEG-10: owner sign-off 2026-10-09 (7 years; 30 days for abandoned screenings).
    reviewTag: null,
    reviewNote: "STR-05, LEG-10: retention periods per state and license type. No job deletes clinical records yet; one is needed before the first records reach 7 years.",
  },
} as const;

export type SettingKey = keyof typeof SETTING_DEFS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTING_DEFS)[K]["schema"]>;
export const SETTING_KEYS = Object.keys(SETTING_DEFS) as SettingKey[];
