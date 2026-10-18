CREATE TABLE "resignations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"document" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "share_links" DROP CONSTRAINT "share_links_one_document";--> statement-breakpoint
ALTER TABLE "share_links" ADD COLUMN "resignation_id" uuid;--> statement-breakpoint
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resignations_user_updated_idx" ON "resignations" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_resignation_id_resignations_id_fk" FOREIGN KEY ("resignation_id") REFERENCES "public"."resignations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_resignation_id_unique" UNIQUE("resignation_id");--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_one_document" CHECK (("share_links"."cv_id" is not null)::int + ("share_links"."cover_letter_id" is not null)::int + ("share_links"."resignation_id" is not null)::int = 1);