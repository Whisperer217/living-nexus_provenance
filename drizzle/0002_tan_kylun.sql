ALTER TABLE `agents` MODIFY COLUMN `styleFingerprint` json;--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `frozenTraits` json;--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `origin` json;