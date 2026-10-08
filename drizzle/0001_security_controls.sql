-- Security controls that the ORM schema cannot express.
-- The runtime application connects as role "lb_app" (not the table owner), so these
-- grants, triggers and row-level security policies apply to every application query.

CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint

-- 1. Append-only tables -----------------------------------------------------------
CREATE OR REPLACE FUNCTION lb_forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'table % is append-only', TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege';
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION lb_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER case_status_history_append_only BEFORE UPDATE OR DELETE ON case_status_history FOR EACH ROW EXECUTE FUNCTION lb_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER determinations_append_only BEFORE UPDATE OR DELETE ON determinations FOR EACH ROW EXECUTE FUNCTION lb_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER signatures_append_only BEFORE UPDATE OR DELETE ON signatures FOR EACH ROW EXECUTE FUNCTION lb_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER document_versions_append_only BEFORE UPDATE OR DELETE ON document_versions FOR EACH ROW EXECUTE FUNCTION lb_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER assessment_notes_append_only BEFORE UPDATE OR DELETE ON assessment_notes FOR EACH ROW EXECUTE FUNCTION lb_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER payment_events_append_only BEFORE UPDATE OR DELETE ON payment_events FOR EACH ROW EXECUTE FUNCTION lb_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER case_notes_append_only BEFORE UPDATE OR DELETE ON case_notes FOR EACH ROW EXECUTE FUNCTION lb_forbid_mutation();
--> statement-breakpoint

-- Consents: only revocation may change after signing.
CREATE OR REPLACE FUNCTION lb_consent_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'consents cannot be deleted' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.version_id <> OLD.version_id OR NEW.signer_user_id <> OLD.signer_user_id
     OR NEW.typed_name <> OLD.typed_name OR NEW.body_hash <> OLD.body_hash OR NEW.signed_at <> OLD.signed_at THEN
    RAISE EXCEPTION 'signed consent content is immutable' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER consents_guard BEFORE UPDATE OR DELETE ON consents FOR EACH ROW EXECUTE FUNCTION lb_consent_guard();
--> statement-breakpoint

-- 2. Clinical integrity -------------------------------------------------------------
-- A determination can only be recorded by the user who IS the clinician on the row and
-- currently holds an active clinical role.
CREATE OR REPLACE FUNCTION lb_determination_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM clinicians c
    JOIN user_roles r ON r.user_id = c.user_id AND r.revoked_at IS NULL AND r.role IN ('clinician','clinical_director')
    WHERE c.id = NEW.clinician_id AND c.user_id = NEW.decided_by_user_id AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'determination must be recorded by the active clinician on the row' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER determinations_guard BEFORE INSERT ON determinations FOR EACH ROW EXECUTE FUNCTION lb_determination_guard();
--> statement-breakpoint

-- A signature must bind to the exact content hash of a clinician-authored version.
CREATE OR REPLACE FUNCTION lb_signature_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v record;
BEGIN
  SELECT content_hash, origin INTO v FROM document_versions WHERE id = NEW.document_version_id;
  IF v IS NULL OR v.content_hash <> NEW.content_hash THEN
    RAISE EXCEPTION 'signature hash does not match document version' USING ERRCODE = 'check_violation';
  END IF;
  IF v.origin <> 'clinician' THEN
    RAISE EXCEPTION 'AI-drafted versions cannot be signed' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM clinicians c
    JOIN user_roles r ON r.user_id = c.user_id AND r.revoked_at IS NULL AND r.role IN ('clinician','clinical_director')
    WHERE c.id = NEW.clinician_id AND c.user_id = NEW.signer_user_id AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'signature must be applied by the active clinician' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER signatures_guard BEFORE INSERT ON signatures FOR EACH ROW EXECUTE FUNCTION lb_signature_guard();
--> statement-breakpoint

-- A document cannot be signed/delivered without a signed version.
ALTER TABLE documents ADD CONSTRAINT documents_final_requires_signature
  CHECK (status NOT IN ('signed','delivered') OR signed_version_id IS NOT NULL);
