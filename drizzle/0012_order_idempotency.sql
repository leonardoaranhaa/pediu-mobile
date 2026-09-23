ALTER TABLE `pediu_orders` ADD `idempotencyKey` varchar(160);--> statement-breakpoint
ALTER TABLE `pediu_orders` ADD CONSTRAINT `pediu_orders_idempotency_unique` UNIQUE(`idempotencyKey`);