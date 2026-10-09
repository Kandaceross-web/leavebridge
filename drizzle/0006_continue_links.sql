-- "Email me a link to continue" (OWN-25, Q48): token HMAC, screening and expiry only; never an address.
CREATE TABLE "screening_continue_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"screening_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "screening_continue_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "screening_continue_links" ADD CONSTRAINT "screening_continue_links_screening_id_screenings_id_fk" FOREIGN KEY ("screening_id") REFERENCES "public"."screenings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "screening_continue_links_screening_idx" ON "screening_continue_links" USING btree ("screening_id");--> statement-breakpoint
CREATE INDEX "screening_continue_links_expiry_idx" ON "screening_continue_links" USING btree ("expires_at");
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON screening_continue_links TO lb_app;
--> statement-breakpoint
-- Same rule as screenings: the anonymous visitor creates and redeems links (the service matches the
-- HMAC of the secret token, as with the screening cookie); staff and system (the purge job) see all.
ALTER TABLE screening_continue_links ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY screening_continue_links_access ON screening_continue_links USING (lb_is_internal() OR lb_actor_kind() = 'anonymous') WITH CHECK (lb_is_internal() OR lb_actor_kind() = 'anonymous');
