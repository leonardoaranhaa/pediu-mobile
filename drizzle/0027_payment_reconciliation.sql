ALTER TABLE `pediu_refunds` ADD COLUMN `idempotencyKey` varchar(160) NULL AFTER `providerRefundId`;--> statement-breakpoint
UPDATE `pediu_refunds` SET `idempotencyKey` = CONCAT('legacy-refund-', `id`) WHERE `idempotencyKey` IS NULL;--> statement-breakpoint
ALTER TABLE `pediu_refunds` MODIFY COLUMN `idempotencyKey` varchar(160) NOT NULL;--> statement-breakpoint
ALTER TABLE `pediu_refunds` ADD COLUMN `currency` varchar(3) NOT NULL DEFAULT 'BRL' AFTER `amount`;--> statement-breakpoint
ALTER TABLE `pediu_refunds` ADD CONSTRAINT `pediu_refunds_provider_idempotency_unique` UNIQUE (`provider`,`idempotencyKey`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pediu_payment_reconciliation_runs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `provider` varchar(40) NOT NULL,
  `idempotencyKey` varchar(160) NOT NULL,
  `periodStart` timestamp NOT NULL,
  `periodEnd` timestamp NOT NULL,
  `status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
  `matchedCount` int NOT NULL DEFAULT 0,
  `mismatchCount` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL,
  CONSTRAINT `pediu_payment_reconciliation_runs_pk` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_payment_reconciliation_provider_idempotency_unique` UNIQUE (`provider`,`idempotencyKey`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pediu_payment_reconciliation_items` (
  `id` int AUTO_INCREMENT NOT NULL,
  `runId` int NOT NULL,
  `providerTransactionId` varchar(160) NOT NULL,
  `paymentId` int NULL,
  `orderId` int NULL,
  `classification` enum('matched','missing_internal','missing_provider','amount_mismatch','currency_mismatch','status_mismatch','duplicate') NOT NULL,
  `providerStatus` varchar(32) NOT NULL,
  `internalStatus` varchar(32),
  `providerAmount` decimal(10,2) NOT NULL,
  `internalAmount` decimal(10,2),
  `currency` varchar(3) NOT NULL,
  `details` varchar(500),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_payment_reconciliation_items_pk` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_payment_reconciliation_items_run_fk` FOREIGN KEY (`runId`) REFERENCES `pediu_payment_reconciliation_runs`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_payment_reconciliation_run_transaction_unique` UNIQUE (`runId`,`providerTransactionId`),
  INDEX `pediu_payment_reconciliation_run_created_idx` (`runId`,`createdAt`)
);
