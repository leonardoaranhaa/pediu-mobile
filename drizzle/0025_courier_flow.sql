ALTER TABLE `users` MODIFY COLUMN `role` ENUM('user','merchant','courier','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pediu_courier_profiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `status` ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
  `vehicleType` ENUM('bike','moto','car') NOT NULL,
  `vehiclePlate` varchar(16),
  `phone` varchar(32),
  `availability` ENUM('offline','available','busy') NOT NULL DEFAULT 'offline',
  `locationConsentAt` timestamp NULL,
  `approvedAt` timestamp NULL,
  `statusReason` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_courier_profiles_pk` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_courier_profile_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_courier_profile_user_unique` UNIQUE (`userId`),
  INDEX `pediu_courier_status_availability_idx` (`status`,`availability`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pediu_store_couriers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `storeId` int NOT NULL,
  `courierUserId` int NOT NULL,
  `status` ENUM('pending','active','revoked') NOT NULL DEFAULT 'pending',
  `invitedBy` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_store_couriers_pk` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_store_couriers_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_store_couriers_user_fk` FOREIGN KEY (`courierUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_store_couriers_invited_by_fk` FOREIGN KEY (`invitedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `pediu_store_courier_unique` UNIQUE (`storeId`,`courierUserId`),
  INDEX `pediu_store_courier_status_idx` (`courierUserId`,`status`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pediu_delivery_offers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `orderId` int NOT NULL,
  `storeId` int NOT NULL,
  `courierUserId` int NOT NULL,
  `status` ENUM('pending','accepted','rejected','expired','cancelled') NOT NULL DEFAULT 'pending',
  `etaMinutes` int NULL,
  `message` varchar(255),
  `idempotencyKey` varchar(160) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `respondedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_delivery_offers_pk` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_delivery_offers_order_fk` FOREIGN KEY (`orderId`) REFERENCES `pediu_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_delivery_offers_store_fk` FOREIGN KEY (`storeId`) REFERENCES `pediu_stores`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_delivery_offers_user_fk` FOREIGN KEY (`courierUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_delivery_offer_idempotency_unique` UNIQUE (`idempotencyKey`),
  INDEX `pediu_delivery_offer_courier_status_idx` (`courierUserId`,`status`,`expiresAt`),
  INDEX `pediu_delivery_offer_order_status_idx` (`orderId`,`status`)
);
