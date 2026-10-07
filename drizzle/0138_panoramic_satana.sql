ALTER TABLE `songs` MODIFY COLUMN `participationMusic` enum('Human','AI','Both','None') DEFAULT 'Human';--> statement-breakpoint
ALTER TABLE `songs` MODIFY COLUMN `participationLyrics` enum('Human','AI','Both','None') DEFAULT 'Human';--> statement-breakpoint
ALTER TABLE `songs` MODIFY COLUMN `participationVoice` enum('Human','AI','Both','None') DEFAULT 'Human';