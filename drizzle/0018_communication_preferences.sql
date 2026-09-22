CREATE TABLE `pediu_notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderUpdates` int NOT NULL DEFAULT 1,
	`supportMessages` int NOT NULL DEFAULT 1,
	`promotions` int NOT NULL DEFAULT 1,
	`pushEnabled` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pediu_notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `pediu_notification_preferences_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `pediu_chat_messages` ADD `idempotencyKey` varchar(160);--> statement-breakpoint
ALTER TABLE `pediu_chat_messages` ADD `readAt` timestamp;--> statement-breakpoint
ALTER TABLE `pediu_notifications` ADD `actionPath` varchar(255);--> statement-breakpoint
ALTER TABLE `pediu_chat_messages` ADD CONSTRAINT `pediu_chat_message_idempotency_unique` UNIQUE(`idempotencyKey`);