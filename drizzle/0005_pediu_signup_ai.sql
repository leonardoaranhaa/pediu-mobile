CREATE TABLE "pediu_ad_credit_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer NOT NULL,
	"credits" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"providerTransactionId" varchar(120),
	"externalReference" varchar(80) NOT NULL,
	"idempotencyKey" varchar(160) NOT NULL,
	"qrCode" text,
	"qrCodeBase64" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"paidAt" timestamp,
	CONSTRAINT "pediu_ad_credit_purchases_provider_unique" UNIQUE("providerTransactionId"),
	CONSTRAINT "pediu_ad_credit_purchases_idempotency_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "pediu_ad_credit_purchases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pediu_platform_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"textModel" varchar(80) DEFAULT 'gpt-5-mini' NOT NULL,
	"imageModel" varchar(80) DEFAULT 'gpt-image-2' NOT NULL,
	"imageQuality" varchar(16) DEFAULT 'medium' NOT NULL,
	"speechModel" varchar(80) DEFAULT 'whisper-1' NOT NULL,
	"creditPrice" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"dailyCap" integer DEFAULT 40 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pediu_platform_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ADD COLUMN "pixKey" varchar(255);--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ADD COLUMN "workArea" varchar(160);--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ADD COLUMN "workHours" varchar(160);--> statement-breakpoint
ALTER TABLE "pediu_generated_ads" ADD COLUMN "moderationNote" varchar(255);--> statement-breakpoint
ALTER TABLE "pediu_generated_ads" ADD COLUMN "imageData" text;--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "legalName" varchar(160);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "taxId" varchar(18);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "taxIdKind" varchar(8);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "fiscalAddress" varchar(255);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "storefrontAddress" varchar(255);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "responsibleName" varchar(160);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "responsibleTaxId" varchar(14);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "responsiblePhone" varchar(32);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "courierMode" varchar(16) DEFAULT 'pediu' NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "minOrder" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "prepMinutes" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "logoData" text;--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "stateRegistration" varchar(32);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "cityRegistration" varchar(32);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "taxRegime" varchar(40);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "cnae" varchar(16);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "usesCustomerApp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_ad_credit_purchases" ADD CONSTRAINT "pediu_ad_credit_purchases_storeId_pediu_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."pediu_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pediu_ad_credit_purchases_store_idx" ON "pediu_ad_credit_purchases" USING btree ("storeId");--> statement-breakpoint
INSERT INTO "pediu_platform_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
UPDATE "users" AS u
SET "usesCustomerApp" = 1
WHERE NOT EXISTS (SELECT 1 FROM "pediu_stores" AS s WHERE s."ownerId" = u."id")
  AND NOT EXISTS (SELECT 1 FROM "pediu_courier_profiles" AS c WHERE c."userId" = u."id");