-- First-party marketing attribution (src/domain/attribution.ts). Campaign parameters and landing
-- paths only; no IPs, click-id values or full referrers. Never sent to third parties.
ALTER TABLE "screenings" ADD COLUMN "attribution" jsonb;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "attribution" jsonb;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "attribution" jsonb;
