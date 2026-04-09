CREATE INDEX `events_workId_idx` ON `events` (`workId`);--> statement-breakpoint
CREATE INDEX `events_actorId_idx` ON `events` (`actorId`);--> statement-breakpoint
CREATE INDEX `events_type_idx` ON `events` (`type`);--> statement-breakpoint
CREATE INDEX `jukeboxQueue_roomCode_idx` ON `jukeboxQueue` (`roomCode`);--> statement-breakpoint
CREATE INDEX `likes_songId_idx` ON `likes` (`songId`);--> statement-breakpoint
CREATE INDEX `likes_userId_idx` ON `likes` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_userId_isRead_idx` ON `notifications` (`userId`,`isRead`);--> statement-breakpoint
CREATE INDEX `playlistItems_userId_idx` ON `playlistItems` (`userId`);--> statement-breakpoint
CREATE INDEX `songs_userId_idx` ON `songs` (`userId`);--> statement-breakpoint
CREATE INDEX `songs_status_idx` ON `songs` (`status`);--> statement-breakpoint
CREATE INDEX `songs_contentType_idx` ON `songs` (`contentType`);--> statement-breakpoint
CREATE INDEX `songs_witnessId_idx` ON `songs` (`witnessId`);