ALTER TABLE `pediu_payment_transactions`
  ADD COLUMN `externalReference` varchar(255) NULL,
  ADD COLUMN `qrCode` text NULL,
  ADD COLUMN `qrCodeBase64` text NULL,
  ADD COLUMN `ticketUrl` varchar(1024) NULL;
