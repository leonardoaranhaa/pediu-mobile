CREATE TABLE "pediu_loyalty_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"lifetimePoints" integer DEFAULT 0 NOT NULL,
	"tier" varchar(32) DEFAULT 'bronze' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_loyalty_accounts_user_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "pediu_loyalty_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"accountId" integer NOT NULL,
	"userId" integer NOT NULL,
	"orderId" integer,
	"direction" varchar(32) NOT NULL,
	"points" integer NOT NULL,
	"reason" varchar(80) NOT NULL,
	"note" varchar(255),
	"idempotencyKey" varchar(160),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_loyalty_ledger_idempotency_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "pediu_order_share_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"shareId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" varchar(32) DEFAULT 'guest' NOT NULL,
	"status" varchar(32) DEFAULT 'invited' NOT NULL,
	"joinedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_order_share_participants_unique" UNIQUE("shareId","userId")
);
--> statement-breakpoint
CREATE TABLE "pediu_order_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer,
	"hostUserId" integer NOT NULL,
	"storeId" integer NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"inviteCode" varchar(32) NOT NULL,
	"maxParticipants" integer DEFAULT 6 NOT NULL,
	"hostPaysAll" integer DEFAULT 1 NOT NULL,
	"note" varchar(255),
	"idempotencyKey" varchar(160) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_order_shares_invite_unique" UNIQUE("inviteCode"),
	CONSTRAINT "pediu_order_shares_idempotency_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "pediu_tip_settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"storeId" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"destination" varchar(32) DEFAULT 'courier' NOT NULL,
	"recipientUserId" integer,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"idempotencyKey" varchar(160) NOT NULL,
	"note" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"settledAt" timestamp,
	CONSTRAINT "pediu_tip_settlements_idempotency_unique" UNIQUE("idempotencyKey"),
	CONSTRAINT "pediu_tip_settlements_order_unique" UNIQUE("orderId")
);
--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD COLUMN "isFlash" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD COLUMN "tipAmount" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD COLUMN "tipDestination" varchar(32) DEFAULT 'courier' NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD COLUMN "fulfillment" varchar(16) DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_products" ADD COLUMN "saleUnit" varchar(32) DEFAULT 'unit' NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_products" ADD COLUMN "packSize" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "kind" varchar(32) DEFAULT 'restaurant' NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "flashEnabled" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "flashEtaMaxMinutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "flashFeeOverride" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "pediu_loyalty_accounts" ADD CONSTRAINT "pediu_loyalty_accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_loyalty_ledger" ADD CONSTRAINT "pediu_loyalty_ledger_accountId_pediu_loyalty_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."pediu_loyalty_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_loyalty_ledger" ADD CONSTRAINT "pediu_loyalty_ledger_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_order_share_participants" ADD CONSTRAINT "pediu_order_share_participants_shareId_pediu_order_shares_id_fk" FOREIGN KEY ("shareId") REFERENCES "public"."pediu_order_shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_order_share_participants" ADD CONSTRAINT "pediu_order_share_participants_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_order_shares" ADD CONSTRAINT "pediu_order_shares_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_order_shares" ADD CONSTRAINT "pediu_order_shares_hostUserId_users_id_fk" FOREIGN KEY ("hostUserId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_order_shares" ADD CONSTRAINT "pediu_order_shares_storeId_pediu_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."pediu_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_tip_settlements" ADD CONSTRAINT "pediu_tip_settlements_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_tip_settlements" ADD CONSTRAINT "pediu_tip_settlements_storeId_pediu_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."pediu_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_tip_settlements" ADD CONSTRAINT "pediu_tip_settlements_recipientUserId_users_id_fk" FOREIGN KEY ("recipientUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pediu_loyalty_ledger_user_created_idx" ON "pediu_loyalty_ledger" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_loyalty_ledger_order_idx" ON "pediu_loyalty_ledger" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "pediu_order_share_participants_user_idx" ON "pediu_order_share_participants" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "pediu_order_shares_host_created_idx" ON "pediu_order_shares" USING btree ("hostUserId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_order_shares_store_status_idx" ON "pediu_order_shares" USING btree ("storeId","status");--> statement-breakpoint
CREATE INDEX "pediu_tip_settlements_store_created_idx" ON "pediu_tip_settlements" USING btree ("storeId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_tip_settlements_recipient_idx" ON "pediu_tip_settlements" USING btree ("recipientUserId","status");--> statement-breakpoint
CREATE INDEX "pediu_stores_flash_idx" ON "pediu_stores" USING btree ("flashEnabled","isOpen");--> statement-breakpoint
CREATE INDEX "pediu_stores_kind_idx" ON "pediu_stores" USING btree ("kind","isOpen");