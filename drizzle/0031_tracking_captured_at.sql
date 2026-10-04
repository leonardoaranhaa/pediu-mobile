ALTER TABLE `pediu_delivery_locations`
  ADD COLUMN `capturedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `idempotencyKey`;
--> statement-breakpoint
CREATE INDEX `pediu_delivery_location_order_captured_idx`
  ON `pediu_delivery_locations` (`orderId`, `capturedAt`, `id`);
