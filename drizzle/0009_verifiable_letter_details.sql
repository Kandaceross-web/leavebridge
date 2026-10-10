ALTER TABLE "issued_documents" ADD COLUMN "public_detail" text[];--> statement-breakpoint
-- public_detail is fixed at issue like the rest of the document.
CREATE OR REPLACE FUNCTION lb_issued_document_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'issued documents cannot be deleted' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.id <> OLD.id OR NEW.public_id <> OLD.public_id OR NEW.case_id <> OLD.case_id OR NEW.kind <> OLD.kind
     OR NEW.source_id <> OLD.source_id OR NEW.file_id <> OLD.file_id OR NEW.sha256 <> OLD.sha256
     OR NEW.signing_cert_fingerprint <> OLD.signing_cert_fingerprint OR NEW.issued_at <> OLD.issued_at
     OR NEW.issued_by_user_id IS DISTINCT FROM OLD.issued_by_user_id OR NEW.issuer_clinician_id IS DISTINCT FROM OLD.issuer_clinician_id
     OR NEW.issuer_practice <> OLD.issuer_practice OR NEW.public_detail IS DISTINCT FROM OLD.public_detail THEN
    RAISE EXCEPTION 'issued document content is immutable' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF OLD.status = 'revoked' THEN
    RAISE EXCEPTION 'a revoked document stays revoked' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
-- The verification page also shows a letter's public detail (patient initials and excused dates) so a
-- recipient can spot an edited copy. Still no full name, case, score or health information.
DROP FUNCTION IF EXISTS lb_verify_document(text);
--> statement-breakpoint
CREATE FUNCTION lb_verify_document(p_public_id text)
RETURNS TABLE (kind text, status text, issued_at timestamptz, revoked_at timestamptz, issuer_name text, issuer_credentials text, issuer_practice text, sha256 text, signing_cert_fingerprint text, public_detail text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.kind, d.status, d.issued_at, d.revoked_at,
         CASE WHEN d.kind = 'work_excuse_letter' THEN c.display_name END,
         CASE WHEN d.kind = 'work_excuse_letter' THEN c.credentials END,
         d.issuer_practice, d.sha256, d.signing_cert_fingerprint,
         CASE WHEN d.kind = 'work_excuse_letter' THEN d.public_detail END
  FROM issued_documents d LEFT JOIN clinicians c ON c.id = d.issuer_clinician_id
  WHERE d.public_id = p_public_id
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION lb_verify_document(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION lb_verify_document(text) TO lb_app;
