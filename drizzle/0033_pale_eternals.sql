CREATE TABLE `shareArtifacts` (
	`wid` varchar(128) NOT NULL,
	`title` varchar(512) NOT NULL,
	`creatorName` varchar(256) NOT NULL,
	`imageUrl` text NOT NULL,
	`shareUrl` varchar(512) NOT NULL,
	`trackId` int NOT NULL,
	`htmlSnapshot` text NOT NULL,
	`oembedJson` json NOT NULL,
	`status` enum('preparing','ready') NOT NULL DEFAULT 'preparing',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shareArtifacts_wid` PRIMARY KEY(`wid`)
);
