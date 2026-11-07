CREATE TABLE IF NOT EXISTS "pediu_auth_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tokenHash" varchar(64) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"revokedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastUsedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_auth_sessions_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
ALTER TABLE "pediu_auth_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pediu_password_resets" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"codeHash" varchar(64) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pediu_password_resets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" varchar(255);--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pediu_auth_sessions" ADD CONSTRAINT "pediu_auth_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pediu_password_resets" ADD CONSTRAINT "pediu_password_resets_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pediu_password_resets" ADD CONSTRAINT "pediu_password_resets_createdByUserId_users_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_auth_sessions_user_idx" ON "pediu_auth_sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_password_resets_user_idx" ON "pediu_password_resets" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_password_resets_created_by_idx" ON "pediu_password_resets" USING btree ("createdByUserId");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
EXCEPTION
	WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
