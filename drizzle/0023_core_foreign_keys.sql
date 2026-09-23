ALTER TABLE `pediu_stores` ADD CONSTRAINT `pediu_stores_owner_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_products` ADD CONSTRAINT `pediu_products_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_orders` ADD CONSTRAINT `pediu_orders_customer_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_orders` ADD CONSTRAINT `pediu_orders_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_order_items` ADD CONSTRAINT `pediu_order_items_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_order_items` ADD CONSTRAINT `pediu_order_items_product_fk` FOREIGN KEY (`productId`) REFERENCES `pediu_products`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_payments` ADD CONSTRAINT `pediu_payments_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_customer_payment_preferences` ADD CONSTRAINT `pediu_customer_payment_preferences_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_payment_accounts` ADD CONSTRAINT `pediu_payment_accounts_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_payment_transactions` ADD CONSTRAINT `pediu_payment_transactions_payment_fk` FOREIGN KEY (`paymentId`) REFERENCES `pediu_payments`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_commission_entries` ADD CONSTRAINT `pediu_commission_entries_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_commission_entries` ADD CONSTRAINT `pediu_commission_entries_payment_fk` FOREIGN KEY (`paymentId`) REFERENCES `pediu_payments`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `pediu_commission_entries` ADD CONSTRAINT `pediu_commission_entries_rule_fk` FOREIGN KEY (`ruleId`) REFERENCES `pediu_commission_rules`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `pediu_financial_ledger` ADD CONSTRAINT `pediu_financial_ledger_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_financial_ledger` ADD CONSTRAINT `pediu_financial_ledger_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `pediu_financial_ledger` ADD CONSTRAINT `pediu_financial_ledger_payment_fk` FOREIGN KEY (`paymentId`) REFERENCES `pediu_payments`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `pediu_payouts` ADD CONSTRAINT `pediu_payouts_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_refunds` ADD CONSTRAINT `pediu_refunds_payment_fk` FOREIGN KEY (`paymentId`) REFERENCES `pediu_payments`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_refunds` ADD CONSTRAINT `pediu_refunds_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_customers` ADD CONSTRAINT `pediu_customers_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_customers` ADD CONSTRAINT `pediu_customers_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `pediu_ledger_entries` ADD CONSTRAINT `pediu_ledger_entries_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_ledger_entries` ADD CONSTRAINT `pediu_ledger_entries_customer_fk` FOREIGN KEY (`customerId`) REFERENCES `pediu_customers`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_ledger_entries` ADD CONSTRAINT `pediu_ledger_entries_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `pediu_sales` ADD CONSTRAINT `pediu_sales_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_sales` ADD CONSTRAINT `pediu_sales_customer_fk` FOREIGN KEY (`customerId`) REFERENCES `pediu_customers`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `pediu_sales` ADD CONSTRAINT `pediu_sales_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `pediu_push_tokens` ADD CONSTRAINT `pediu_push_tokens_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_customer_addresses` ADD CONSTRAINT `pediu_customer_addresses_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_order_reviews` ADD CONSTRAINT `pediu_order_reviews_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_order_reviews` ADD CONSTRAINT `pediu_order_reviews_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_order_reviews` ADD CONSTRAINT `pediu_order_reviews_product_fk` FOREIGN KEY (`productId`) REFERENCES `pediu_products`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `pediu_delivery_events` ADD CONSTRAINT `pediu_delivery_events_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_delivery_assignments` ADD CONSTRAINT `pediu_delivery_assignments_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_delivery_assignments` ADD CONSTRAINT `pediu_delivery_assignments_courier_fk` FOREIGN KEY (`courierId`) REFERENCES `users`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_delivery_locations` ADD CONSTRAINT `pediu_delivery_locations_assignment_fk` FOREIGN KEY (`assignmentId`) REFERENCES `pediu_delivery_assignments`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_delivery_locations` ADD CONSTRAINT `pediu_delivery_locations_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_delivery_locations` ADD CONSTRAINT `pediu_delivery_locations_courier_fk` FOREIGN KEY (`courierId`) REFERENCES `users`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_chat_messages` ADD CONSTRAINT `pediu_chat_messages_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_chat_messages` ADD CONSTRAINT `pediu_chat_messages_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_support_tickets` ADD CONSTRAINT `pediu_support_tickets_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_support_tickets` ADD CONSTRAINT `pediu_support_tickets_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `pediu_support_ticket_messages` ADD CONSTRAINT `pediu_support_ticket_messages_ticket_fk` FOREIGN KEY (`ticketId`) REFERENCES `pediu_support_tickets`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_support_ticket_messages` ADD CONSTRAINT `pediu_support_ticket_messages_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_privacy_consents` ADD CONSTRAINT `pediu_privacy_consents_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_admin_audit_logs` ADD CONSTRAINT `pediu_admin_audit_logs_actor_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `pediu_notifications` ADD CONSTRAINT `pediu_notifications_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `pediu_notification_preferences` ADD CONSTRAINT `pediu_notification_preferences_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
