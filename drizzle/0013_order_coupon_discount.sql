ALTER TABLE `pediu_orders` ADD `couponCode` varchar(40);--> statement-breakpoint
ALTER TABLE `pediu_orders` ADD `discount` decimal(10,2) DEFAULT '0.00' NOT NULL;