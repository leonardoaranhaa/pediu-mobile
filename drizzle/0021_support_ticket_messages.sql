CREATE TABLE `pediu_support_ticket_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`userId` int NOT NULL,
	`role` varchar(16) NOT NULL,
	`body` varchar(4000) NOT NULL,
	`idempotencyKey` varchar(160),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_support_ticket_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pediu_support_message_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `pediu_support_message_ticket_created_idx` ON `pediu_support_ticket_messages` (`ticketId`,`createdAt`);