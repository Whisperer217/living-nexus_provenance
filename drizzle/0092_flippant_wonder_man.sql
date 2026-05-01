CREATE TABLE `commentReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commentId` int NOT NULL,
	`reporterId` int NOT NULL,
	`reason` enum('spam','harassment','hate_speech','misinformation','other') NOT NULL DEFAULT 'other',
	`notes` text,
	`status` enum('pending','dismissed','actioned') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commentReports_id` PRIMARY KEY(`id`)
);
