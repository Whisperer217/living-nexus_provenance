CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('witness','comment','like','tip','playlist_invite','new_track','system') NOT NULL,
	`title` varchar(256) NOT NULL,
	`body` text,
	`actorId` int,
	`actorName` varchar(128),
	`actorAvatarUrl` text,
	`refId` int,
	`refType` varchar(32),
	`isRead` boolean NOT NULL DEFAULT false,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playlistCollaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playlistId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('editor','viewer') NOT NULL DEFAULT 'editor',
	`invitedByUserId` int NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playlistCollaborators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playlistTracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playlistId` int NOT NULL,
	`songId` int NOT NULL,
	`addedByUserId` int NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playlistTracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`coverArtUrl` text,
	`isPublic` boolean NOT NULL DEFAULT false,
	`isCollaborative` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playlists_id` PRIMARY KEY(`id`)
);
