CREATE TABLE `pediu_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(32),
	`notes` text,
	`balance` decimal(10,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`customerId` int NOT NULL,
	`type` enum('credit','payment') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_ledger_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`customerId` int,
	`orderId` int,
	`total` decimal(10,2) NOT NULL,
	`paymentMethod` enum('pix','card','cash','fiado') NOT NULL,
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_sales_id` PRIMARY KEY(`id`)
);
