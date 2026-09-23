CREATE TABLE `pediu_delivery_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`courierId` int NOT NULL,
	`courierName` varchar(160) NOT NULL,
	`courierPhone` varchar(32),
	`etaMinutes` int,
	`status` enum('assigned','in_transit','delivered','cancelled') NOT NULL DEFAULT 'assigned',
	`currentLatitude` decimal(10,7),
	`currentLongitude` decimal(10,7),
	`lastLocationAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pediu_delivery_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `pediu_delivery_assignment_order_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `pediu_delivery_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`orderId` int NOT NULL,
	`courierId` int NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`etaMinutes` int,
	`idempotencyKey` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_delivery_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `pediu_delivery_location_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `pediu_delivery_assignment_courier_idx` ON `pediu_delivery_assignments` (`courierId`,`status`);--> statement-breakpoint
CREATE INDEX `pediu_delivery_location_assignment_created_idx` ON `pediu_delivery_locations` (`assignmentId`,`createdAt`);