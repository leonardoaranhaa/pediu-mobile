CREATE TABLE "pediu_assistant_confirmations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tool" varchar(64) NOT NULL,
	"payload" text NOT NULL,
	"summary" varchar(500) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pediu_assistant_confirmations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_assistant_confirmations" ADD CONSTRAINT "pediu_assistant_confirmations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pediu_assistant_confirmations_user_idx" ON "pediu_assistant_confirmations" USING btree ("userId");