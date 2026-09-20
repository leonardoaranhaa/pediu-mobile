ALTER TABLE `pediu_stores` ADD INDEX `pediu_stores_open_idx` (`isOpen`);
--> statement-breakpoint
ALTER TABLE `pediu_customers` ADD INDEX `pediu_customers_store_idx` (`storeId`);
--> statement-breakpoint
ALTER TABLE `pediu_ledger_entries` ADD INDEX `pediu_ledger_store_customer_created_idx` (`storeId`, `customerId`, `createdAt`);
--> statement-breakpoint
ALTER TABLE `pediu_sales` ADD INDEX `pediu_sales_store_created_idx` (`storeId`, `createdAt`);
--> statement-breakpoint
ALTER TABLE `pediu_push_tokens` ADD INDEX `pediu_push_tokens_user_idx` (`userId`);
--> statement-breakpoint
ALTER TABLE `pediu_admin_audit_logs` ADD INDEX `pediu_admin_audit_created_idx` (`createdAt`);