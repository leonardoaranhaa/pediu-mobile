CREATE TABLE `pediu_chat_messages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `orderId` int,
  `userId` int NOT NULL,
  `role` varchar(16) NOT NULL,
  `body` varchar(2000) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pediu_chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_coupons` (
  `id` int AUTO_INCREMENT NOT NULL,
  `code` varchar(40) NOT NULL,
  `type` varchar(16) NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `minSubtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `maxDiscount` decimal(10,2),
  `active` int NOT NULL DEFAULT 1,
  `expiresAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pediu_coupons_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `pediu_customer_addresses` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `label` varchar(40) NOT NULL,
  `recipientName` varchar(160) NOT NULL,
  `street` varchar(180) NOT NULL,
  `number` varchar(30) NOT NULL,
  `complement` varchar(120),
  `neighborhood` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(2) NOT NULL,
  `postalCode` varchar(8) NOT NULL,
  `latitude` decimal(10,7),
  `longitude` decimal(10,7),
  `isDefault` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_customer_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_delivery_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `orderId` int NOT NULL,
  `eventType` varchar(32) NOT NULL,
  `latitude` decimal(10,7),
  `longitude` decimal(10,7),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pediu_delivery_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_order_reviews` (
  `id` int AUTO_INCREMENT NOT NULL,
  `orderId` int NOT NULL,
  `userId` int NOT NULL,
  `target` varchar(16) NOT NULL,
  `productId` int,
  `rating` int NOT NULL,
  `comment` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pediu_order_reviews_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_review_unique` UNIQUE(`orderId`,`userId`,`target`,`productId`)
);
--> statement-breakpoint
CREATE INDEX `pediu_chat_order_created_idx` ON `pediu_chat_messages` (`orderId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `pediu_delivery_events_order_created_idx` ON `pediu_delivery_events` (`orderId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `pediu_review_order_idx` ON `pediu_order_reviews` (`orderId`);
