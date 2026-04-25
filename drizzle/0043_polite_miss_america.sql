ALTER TABLE `songs` ADD `aiDisclosure` enum('original','ai_assisted','ai_generated','human_authored_ai_instrument');--> statement-breakpoint
ALTER TABLE `songs` ADD `haaiVisualConcept` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `haaiStyleLanguage` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `haaiInstrumentation` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `haaiVocalConveyance` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `haaiLyricalInspiration` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `haaiEmotionalTone` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `haaiDeclaredAt` timestamp;