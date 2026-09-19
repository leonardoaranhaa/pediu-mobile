CREATE TABLE `pediu_admin_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actorId` int NOT NULL,
  `action` varchar(80) NOT NULL,
  `entityType` varchar(40) NOT NULL,
  `entityId` int,
  `metadata` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pediu_admin_audit_logs_id` PRIMARY KEY(`id`)
);
