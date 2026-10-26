CREATE TABLE "pediu_account_prefs" (
	"userId" integer PRIMARY KEY NOT NULL,
	"storeTourDone" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pediu_account_prefs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_account_prefs" ADD CONSTRAINT "pediu_account_prefs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;