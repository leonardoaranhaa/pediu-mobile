CREATE TABLE `pediu_privacy_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` varchar(40) NOT NULL,
	`version` varchar(20) NOT NULL,
	`acceptedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pediu_privacy_consents_id` PRIMARY KEY(`id`),
	CONSTRAINT `pediu_privacy_consent_unique` UNIQUE(`userId`,`kind`,`version`)
);
--> statement-breakpoint
CREATE INDEX `pediu_privacy_consent_user_idx` ON `pediu_privacy_consents` (`userId`);