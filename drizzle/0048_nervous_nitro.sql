CREATE TABLE `projectDonations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`donorUserId` int,
	`donorName` varchar(128),
	`donorEmail` varchar(256),
	`amountCents` int NOT NULL,
	`message` text,
	`anonymous` boolean NOT NULL DEFAULT false,
	`stripeSessionId` varchar(256),
	`stripePaymentIntentId` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectDonations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectUpdates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256),
	`body` text NOT NULL,
	`imageUrl` text,
	`imageKey` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectUpdates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slug` varchar(128) NOT NULL,
	`title` varchar(256) NOT NULL,
	`tagline` varchar(512),
	`description` text,
	`bannerUrl` text,
	`bannerKey` varchar(512),
	`videoUrl` text,
	`videoType` enum('youtube','vimeo','s3','none') DEFAULT 'none',
	`goalAmountCents` int,
	`raisedAmountCents` int NOT NULL DEFAULT 0,
	`donorCount` int NOT NULL DEFAULT 0,
	`status` enum('draft','active','completed','archived') NOT NULL DEFAULT 'draft',
	`linkedWitnessId` varchar(64),
	`linkedSongId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
