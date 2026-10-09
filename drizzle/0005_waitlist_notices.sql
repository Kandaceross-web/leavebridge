-- State waitlist: one "we now serve your state" email per address, then the address is deleted.
-- waitlist_notices keeps only the state, the count and who sent it (generated), so the admin page
-- can show "Notified N on <date>" without keeping any address.
CREATE TABLE "waitlist_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_code" text NOT NULL,
	"recipient_count" integer NOT NULL,
	"sent_by" uuid,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "waitlist_notices" ADD CONSTRAINT "waitlist_notices_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "waitlist_notices_state_idx" ON "waitlist_notices" USING btree ("state_code","sent_at");--> statement-breakpoint
-- Hand-written: drop duplicate sign-ups before the unique index (the old service skipped them, so normally none).
DELETE FROM waitlist a USING waitlist b WHERE a.email = b.email AND a.state_code = b.state_code AND a.id > b.id;
--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_state" ON "waitlist" USING btree ("email","state_code");
--> statement-breakpoint
-- A send record is history: append-only, like payment events.
CREATE TRIGGER waitlist_notices_append_only BEFORE UPDATE OR DELETE ON waitlist_notices FOR EACH ROW EXECUTE FUNCTION lb_forbid_mutation();
--> statement-breakpoint
GRANT SELECT, INSERT ON waitlist_notices TO lb_app;
--> statement-breakpoint
-- Rows are deleted once their state-opening email has been sent (purpose fulfilled).
GRANT DELETE ON waitlist TO lb_app;
--> statement-breakpoint
-- SEC-18: anyone may add themselves (the public form runs as the anonymous actor, and duplicates are
-- skipped with ON CONFLICT DO NOTHING, which needs no read access); only staff and system can read or delete.
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY waitlist_join ON waitlist FOR INSERT WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY waitlist_internal ON waitlist USING (lb_is_internal());
--> statement-breakpoint
ALTER TABLE waitlist_notices ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY waitlist_notices_internal ON waitlist_notices USING (lb_is_internal());
