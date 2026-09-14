CREATE TABLE `pediu_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL,
	CONSTRAINT `pediu_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`storeId` int NOT NULL,
	`status` enum('Pendente','Preparando','A caminho','Entregue','Cancelado') NOT NULL DEFAULT 'Pendente',
	`total` decimal(10,2) NOT NULL,
	`deliveryAddress` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pediu_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`method` enum('pix','card','cash') NOT NULL DEFAULT 'pix',
	`status` enum('pending','paid','failed') NOT NULL DEFAULT 'pending',
	`pixKey` varchar(255),
	`transactionId` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`category` varchar(80) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`available` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pediu_stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(32),
	`address` varchar(255),
	`pixKey` varchar(255),
	`deliveryFee` decimal(10,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `pediu_stores_owner_unique` UNIQUE(`ownerId`)
);
