ALTER TABLE `pediu_payment_transactions`
  ADD COLUMN `externalReference` varchar(255) NULL AFTER `idempotencyKey`,
  ADD COLUMN `qrCode` text NULL AFTER `externalReference`,
  ADD COLUMN `qrCodeBase64` text NULL AFTER `qrCode`,
  ADD COLUMN `ticketUrl` varchar(1024) NULL AFTER `qrCodeBase64`;
