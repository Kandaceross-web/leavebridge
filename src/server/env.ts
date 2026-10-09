import "server-only";
import { z } from "zod";

/**
 * Environment configuration, validated once at startup. Secrets come from the platform's
 * secret manager in staging/production (AWS Secrets Manager → task env); local development
 * uses .env with fictional values only.
 */
const schema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  DATABASE_URL: z.string().default("postgres://lb_app:lb_app_dev@localhost:5432/leavebridge"),
  /** Public origin of the patient/ops app. */
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  /** Public origin of the marketing site. Equal to APP_ORIGIN in single-host mode. */
  SITE_ORIGIN: z.string().url().default("http://localhost:3000"),
  /** "single" serves everything on one host; "split" enforces www vs app hostnames. */
  HOST_MODE: z.enum(["single", "split"]).default("single"),
  /** Comma-separated keyring "id:base64(32 bytes)". First entry encrypts; all decrypt. */
  ENCRYPTION_KEYS: z.string().default("dev1:ZGV2LW9ubHktZmljdGlvbmFsLWtleS0zMi1ieXRlISE="),
  /** HMAC secret for hashing tokens, IPs and anonymous screening cookies. */
  HMAC_SECRET: z.string().min(16).default("dev-only-hmac-secret-change-me"),
  PAYMENTS_PROVIDER: z.enum(["fake", "stripe"]).default("fake"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_KMS_KEY_ID: z.string().optional(),
  SCAN_PROVIDER: z.enum(["basic", "clamav"]).default("basic"),
  CLAMAV_HOST: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["outbox", "ses"]).default("outbox"),
  SMS_PROVIDER: z.enum(["outbox", "sns"]).default("outbox"),
  EMAIL_FROM: z.string().default("LeaveBridge Health <no-reply@example.invalid>"),
  VIDEO_PROVIDER: z.enum(["stub"]).default("stub"),
  AI_PROVIDER: z.enum(["disabled", "stub", "bedrock"]).default("disabled"),
  /** Model id for AI_PROVIDER=bedrock. Only use a model covered by your BAA with no training or retention (LEG-06, SEC-04). */
  BEDROCK_MODEL_ID: z.string().optional(),
  IDV_PROVIDER: z.enum(["manual"]).default("manual"),
  /** Optional privacy-preserving analytics script for marketing pages only. Never loaded in the app. */
  SITE_ANALYTICS_SRC: z.string().url().optional(),
  /**
   * "1" renders the public-pages-only preview that scripts/export-public-site.ts publishes to static hosting before launch:
   * links into the app go to /opening-soon and forms are replaced with a notice. Never set on the running app.
   */
  PUBLIC_PREVIEW: z.enum(["0", "1"]).default("0"),
  /** "1" lets search engines index the public preview. The export sets it only once LEG-05 and LEG-17 are closed. */
  PUBLIC_PREVIEW_INDEXABLE: z.enum(["0", "1"]).default("0"),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Names only; never echo values.
    const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration: ${keys}`);
  }
  const data = parsed.data;
  if (data.APP_ENV === "production" || data.APP_ENV === "staging") {
    const problems: string[] = [];
    if (data.ENCRYPTION_KEYS.includes("ZGV2LW9ubHkt"))
      problems.push("ENCRYPTION_KEYS uses the development key");
    if (data.HMAC_SECRET.startsWith("dev-only"))
      problems.push("HMAC_SECRET uses the development secret");
    if (data.APP_ENV === "production") {
      if (data.PAYMENTS_PROVIDER === "fake") problems.push("PAYMENTS_PROVIDER=fake");
      if (data.STORAGE_PROVIDER === "local") problems.push("STORAGE_PROVIDER=local");
      if (data.EMAIL_PROVIDER === "outbox") problems.push("EMAIL_PROVIDER=outbox");
      if (data.AI_PROVIDER === "stub") problems.push("AI_PROVIDER=stub");
      if (data.AI_PROVIDER === "bedrock" && !data.BEDROCK_MODEL_ID)
        problems.push("BEDROCK_MODEL_ID missing");
      if (
        data.PAYMENTS_PROVIDER === "stripe" &&
        (!data.STRIPE_SECRET_KEY || !data.STRIPE_WEBHOOK_SECRET)
      )
        problems.push("Stripe keys missing");
      if (data.STORAGE_PROVIDER === "s3" && !data.S3_BUCKET) problems.push("S3_BUCKET missing");
      for (const key of ["SITE_ORIGIN", "APP_ORIGIN"] as const)
        if (!data[key].startsWith("https://") || /localhost|\.invalid/.test(data[key]))
          problems.push(`${key} must be the real https origin`);
      if (/\.invalid>?$/.test(data.EMAIL_FROM))
        problems.push("EMAIL_FROM uses the placeholder domain");
      if (data.PUBLIC_PREVIEW === "1")
        problems.push("PUBLIC_PREVIEW is only for the static public-site export");
    }
    if (problems.length)
      throw new Error(`Refusing to start ${data.APP_ENV}: ${problems.join("; ")}`);
  }
  return data;
}

export const env: Env = load();

export const isProduction = env.APP_ENV === "production";
export const isPublicPreview = env.PUBLIC_PREVIEW === "1";
/** Production, or a public preview whose public copy the owner has signed off. Everything else is noindex. */
export const isIndexable =
  isProduction || (isPublicPreview && env.PUBLIC_PREVIEW_INDEXABLE === "1");
export const isDevLike = env.APP_ENV === "development" || env.APP_ENV === "test";
