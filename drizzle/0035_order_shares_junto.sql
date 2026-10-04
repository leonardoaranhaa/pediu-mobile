CREATE TABLE `pediu_order_shares` (
  `id` int AUTO_INCREMENT NOT NULL,
  `orderId` int,
  `hostUserId` int NOT NULL,
  `storeId` int NOT NULL,
  `status` enum('draft','open','locked','paid','cancelled') NOT NULL DEFAULT 'draft',
  `inviteCode` varchar(32) NOT NULL,
  `maxParticipants` int NOT NULL DEFAULT 6,
  `hostPaysAll` int NOT NULL DEFAULT 1,
  `note` varchar(255),
  `idempotencyKey` varchar(160) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_order_shares_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_order_shares_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE SET NULL,
  CONSTRAINT `pediu_order_shares_host_fk` FOREIGN KEY (`hostUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_order_shares_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `pediu_order_shares_invite_unique` UNIQUE(`inviteCode`),
  CONSTRAINT `pediu_order_shares_idempotency_unique` UNIQUE(`idempotencyKey`),
  INDEX `pediu_order_shares_host_created_idx` (`hostUserId`,`createdAt`),
  INDEX `pediu_order_shares_store_status_idx` (`storeId`,`status`)
);
--> statement-breakpoint
CREATE TABLE `pediu_order_share_participants` (
  `id` int AUTO_INCREMENT NOT NULL,
  `shareId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('host','guest') NOT NULL DEFAULT 'guest',
  `status` enum('invited','joined','left') NOT NULL DEFAULT 'invited',
  `joinedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pediu_order_share_participants_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_order_share_participants_share_fk` FOREIGN KEY (`shareId`) REFERENCES `pediu_order_shares`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_order_share_participants_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_order_share_participants_unique` UNIQUE(`shareId`,`userId`),
  INDEX `pediu_order_share_participants_user_idx` (`userId`,`status`)
);
