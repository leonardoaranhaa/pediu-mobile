CREATE TABLE "pediu_coupon_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"couponId" integer NOT NULL,
	"userId" integer NOT NULL,
	"orderId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_coupon_redemptions_order_unique" UNIQUE("orderId")
);
--> statement-breakpoint
ALTER TABLE "pediu_coupon_redemptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_order_reviews" DROP CONSTRAINT "pediu_review_unique";--> statement-breakpoint
ALTER TABLE "pediu_coupons" ADD COLUMN "usageLimit" integer;--> statement-breakpoint
ALTER TABLE "pediu_coupons" ADD COLUMN "perUserLimit" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "pediu_coupons" ADD COLUMN "usedCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_coupons" ADD COLUMN "ownerUserId" integer;--> statement-breakpoint
ALTER TABLE "pediu_coupons" ADD COLUMN "isPublic" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_product_option_groups" ADD COLUMN "minChoices" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_product_option_groups" ADD COLUMN "maxChoices" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "pediu_coupon_redemptions" ADD CONSTRAINT "pediu_coupon_redemptions_couponId_pediu_coupons_id_fk" FOREIGN KEY ("couponId") REFERENCES "public"."pediu_coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_coupon_redemptions" ADD CONSTRAINT "pediu_coupon_redemptions_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pediu_coupon_redemptions_coupon_user_idx" ON "pediu_coupon_redemptions" USING btree ("couponId","userId");--> statement-breakpoint
-- Older store and courier reviews could be saved twice because NULL productId never collided. Keep the first one.
DELETE FROM "pediu_order_reviews" r USING "pediu_order_reviews" k WHERE r."orderId" = k."orderId" AND r."userId" = k."userId" AND r."target" = k."target" AND r."productId" IS NOT DISTINCT FROM k."productId" AND r."id" > k."id";--> statement-breakpoint
ALTER TABLE "pediu_order_reviews" ADD CONSTRAINT "pediu_review_unique" UNIQUE NULLS NOT DISTINCT("orderId","userId","target","productId");--> statement-breakpoint
-- A required group already meant "pick exactly one".
UPDATE "pediu_product_option_groups" SET "minChoices" = 1 WHERE "required" = 1;--> statement-breakpoint
-- Loyalty coupons belong to whoever redeemed the points, are used once and are never listed.
UPDATE "pediu_coupons" c SET "ownerUserId" = l."userId", "isPublic" = 0, "usageLimit" = 1 FROM "pediu_loyalty_ledger" l WHERE l."note" = 'coupon:' || c."code";--> statement-breakpoint
UPDATE "pediu_coupons" SET "isPublic" = 0, "usageLimit" = 1 WHERE "code" LIKE 'CLUBE%';--> statement-breakpoint
-- Count past uses so limits start from what already happened.
INSERT INTO "pediu_coupon_redemptions" ("couponId", "userId", "orderId", "createdAt") SELECT c."id", o."customerId", o."id", o."createdAt" FROM "pediu_orders" o JOIN "pediu_coupons" c ON c."code" = o."couponCode" WHERE o."status" <> 'Cancelado' ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "pediu_coupons" c SET "usedCount" = (SELECT count(*) FROM "pediu_coupon_redemptions" r WHERE r."couponId" = c."id");