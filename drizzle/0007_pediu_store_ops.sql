CREATE TABLE "pediu_store_ops" (
	"storeId" integer PRIMARY KEY NOT NULL,
	"approvalStatus" varchar(16) DEFAULT 'approved' NOT NULL,
	"cardCreditEnabled" integer DEFAULT 0 NOT NULL,
	"cardDebitEnabled" integer DEFAULT 0 NOT NULL,
	"pausedUntil" timestamp,
	"pauseManual" integer DEFAULT 0 NOT NULL,
	"feeMode" varchar(16) DEFAULT 'fixed' NOT NULL,
	"feePerKm" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pediu_store_ops" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_store_ops" ADD CONSTRAINT "pediu_store_ops_storeId_pediu_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."pediu_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "pediu_store_ops" ("storeId", "approvalStatus")
SELECT "id", 'approved' FROM "pediu_stores"
ON CONFLICT ("storeId") DO NOTHING;