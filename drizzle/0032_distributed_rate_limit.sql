CREATE TABLE `pediu_rate_limit_buckets` (
  `bucketKey` varchar(255) NOT NULL,
  `requestCount` int unsigned NOT NULL DEFAULT 0,
  `windowStartedAt` timestamp NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`bucketKey`),
  KEY `pediu_rate_limit_expires_idx` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
