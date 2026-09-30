ALTER TABLE `pediu_products` ADD COLUMN `inventoryTracked` int NOT NULL DEFAULT 0 AFTER `available`;--> statement-breakpoint
ALTER TABLE `pediu_products` ADD COLUMN `stockQuantity` int NOT NULL DEFAULT 0 AFTER `inventoryTracked`;--> statement-breakpoint
ALTER TABLE `pediu_products` ADD COLUMN `reservedQuantity` int NOT NULL DEFAULT 0 AFTER `stockQuantity`;--> statement-breakpoint
CREATE INDEX `pediu_products_inventory_idx` ON `pediu_products` (`storeId`,`inventoryTracked`,`available`);