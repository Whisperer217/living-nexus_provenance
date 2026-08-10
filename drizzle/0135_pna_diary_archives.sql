-- PNA provenance diary: extend keeper_chat_archives for thread seal + music binding
ALTER TABLE `keeper_chat_archives`
  ADD COLUMN `personaId` varchar(64),
  ADD COLUMN `songId` int,
  ADD COLUMN `songWid` varchar(128),
  ADD COLUMN `songTitle` varchar(256),
  ADD COLUMN `messageCount` int NOT NULL DEFAULT 0,
  ADD COLUMN `contentHash` varchar(64),
  ADD COLUMN `diaryWid` varchar(128),
  ADD COLUMN `sealedAt` timestamp NULL,
  ADD COLUMN `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE INDEX `keeper_chat_archives_user_id_idx` ON `keeper_chat_archives` (`userId`);
CREATE INDEX `keeper_chat_archives_diary_wid_idx` ON `keeper_chat_archives` (`diaryWid`);
