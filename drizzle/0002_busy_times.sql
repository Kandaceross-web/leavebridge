-- Patients choosing a time must not see other patients' appointments (RLS hides them), yet slot
-- calculation needs to know when a clinician is busy. This function returns only time ranges for
-- one clinician: no case, patient or appointment identifiers leave it.
CREATE OR REPLACE FUNCTION lb_clinician_busy(p_clinician uuid, p_from timestamptz, p_to timestamptz)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.starts_at, a.ends_at FROM appointments a
  WHERE a.clinician_id = p_clinician AND a.status = 'booked' AND a.ends_at >= p_from AND a.starts_at < p_to
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION lb_clinician_busy(uuid, timestamptz, timestamptz) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION lb_clinician_busy(uuid, timestamptz, timestamptz) TO lb_app;
