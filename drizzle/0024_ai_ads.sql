CREATE TABLE IF NOT EXISTS `pediu_ad_credits` (
  `id` int AUTO_INCREMENT NOT NULL,
  `storeId` int NOT NULL,
  `balance` int NOT NULL DEFAULT 3,
  `lifetimeGranted` int NOT NULL DEFAULT 3,
  `lifetimeUsed` int NOT NULL DEFAULT 0,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_ad_credits_pk` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_ad_credits_store_unique` UNIQUE(`storeId`),
  CONSTRAINT `pediu_ad_credits_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pediu_generated_ads` (
  `id` int AUTO_INCREMENT NOT NULL,
  `storeId` int NOT NULL,
  `productId` int,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `headline` varchar(120) NOT NULL,
  `description` varchar(500) NOT NULL,
  `cta` varchar(80) NOT NULL,
  `offerLabel` varchar(120),
  `visualPrompt` text NOT NULL,
  `imageKey` varchar(512),
  `model` varchar(80),
  `generationCost` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `publishedAt` timestamp NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_generated_ads_pk` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_generated_ads_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_generated_ads_product_fk` FOREIGN KEY (`productId`) REFERENCES `pediu_products`(`id`) ON DELETE SET NULL,
  INDEX `pediu_generated_ads_store_status_created_idx` (`storeId`, `status`, `createdAt`),
  INDEX `pediu_generated_ads_product_status_idx` (`productId`, `status`)
);
