CREATE TABLE `pediu_push_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`platform` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_push_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `pediu_push_tokens_token_unique` UNIQUE(`token`)
);
