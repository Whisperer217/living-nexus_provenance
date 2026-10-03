CREATE TABLE `commentMentions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commentId` int NOT NULL,
	`mentionedUserId` int NOT NULL,
	`mentionedHandleSnapshot` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commentMentions_id` PRIMARY KEY(`id`),
	CONSTRAINT `commentMentions_comment_mentioned_user_uq` UNIQUE(`commentId`,`mentionedUserId`)
);
--> statement-breakpoint
CREATE TABLE `correspondenceBlocks` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`blockerUserId` int NOT NULL,
	`blockedUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `correspondenceBlocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `correspondenceBlocks_pair_uq` UNIQUE(`blockerUserId`,`blockedUserId`)
);
--> statement-breakpoint
CREATE TABLE `correspondenceMessages` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`threadId` bigint NOT NULL,
	`senderId` int NOT NULL,
	`body` text NOT NULL,
	`workContextId` int,
	`clientMessageId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`editedAt` timestamp,
	`deletedAt` timestamp,
	CONSTRAINT `correspondenceMessages_id` PRIMARY KEY(`id`),
	CONSTRAINT `correspondenceMessages_thread_sender_client_uq` UNIQUE(`threadId`,`senderId`,`clientMessageId`)
);
--> statement-breakpoint
CREATE TABLE `correspondenceParticipants` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`threadId` bigint NOT NULL,
	`userId` int NOT NULL,
	`role` enum('initiator','recipient') NOT NULL,
	`state` enum('requested','accepted','declined','left','blocked') NOT NULL DEFAULT 'requested',
	`lastReadMessageId` bigint,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	CONSTRAINT `correspondenceParticipants_id` PRIMARY KEY(`id`),
	CONSTRAINT `correspondenceParticipants_thread_user_uq` UNIQUE(`threadId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `correspondenceReports` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`threadId` bigint NOT NULL,
	`messageId` bigint,
	`reporterId` int NOT NULL,
	`reason` enum('spam','harassment','hate_speech','threat','other') NOT NULL,
	`notes` varchar(500),
	`status` enum('pending','dismissed','actioned') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `correspondenceReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `correspondenceThreads` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`kind` enum('direct') NOT NULL DEFAULT 'direct',
	`directKey` varchar(64) NOT NULL,
	`initiatedByUserId` int NOT NULL,
	`workContextId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	CONSTRAINT `correspondenceThreads_id` PRIMARY KEY(`id`),
	CONSTRAINT `correspondenceThreads_directKey_uq` UNIQUE(`directKey`)
);
--> statement-breakpoint
CREATE TABLE `creatorContactSettings` (
	`userId` int NOT NULL,
	`incomingPolicy` enum('none','mutual_witnesses','witnesses') NOT NULL DEFAULT 'witnesses',
	`allowWorkContext` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creatorContactSettings_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('witness','comment','like','tip','reaction','playlist_invite','new_track','system','project_update','project_donation','project_follow','signal_mention','correspondence') NOT NULL;--> statement-breakpoint
CREATE INDEX `commentMentions_commentId_idx` ON `commentMentions` (`commentId`);--> statement-breakpoint
CREATE INDEX `commentMentions_mentionedUserId_idx` ON `commentMentions` (`mentionedUserId`);--> statement-breakpoint
CREATE INDEX `correspondenceBlocks_blocked_user_idx` ON `correspondenceBlocks` (`blockedUserId`);--> statement-breakpoint
CREATE INDEX `correspondenceMessages_thread_created_idx` ON `correspondenceMessages` (`threadId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `correspondenceMessages_sender_created_idx` ON `correspondenceMessages` (`senderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `correspondenceParticipants_user_state_idx` ON `correspondenceParticipants` (`userId`,`state`);--> statement-breakpoint
CREATE INDEX `correspondenceReports_thread_status_idx` ON `correspondenceReports` (`threadId`,`status`);--> statement-breakpoint
CREATE INDEX `correspondenceReports_reporter_created_idx` ON `correspondenceReports` (`reporterId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `correspondenceThreads_initiator_updated_idx` ON `correspondenceThreads` (`initiatedByUserId`,`updatedAt`);