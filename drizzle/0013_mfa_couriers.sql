CREATE TABLE IF NOT EXISTS `pediu_mfa_challenges` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `channel` enum('sms','whatsapp','email') NOT NULL,
  `destination` varchar(320) NOT NULL,
  `codeHash` varchar(128) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `consumedAt` timestamp NULL,
  `attempts` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `pediu_mfa_user_created_idx` (`userId`,`createdAt`)
);

CREATE TABLE IF NOT EXISTS `pediu_courier_profiles` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `phone` varchar(32),
  `active` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `pediu_courier_assignments` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `orderId` int NOT NULL,
  `courierUserId` int NOT NULL,
  `active` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `pediu_courier_assignment_unique` (`orderId`,`courierUserId`),
  KEY `pediu_courier_assignment_order_idx` (`orderId`)
);
