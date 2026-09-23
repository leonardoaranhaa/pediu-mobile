CREATE TABLE `pediu_support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`subject` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pediu_support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `pediu_support_user_created_idx` ON `pediu_support_tickets` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pediu_support_order_idx` ON `pediu_support_tickets` (`orderId`);