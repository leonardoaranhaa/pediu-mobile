CREATE TABLE `pediu_customer_payment_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pixEnabled` int NOT NULL DEFAULT 1,
	`cardEnabled` int NOT NULL DEFAULT 0,
	`cashEnabled` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pediu_customer_payment_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `pediu_customer_payment_preferences_user_unique` UNIQUE(`userId`)
);
