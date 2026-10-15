CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"position" text NOT NULL,
	"company" text NOT NULL,
	"status" text DEFAULT 'to_apply' NOT NULL,
	"type" text,
	"date_saved" date NOT NULL,
	"date_applied" date,
	"cv_id" uuid,
	"cover_letter_id" uuid,
	"notes" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"salary" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_cv_id_cvs_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cvs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_user_saved_idx" ON "jobs" USING btree ("user_id","date_saved" DESC NULLS LAST);--> statement-breakpoint
-- There was no jobs table before, so any stored job id points nowhere.
UPDATE "cvs" SET "job_id" = NULL WHERE "job_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;