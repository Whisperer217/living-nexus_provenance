CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`keyPrefix` varchar(12) NOT NULL,
	`name` varchar(128) NOT NULL,
	`tier` enum('free','pro','enterprise') NOT NULL DEFAULT 'free',
	`dailyLimit` int NOT NULL DEFAULT 100,
	`usageToday` int NOT NULL DEFAULT 0,
	`usageTotal` bigint NOT NULL DEFAULT 0,
	`lastUsedAt` timestamp,
	`resetAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `apiKeys_keyHash_unique` UNIQUE(`keyHash`)
);
