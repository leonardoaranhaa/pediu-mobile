ALTER TABLE `users` ADD `themePreference` varchar(16) NOT NULL DEFAULT 'classic';
--> statement-breakpoint
CREATE TABLE `pediu_email_verification_tokens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `tokenHash` varchar(128) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `verifiedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pediu_email_verification_tokens_id` PRIMARY KEY(`id`),
  CONSTRAINT `pediu_email_verification_tokens_tokenHash_unique` UNIQUE(`tokenHash`),
  INDEX `pediu_email_verification_user_idx` (`userId`,`createdAt`),
  CONSTRAINT `pediu_email_verification_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
