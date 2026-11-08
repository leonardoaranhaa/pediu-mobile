ALTER TABLE "pediu_account_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_ad_credits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_admin_audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_chat_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_commission_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_commission_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_coupons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_customer_addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_customer_payment_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_delivery_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_delivery_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_delivery_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_delivery_offers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_email_verification_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_financial_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_generated_ads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_ledger_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_loyalty_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_loyalty_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_notification_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_notification_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_order_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_order_share_participants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_order_shares" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_payment_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_payment_reconciliation_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_payment_reconciliation_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_payment_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_payouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_privacy_consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_push_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_rate_limit_buckets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_sales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_store_couriers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_stores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_support_ticket_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_support_tickets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_tip_settlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pediu_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_chat_user_idx" ON "pediu_chat_messages" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_customer_addresses_user_idx" ON "pediu_customer_addresses" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_delivery_location_courier_idx" ON "pediu_delivery_locations" USING btree ("courierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_delivery_offer_store_idx" ON "pediu_delivery_offers" USING btree ("storeId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_loyalty_ledger_account_idx" ON "pediu_loyalty_ledger" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_notification_outbox_user_idx" ON "pediu_notification_outbox" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_order_items_product_idx" ON "pediu_order_items" USING btree ("productId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_order_shares_order_idx" ON "pediu_order_shares" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_store_courier_invited_by_idx" ON "pediu_store_couriers" USING btree ("invitedBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pediu_support_message_user_idx" ON "pediu_support_ticket_messages" USING btree ("userId");