--> statement-breakpoint

-- No double booking per clinician.
ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (clinician_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'booked');
--> statement-breakpoint

-- 3. Runtime role privileges -------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lb_app') THEN
    CREATE ROLE lb_app NOLOGIN;
  END IF;
END $$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO lb_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO lb_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lb_app;
--> statement-breakpoint
REVOKE UPDATE ON audit_events, case_status_history, determinations, signatures, document_versions, assessment_notes, payment_events, case_notes FROM lb_app;
--> statement-breakpoint
GRANT DELETE ON sessions, rate_limit_buckets TO lb_app;
--> statement-breakpoint

-- 4. Row-level security (second line of defense behind the domain policy layer) -----
-- The application sets these per transaction (see src/server/db/actor.ts):
--   app.actor_kind  = 'patient' | 'staff' | 'system' | 'anonymous'
--   app.patient_id  = patient uuid when actor_kind = 'patient'
CREATE OR REPLACE FUNCTION lb_actor_kind() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT coalesce(nullif(current_setting('app.actor_kind', true), ''), 'none') $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION lb_patient_id() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('app.patient_id', true), '')::uuid $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION lb_is_internal() RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT lb_actor_kind() IN ('staff','system') $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION lb_owns_case(cid uuid) RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT EXISTS (SELECT 1 FROM cases c WHERE c.id = cid AND c.patient_id = lb_patient_id()) $$;
--> statement-breakpoint

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY patients_access ON patients USING (lb_is_internal() OR id = lb_patient_id()) WITH CHECK (lb_is_internal() OR id = lb_patient_id());
--> statement-breakpoint
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY cases_access ON cases USING (lb_is_internal() OR patient_id = lb_patient_id()) WITH CHECK (lb_is_internal() OR patient_id = lb_patient_id());
--> statement-breakpoint
ALTER TABLE screenings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY screenings_access ON screenings USING (lb_is_internal() OR lb_actor_kind() = 'anonymous' OR patient_id = lb_patient_id() OR (lb_actor_kind() = 'patient' AND patient_id IS NULL));
--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['case_status_history','consents','intakes','measure_responses','document_requests','employer_forms',
    'appointments','clinical_reviews','determinations','documents','release_authorizations','payments','message_threads',
    'location_attestations','safety_events']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I USING (lb_is_internal() OR lb_owns_case(case_id))', t || '_access', t);
  END LOOP;
END $$;
--> statement-breakpoint
-- Patients may never read internal clinical working records even for their own case.
ALTER TABLE assessment_notes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY assessment_notes_access ON assessment_notes USING (lb_is_internal());
--> statement-breakpoint
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY case_notes_access ON case_notes USING (lb_is_internal());
--> statement-breakpoint
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY ai_suggestions_access ON ai_suggestions USING (lb_is_internal());
--> statement-breakpoint
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY files_access ON files USING (lb_is_internal() OR patient_id = lb_patient_id() OR lb_owns_case(case_id));
--> statement-breakpoint
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY identity_verifications_access ON identity_verifications USING (lb_is_internal() OR patient_id = lb_patient_id());
--> statement-breakpoint
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY document_versions_access ON document_versions USING (
  lb_is_internal() OR EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.signed_version_id = document_versions.id AND lb_owns_case(d.case_id))
);
--> statement-breakpoint
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY deliveries_access ON deliveries USING (
  lb_is_internal() OR EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND lb_owns_case(d.case_id))
);
--> statement-breakpoint
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY messages_access ON messages USING (
  lb_is_internal() OR EXISTS (SELECT 1 FROM message_threads t WHERE t.id = thread_id AND lb_owns_case(t.case_id))
);
--> statement-breakpoint
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY refunds_access ON refunds USING (
  lb_is_internal() OR EXISTS (SELECT 1 FROM payments p WHERE p.id = payment_id AND lb_owns_case(p.case_id))
);
