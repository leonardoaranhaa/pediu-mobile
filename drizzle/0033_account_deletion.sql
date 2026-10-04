ALTER TABLE `users` MODIFY COLUMN `openId` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deletedAt` timestamp NULL;--> statement-breakpoint
CREATE TABLE `pediu_revoked_identities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`revokedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_revoked_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `pediu_revoked_identities_openId_unique` UNIQUE(`openId`)
);--> statement-breakpoint
ALTER TABLE `pediu_revoked_identities` ADD CONSTRAINT `pediu_revoked_identities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pediu_revoked_identities_user_idx` ON `pediu_revoked_identities` (`userId`);
