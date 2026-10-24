CREATE TABLE "pediu_courier_earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"courierUserId" integer NOT NULL,
	"orderId" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_courier_earnings_order_unique" UNIQUE("orderId")
);
--> statement-breakpoint
ALTER TABLE "pediu_courier_earnings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pediu_product_option_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"name" varchar(80) NOT NULL,
	"required" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pediu_product_option_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pediu_product_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer NOT NULL,
	"name" varchar(80) NOT NULL,
	"priceDelta" numeric(10, 2) DEFAULT '0.00' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pediu_product_options" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ADD COLUMN "documentNumber" varchar(40);--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ADD COLUMN "documentPhoto" text;--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ADD COLUMN "vehiclePhoto" text;--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ADD COLUMN "selfiePhoto" text;--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ADD COLUMN "lastLatitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ADD COLUMN "lastLongitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ADD COLUMN "lastLocationAt" timestamp;--> statement-breakpoint
ALTER TABLE "pediu_delivery_offers" ADD COLUMN "payoutAmount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "pediu_delivery_offers" ADD COLUMN "pickupDistanceKm" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "pediu_delivery_offers" ADD COLUMN "dropoffDistanceKm" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD COLUMN "cancelReason" varchar(255);--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD COLUMN "deliveryCode" varchar(4);--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD COLUMN "changeFor" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD COLUMN "destinationLatitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD COLUMN "destinationLongitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD COLUMN "deliveryPhoto" text;--> statement-breakpoint
ALTER TABLE "pediu_products" ADD COLUMN "imageData" text;--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD COLUMN "openingHours" text;--> statement-breakpoint
ALTER TABLE "pediu_courier_earnings" ADD CONSTRAINT "pediu_courier_earnings_courierUserId_users_id_fk" FOREIGN KEY ("courierUserId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_courier_earnings" ADD CONSTRAINT "pediu_courier_earnings_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_product_option_groups" ADD CONSTRAINT "pediu_product_option_groups_productId_pediu_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."pediu_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_product_options" ADD CONSTRAINT "pediu_product_options_groupId_pediu_product_option_groups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."pediu_product_option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pediu_courier_earnings_courier_created_idx" ON "pediu_courier_earnings" USING btree ("courierUserId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_product_option_groups_product_idx" ON "pediu_product_option_groups" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "pediu_product_options_group_idx" ON "pediu_product_options" USING btree ("groupId");