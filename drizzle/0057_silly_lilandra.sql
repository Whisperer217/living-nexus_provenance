ALTER TABLE `projectBlocks` ADD `imageSize` enum('small','medium','large','full') DEFAULT 'full';--> statement-breakpoint
ALTER TABLE `projectBlocks` ADD `imageFocalX` int DEFAULT 50;--> statement-breakpoint
ALTER TABLE `projectBlocks` ADD `imageFocalY` int DEFAULT 50;