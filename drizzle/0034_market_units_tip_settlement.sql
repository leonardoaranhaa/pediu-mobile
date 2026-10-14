ALTER TABLE `pediu_products`
  ADD `saleUnit` enum('unit','kg','g','L','ml','pack') NOT NULL DEFAULT 'unit',
  ADD `packSize` decimal(10,3);
--> statement-breakpoint
ALTER TABLE `pediu_orders`
  ADD `tipDestination` enum('courier','store','platform_pool') NOT NULL DEFAULT 'courier';
--> statement-breakpoint
ALTER TABLE `pediu_financial_ledger`
  MODIFY `type` enum('sale','gateway_fee','commission','receivable','payout','refund','adjustment','tip') NOT NULL;
--> statement-breakpoint
CREATE TABLE `pediu_tip_settlements` (
  `id` int AUTO_INCREMENT NOT NULL,
  `orderId` int NOT NULL,
  `storeId` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `destination` enum('courier','store','platform_pool') NOT NULL DEFAULT 'courier',
  `recipientUserId` int,
  `status` enum('pending','settled','reversed') NOT NULL DEFAULT 'pending',
  `idempotencyKey` varchar(160) NOT NULL,
  `note` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `settledAt` timestamp,
  CONSTRAINT `pediu_tip_settlements_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_tip_settlements_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_tip_settlements_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `pediu_tip_settlements_recipient_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `pediu_tip_settlements_idempotency_unique` UNIQUE(`idempotencyKey`),
  CONSTRAINT `pediu_tip_settlements_order_unique` UNIQUE(`orderId`),
  INDEX `pediu_tip_settlements_store_created_idx` (`storeId`,`createdAt`),
  INDEX `pediu_tip_settlements_recipient_idx` (`recipientUserId`,`status`)
);
