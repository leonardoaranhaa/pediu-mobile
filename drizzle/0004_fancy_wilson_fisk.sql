CREATE TABLE `pediu_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`type` varchar(40) NOT NULL DEFAULT 'general',
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_notifications_id` PRIMARY KEY(`id`)
);
