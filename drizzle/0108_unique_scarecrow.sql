CREATE TABLE `onboardingProgress` (
`id` int AUTO_INCREMENT NOT NULL,
`userId` int NOT NULL,
`currentStep` varchar(32) NOT NULL DEFAULT 'covenant',
`completedSteps` text,
`covenantAcceptedAt` timestamp,
`domainSavedAt` timestamp,
`presenceSavedAt` timestamp,
`testimonyWid` varchar(64),
`licensePurchasedAt` timestamp,
`firstWorkWid` varchar(64),
`completedAt` timestamp,
`startedAt` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `onboardingProgress_id` PRIMARY KEY(`id`),
CONSTRAINT `onboardingProgress_userId_unique` UNIQUE(`userId`)
);
