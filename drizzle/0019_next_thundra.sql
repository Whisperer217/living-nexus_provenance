CREATE TABLE `guildMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guildId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guildMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guildPlaylistTracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guildId` int NOT NULL,
	`songId` int NOT NULL,
	`addedByUserId` int NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guildPlaylistTracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guilds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`bannerUrl` text,
	`avatarUrl` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guilds_id` PRIMARY KEY(`id`),
	CONSTRAINT `guilds_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `playlistVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playlistId` int NOT NULL,
	`versionNum` int NOT NULL,
	`widArray` json NOT NULL,
	`songIdArray` json NOT NULL,
	`savedByUserId` int NOT NULL,
	`note` varchar(256),
	`savedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playlistVersions_id` PRIMARY KEY(`id`)
);
