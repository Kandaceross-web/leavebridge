CREATE TABLE "automated_screenings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"status" text DEFAULT 'awaiting_payment' NOT NULL,
	"instruments" text[] DEFAULT '{}'::text[] NOT NULL,
	"functioning" text,
	"acknowledgement_hash" text,
	"acknowledged_at" timestamp with time zone,
	"hold_reasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"summary" text,
	"summary_hash" text,
	"completed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"refund_review" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automated_screenings_case_id_unique" UNIQUE("case_id"),
	CONSTRAINT "automated_screenings_status_valid" CHECK ("automated_screenings"."status" in ('awaiting_payment','in_progress','held_for_review','issued','closed'))
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "email_verification_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "issued_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"source_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"sha256" text NOT NULL,
	"signing_cert_fingerprint" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"issued_by_user_id" uuid,
	"issuer_clinician_id" uuid,
	"issuer_practice" text NOT NULL,
	"status" text DEFAULT 'valid' NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revocation_reason" text,
	CONSTRAINT "issued_documents_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "issued_documents_kind_valid" CHECK ("issued_documents"."kind" in ('automated_screening_record','work_excuse_letter')),
	CONSTRAINT "issued_documents_letter_has_clinician" CHECK ("issued_documents"."kind" <> 'work_excuse_letter' or "issued_documents"."issuer_clinician_id" is not null),
	CONSTRAINT "issued_documents_revocation_complete" CHECK ("issued_documents"."status" = 'valid' or ("issued_documents"."revoked_at" is not null and "issued_documents"."revoked_by" is not null and "issued_documents"."revocation_reason" is not null))
);
--> statement-breakpoint
CREATE TABLE "work_excuse_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"automated_screening_id" uuid NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"patient_input" text NOT NULL,
	"proposed_draft" text NOT NULL,
	"document_id" uuid,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decline_message" text,
	"recommend_assessment" text DEFAULT 'no' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_excuse_requests_automated_screening_id_unique" UNIQUE("automated_screening_id"),
	CONSTRAINT "work_excuse_requests_status_valid" CHECK ("work_excuse_requests"."status" in ('requested','approved','declined','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "kind" text DEFAULT 'clinical' NOT NULL;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "product" text DEFAULT 'leave_assessment' NOT NULL;--> statement-breakpoint
ALTER TABLE "automated_screenings" ADD CONSTRAINT "automated_screenings_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automated_screenings" ADD CONSTRAINT "automated_screenings_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_issuer_clinician_id_clinicians_id_fk" FOREIGN KEY ("issuer_clinician_id") REFERENCES "public"."clinicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_excuse_requests" ADD CONSTRAINT "work_excuse_requests_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_excuse_requests" ADD CONSTRAINT "work_excuse_requests_automated_screening_id_automated_screenings_id_fk" FOREIGN KEY ("automated_screening_id") REFERENCES "public"."automated_screenings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_excuse_requests" ADD CONSTRAINT "work_excuse_requests_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_excuse_requests" ADD CONSTRAINT "work_excuse_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automated_screenings_status_idx" ON "automated_screenings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_user_idx" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issued_documents_source_key" ON "issued_documents" USING btree ("kind","source_id");--> statement-breakpoint
CREATE INDEX "issued_documents_case_idx" ON "issued_documents" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "work_excuse_requests_status_idx" ON "work_excuse_requests" USING btree ("status","created_at");--> statement-breakpoint
-- Hand-written security controls for the Same-Day Mental Health Assessment (see docs/DATABASE.md).
ALTER TABLE "cases" ADD CONSTRAINT "cases_kind_valid" CHECK ("kind" in ('clinical','automated_screening'));
--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_product_valid" CHECK ("product" in ('leave_assessment','same_day_screening'));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON automated_screenings, work_excuse_requests, issued_documents, email_verification_tokens TO lb_app;
--> statement-breakpoint
GRANT DELETE ON email_verification_tokens TO lb_app;
--> statement-breakpoint
-- Issued documents are never deleted, and after issue only revocation may change: valid -> revoked, once.
CREATE OR REPLACE FUNCTION lb_issued_document_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'issued documents cannot be deleted' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.id <> OLD.id OR NEW.public_id <> OLD.public_id OR NEW.case_id <> OLD.case_id OR NEW.kind <> OLD.kind
     OR NEW.source_id <> OLD.source_id OR NEW.file_id <> OLD.file_id OR NEW.sha256 <> OLD.sha256
     OR NEW.signing_cert_fingerprint <> OLD.signing_cert_fingerprint OR NEW.issued_at <> OLD.issued_at
     OR NEW.issued_by_user_id IS DISTINCT FROM OLD.issued_by_user_id OR NEW.issuer_clinician_id IS DISTINCT FROM OLD.issuer_clinician_id
     OR NEW.issuer_practice <> OLD.issuer_practice THEN
    RAISE EXCEPTION 'issued document content is immutable' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF OLD.status = 'revoked' THEN
    RAISE EXCEPTION 'a revoked document stays revoked' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER issued_documents_guard BEFORE UPDATE OR DELETE ON issued_documents FOR EACH ROW EXECUTE FUNCTION lb_issued_document_guard();
--> statement-breakpoint
-- Issued time comes from the database clock, not from the request.
CREATE OR REPLACE FUNCTION lb_issued_document_stamp() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.issued_at > clock_timestamp() + interval '1 minute' OR NEW.issued_at < clock_timestamp() - interval '10 minutes' THEN
    RAISE EXCEPTION 'issued_at must be the current server time' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER issued_documents_stamp BEFORE INSERT ON issued_documents FOR EACH ROW EXECUTE FUNCTION lb_issued_document_stamp();
--> statement-breakpoint
ALTER TABLE automated_screenings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY automated_screenings_access ON automated_screenings USING (lb_is_internal() OR lb_owns_case(case_id)) WITH CHECK (lb_is_internal() OR lb_owns_case(case_id));
--> statement-breakpoint
ALTER TABLE work_excuse_requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY work_excuse_requests_access ON work_excuse_requests USING (lb_is_internal() OR lb_owns_case(case_id)) WITH CHECK (lb_is_internal() OR lb_owns_case(case_id));
--> statement-breakpoint
ALTER TABLE issued_documents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY issued_documents_access ON issued_documents USING (lb_is_internal() OR lb_owns_case(case_id)) WITH CHECK (lb_is_internal() OR lb_owns_case(case_id));
--> statement-breakpoint
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY email_verification_tokens_access ON email_verification_tokens USING (lb_is_internal()) WITH CHECK (lb_is_internal());
--> statement-breakpoint
-- The public verification page runs as the anonymous actor, which cannot read issued_documents.
-- This function returns only what that page may show (type, status, dates, issuer for letters)
-- plus the stored file hash for comparing an uploaded copy. No patient, case or score leaves it.
CREATE OR REPLACE FUNCTION lb_verify_document(p_public_id text)
RETURNS TABLE (kind text, status text, issued_at timestamptz, revoked_at timestamptz, issuer_name text, issuer_credentials text, issuer_practice text, sha256 text, signing_cert_fingerprint text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.kind, d.status, d.issued_at, d.revoked_at,
         CASE WHEN d.kind = 'work_excuse_letter' THEN c.display_name END,
         CASE WHEN d.kind = 'work_excuse_letter' THEN c.credentials END,
         d.issuer_practice, d.sha256, d.signing_cert_fingerprint
  FROM issued_documents d LEFT JOIN clinicians c ON c.id = d.issuer_clinician_id
  WHERE d.public_id = p_public_id
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION lb_verify_document(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION lb_verify_document(text) TO lb_app;
