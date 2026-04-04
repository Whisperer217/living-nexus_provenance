CREATE TABLE `featureAttributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`featureName` varchar(256) NOT NULL,
	`attributedTo` varchar(256) NOT NULL,
	`userId` int,
	`description` text NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `featureAttributions_id` PRIMARY KEY(`id`)
);
