CREATE TABLE `pediu_notification_outbox` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notificationId` int NOT NULL,
  `userId` int NOT NULL,
  `payload` text NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'pending',
  `attemptCount` int NOT NULL DEFAULT 0,
  `availableAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lockedAt` timestamp NULL,
  `lastError` varchar(500) NULL,
  `sentAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pediu_notification_outbox_notification_unique` (`notificationId`),
  KEY `pediu_notification_outbox_status_available_idx` (`status`, `availableAt`, `id`),
  CONSTRAINT `pediu_notification_outbox_notification_fk` FOREIGN KEY (`notificationId`) REFERENCES `pediu_notifications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pediu_notification_outbox_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
