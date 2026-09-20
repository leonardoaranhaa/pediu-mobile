CREATE TABLE `pediu_payment_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `storeId` int NOT NULL,
  `provider` varchar(40) NOT NULL,
  `providerAccountId` varchar(160),
  `onboardingStatus` enum('pending','active','restricted','disabled') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_payment_accounts_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_payment_accounts_store_unique` UNIQUE (`storeId`),
  CONSTRAINT `pediu_payment_accounts_provider_account_unique` UNIQUE (`provider`,`providerAccountId`)
);
--> statement-breakpoint
CREATE TABLE `pediu_payment_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paymentId` int NOT NULL,
  `provider` varchar(40) NOT NULL,
  `providerTransactionId` varchar(160),
  `status` enum('pending','authorized','paid','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
  `amount` decimal(10,2) NOT NULL,
  `gatewayFee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) NOT NULL DEFAULT 'BRL',
  `idempotencyKey` varchar(160),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_payment_transactions_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_payment_transactions_provider_tx_unique` UNIQUE (`provider`,`providerTransactionId`),
  CONSTRAINT `pediu_payment_transactions_idempotency_unique` UNIQUE (`provider`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `pediu_commission_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `storeId` int,
  `type` enum('percentage','fixed','hybrid') NOT NULL,
  `percentage` decimal(7,4) NOT NULL DEFAULT '0.0000',
  `fixedAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `activeFrom` timestamp NOT NULL DEFAULT (now()),
  `activeUntil` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pediu_commission_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_commission_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` int NOT NULL,
  `paymentId` int,
  `ruleId` int,
  `grossAmount` decimal(10,2) NOT NULL,
  `commissionAmount` decimal(10,2) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pediu_commission_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_financial_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `storeId` int NOT NULL,
  `orderId` int,
  `paymentId` int,
  `type` enum('sale','gateway_fee','commission','receivable','payout','refund','adjustment') NOT NULL,
  `direction` enum('credit','debit') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'BRL',
  `referenceId` varchar(160),
  `note` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pediu_financial_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_payouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `storeId` int NOT NULL,
  `provider` varchar(40) NOT NULL,
  `providerPayoutId` varchar(160),
  `status` enum('pending','processing','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
  `grossAmount` decimal(10,2) NOT NULL,
  `fees` decimal(10,2) NOT NULL DEFAULT '0.00',
  `netAmount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'BRL',
  `scheduledAt` timestamp,
  `paidAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pediu_payouts_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_payouts_provider_payout_unique` UNIQUE (`provider`,`providerPayoutId`)
);
--> statement-breakpoint
CREATE TABLE `pediu_refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paymentId` int NOT NULL,
  `orderId` int NOT NULL,
  `provider` varchar(40) NOT NULL,
  `providerRefundId` varchar(160),
  `status` enum('pending','processing','refunded','failed') NOT NULL DEFAULT 'pending',
  `amount` decimal(10,2) NOT NULL,
  `reason` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `completedAt` timestamp,
  CONSTRAINT `pediu_refunds_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_refunds_provider_refund_unique` UNIQUE (`provider`,`providerRefundId`)
);
--> statement-breakpoint
CREATE TABLE `pediu_webhook_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider` varchar(40) NOT NULL,
  `providerEventId` varchar(160) NOT NULL,
  `eventType` varchar(100) NOT NULL,
  `status` enum('received','processed','ignored','failed') NOT NULL DEFAULT 'received',
  `payload` text,
  `processedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pediu_webhook_events_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_webhook_events_provider_event_unique` UNIQUE (`provider`,`providerEventId`)
);
