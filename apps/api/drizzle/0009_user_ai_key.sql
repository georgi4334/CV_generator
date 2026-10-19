ALTER TABLE "users" ADD COLUMN "ai_key_encrypted" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_key_hint" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_model" text DEFAULT 'gemini-flash-latest' NOT NULL;