ALTER TABLE "automated_screenings" ADD COLUMN "follow_up_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "automated_screenings" ADD COLUMN "follow_up_handled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "automated_screenings" ADD COLUMN "follow_up_handled_by" uuid;--> statement-breakpoint
ALTER TABLE "automated_screenings" ADD CONSTRAINT "automated_screenings_follow_up_handled_by_users_id_fk" FOREIGN KEY ("follow_up_handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;