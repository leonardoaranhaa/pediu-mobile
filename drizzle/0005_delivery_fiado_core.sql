ALTER TABLE `users` MODIFY COLUMN `role` enum('user','merchant','admin') NOT NULL DEFAULT 'user';
--> statement-breakpoint
ALTER TABLE `pediu_stores` ADD COLUMN `isOpen` int NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `pediu_orders` MODIFY COLUMN `status` enum('Pendente','Aceito','Preparando','Pronto','A caminho','Entregue','Cancelado') NOT NULL DEFAULT 'Pendente';
--> statement-breakpoint
ALTER TABLE `pediu_payments` MODIFY COLUMN `method` enum('pix','card','cash','fiado') NOT NULL DEFAULT 'pix';
--> statement-breakpoint
ALTER TABLE `pediu_payments` MODIFY COLUMN `status` enum('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `pediu_customers` ADD COLUMN `userId` int;
--> statement-breakpoint
ALTER TABLE `pediu_customers` ADD COLUMN `creditLimit` decimal(10,2) NOT NULL DEFAULT '0.00';
--> statement-breakpoint
ALTER TABLE `pediu_customers` ADD COLUMN `status` enum('active','blocked') NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE `pediu_ledger_entries` ADD COLUMN `orderId` int;
--> statement-breakpoint
ALTER TABLE `pediu_ledger_entries` ADD COLUMN `balanceAfter` decimal(10,2);
--> statement-breakpoint
ALTER TABLE `pediu_ledger_entries` MODIFY COLUMN `type` enum('credit','payment','adjustment','reversal') NOT NULL;
--> statement-breakpoint
ALTER TABLE `pediu_customers` ADD CONSTRAINT `pediu_customers_store_user_unique` UNIQUE (`storeId`,`userId`);
