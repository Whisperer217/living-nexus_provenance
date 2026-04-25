CREATE TABLE `projectFollowers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectFollowers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('witness','comment','like','tip','reaction','playlist_invite','new_track','system','project_update','project_donation','project_follow') NOT NULL;