ALTER TABLE `users` ADD `expressionId` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `expressionPrompt` text;--> statement-breakpoint
ALTER TABLE `users` ADD `expressionStyleTags` text;--> statement-breakpoint
ALTER TABLE `users` ADD `expressionComposerNote` text;--> statement-breakpoint
ALTER TABLE `users` ADD `expressionGeneratedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_expressionId_unique` UNIQUE(`expressionId`);