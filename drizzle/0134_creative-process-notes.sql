-- Preserve optional creator-authored process notes independently of AI disclosure.
ALTER TABLE `songs` ADD `creativeProcessNotes` text;
