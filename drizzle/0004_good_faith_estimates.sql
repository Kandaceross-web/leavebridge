-- Written Good Faith Estimates for self-pay patients (45 CFR 149.610, LEG-08).
-- The snapshot taken with this migration also records the attribution columns that the
-- hand-written 0003_attribution.sql added, so those statements are omitted here.
CREATE TABLE "good_faith_estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"price_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"issued_by" uuid,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "good_faith_estimates" ADD CONSTRAINT "good_faith_estimates_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "good_faith_estimates" ADD CONSTRAINT "good_faith_estimates_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "good_faith_estimates" ADD CONSTRAINT "good_faith_estimates_price_id_prices_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."prices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "good_faith_estimates" ADD CONSTRAINT "good_faith_estimates_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "good_faith_estimates_case_idx" ON "good_faith_estimates" USING btree ("case_id","issued_at");
--> statement-breakpoint
-- An issued estimate is part of the record: append-only, like signatures and document versions.
CREATE TRIGGER good_faith_estimates_append_only BEFORE UPDATE OR DELETE ON good_faith_estimates FOR EACH ROW EXECUTE FUNCTION lb_forbid_mutation();
--> statement-breakpoint
GRANT SELECT, INSERT ON good_faith_estimates TO lb_app;
--> statement-breakpoint
-- Same rule as payments: the patient sees (and, when the estimate is issued, inserts) their own
-- case's rows; staff and system per the service-layer policy.
ALTER TABLE good_faith_estimates ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY good_faith_estimates_access ON good_faith_estimates USING (lb_is_internal() OR lb_owns_case(case_id));
