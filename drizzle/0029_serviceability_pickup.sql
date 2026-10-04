ALTER TABLE `pediu_stores`
  ADD COLUMN `deliveryEnabled` int NOT NULL DEFAULT 1 AFTER `deliveryFee`;
--> statement-breakpoint
ALTER TABLE `pediu_stores`
  ADD COLUMN `pickupEnabled` int NOT NULL DEFAULT 0 AFTER `deliveryEnabled`;
--> statement-breakpoint
ALTER TABLE `pediu_stores`
  ADD COLUMN `deliveryRadiusKm` decimal(6,2) NOT NULL DEFAULT '10.00' AFTER `pickupEnabled`;
--> statement-breakpoint
ALTER TABLE `pediu_stores`
  ADD COLUMN `latitude` decimal(10,7) NULL AFTER `deliveryRadiusKm`;
--> statement-breakpoint
ALTER TABLE `pediu_stores`
  ADD COLUMN `longitude` decimal(10,7) NULL AFTER `latitude`;
--> statement-breakpoint
ALTER TABLE `pediu_orders`
  ADD COLUMN `fulfillmentMode` enum('delivery','pickup') NOT NULL DEFAULT 'delivery' AFTER `deliveryAddress`;
--> statement-breakpoint
ALTER TABLE `pediu_orders`
  ADD COLUMN `deliveryFeeSnapshot` decimal(10,2) NOT NULL DEFAULT '0.00' AFTER `fulfillmentMode`;
