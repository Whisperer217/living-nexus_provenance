ALTER TABLE `songReactions` MODIFY COLUMN `type` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `songReactions` MODIFY COLUMN `createdAt` bigint NOT NULL;