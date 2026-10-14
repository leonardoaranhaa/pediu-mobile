ALTER TABLE `pediu_stores`
  ADD `kind` enum('restaurant','market','service') NOT NULL DEFAULT 'restaurant',
  ADD `flashEnabled` int NOT NULL DEFAULT 0,
  ADD `flashEtaMaxMinutes` int NOT NULL DEFAULT 30,
  ADD `flashFeeOverride` decimal(10,2);
--> statement-breakpoint
CREATE INDEX `pediu_stores_flash_idx` ON `pediu_stores` (`flashEnabled`,`isOpen`);
--> statement-breakpoint
CREATE INDEX `pediu_stores_kind_idx` ON `pediu_stores` (`kind`,`isOpen`);
--> statement-breakpoint
ALTER TABLE `pediu_orders`
  ADD `isFlash` int NOT NULL DEFAULT 0,
  ADD `tipAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
  ADD `fulfillment` varchar(16) NOT NULL DEFAULT 'standard';
--> statement-breakpoint
CREATE TABLE `pediu_loyalty_accounts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `points` int NOT NULL DEFAULT 0,
  `lifetimePoints` int NOT NULL DEFAULT 0,
  `tier` enum('bronze','prata','flash99') NOT NULL DEFAULT 'bronze',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_loyalty_accounts_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_loyalty_accounts_user_unique` UNIQUE(`userId`),
  CONSTRAINT `pediu_loyalty_accounts_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `pediu_loyalty_ledger` (
  `id` int AUTO_INCREMENT NOT NULL,
  `accountId` int NOT NULL,
  `userId` int NOT NULL,
  `orderId` int,
  `direction` enum('credit','debit') NOT NULL,
  `points` int NOT NULL,
  `reason` varchar(80) NOT NULL,
  `note` varchar(255),
  `idempotencyKey` varchar(160),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_loyalty_ledger_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_loyalty_ledger_account_fk` FOREIGN KEY (`accountId`) REFERENCES `pediu_loyalty_accounts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_loyalty_ledger_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_loyalty_ledger_idempotency_unique` UNIQUE(`idempotencyKey`),
  INDEX `pediu_loyalty_ledger_user_created_idx` (`userId`,`createdAt`),
  INDEX `pediu_loyalty_ledger_order_idx` (`orderId`)
);
