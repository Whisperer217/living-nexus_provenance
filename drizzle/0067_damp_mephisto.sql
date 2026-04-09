CREATE TABLE `selfImprovementFindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`severity` enum('critical','high','medium','low','info') NOT NULL,
	`category` enum('security','performance','correctness','maintainability','accessibility','dead_code','type_safety','error_handling') NOT NULL,
	`filePath` varchar(512) NOT NULL,
	`lineStart` int,
	`lineEnd` int,
	`title` varchar(256) NOT NULL,
	`description` text NOT NULL,
	`fixStatus` enum('pending','applied','failed','skipped','reverted') NOT NULL DEFAULT 'pending',
	`fixDiff` text,
	`fixError` text,
	`originalContent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`fixedAt` timestamp,
	CONSTRAINT `selfImprovementFindings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `selfImprovementRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggeredBy` enum('schedule','manual') NOT NULL DEFAULT 'schedule',
	`triggeredByUserId` int,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`filesScanned` int NOT NULL DEFAULT 0,
	`findingsCount` int NOT NULL DEFAULT 0,
	`fixesApplied` int NOT NULL DEFAULT 0,
	`fixesFailed` int NOT NULL DEFAULT 0,
	`testsPassedBefore` int NOT NULL DEFAULT 0,
	`testsPassedAfter` int NOT NULL DEFAULT 0,
	`analysisSummary` text,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `selfImprovementRuns_id` PRIMARY KEY(`id`)
);
