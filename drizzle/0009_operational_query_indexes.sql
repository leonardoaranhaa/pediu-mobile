ALTER TABLE `pediu_products` ADD INDEX `pediu_products_store_available_idx` (`storeId`, `available`);
--> statement-breakpoint
ALTER TABLE `pediu_orders` ADD INDEX `pediu_orders_customer_created_idx` (`customerId`, `createdAt`);
--> statement-breakpoint
ALTER TABLE `pediu_orders` ADD INDEX `pediu_orders_store_status_created_idx` (`storeId`, `status`, `createdAt`);
--> statement-breakpoint
ALTER TABLE `pediu_order_items` ADD INDEX `pediu_order_items_order_idx` (`orderId`);
--> statement-breakpoint
ALTER TABLE `pediu_payments` ADD INDEX `pediu_payments_order_status_idx` (`orderId`, `status`);
--> statement-breakpoint
ALTER TABLE `pediu_notifications` ADD INDEX `pediu_notifications_user_read_created_idx` (`userId`, `readAt`, `createdAt`);