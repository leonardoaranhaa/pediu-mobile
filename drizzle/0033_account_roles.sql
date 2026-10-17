CREATE TABLE IF NOT EXISTS `pediu_account_roles` (
  `userId` int NOT NULL,
  `role` ENUM('customer','merchant','courier','admin') NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`, `role`),
  CONSTRAINT `pediu_account_roles_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--> statement-breakpoint
INSERT IGNORE INTO `pediu_account_roles` (`userId`, `role`)
SELECT `id`, 'customer' FROM `users`;--> statement-breakpoint
INSERT IGNORE INTO `pediu_account_roles` (`userId`, `role`)
SELECT `id`, 'admin' FROM `users` WHERE `role` = 'admin';--> statement-breakpoint
INSERT IGNORE INTO `pediu_account_roles` (`userId`, `role`)
SELECT `id`, 'merchant' FROM `users` WHERE `role` = 'merchant';--> statement-breakpoint
INSERT IGNORE INTO `pediu_account_roles` (`userId`, `role`)
SELECT `ownerId`, 'merchant' FROM `pediu_stores`;--> statement-breakpoint
INSERT IGNORE INTO `pediu_account_roles` (`userId`, `role`)
SELECT `id`, 'courier' FROM `users` WHERE `role` = 'courier';--> statement-breakpoint
INSERT IGNORE INTO `pediu_account_roles` (`userId`, `role`)
SELECT `userId`, 'courier' FROM `pediu_courier_profiles`;
