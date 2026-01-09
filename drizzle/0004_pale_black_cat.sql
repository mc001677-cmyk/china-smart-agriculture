CREATE TABLE `machineApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicantUserId` int NOT NULL,
	`brand` varchar(64) NOT NULL,
	`model` varchar(128) NOT NULL,
	`type` enum('harvester','tractor','seeder','sprayer') NOT NULL,
	`licensePlate` varchar(32),
	`deviceId` varchar(128) NOT NULL,
	`deviceSecret` varchar(128),
	`description` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`reviewerUserId` int,
	`reviewNote` text,
	CONSTRAINT `machineApplications_id` PRIMARY KEY(`id`),
	CONSTRAINT `machineApplications_deviceId_unique` UNIQUE(`deviceId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `realName` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `organization` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `identityIntro` text;--> statement-breakpoint
ALTER TABLE `users` ADD `verificationStatus` enum('unsubmitted','pending','approved','rejected') DEFAULT 'unsubmitted' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `verificationSubmittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `verificationReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `verificationNote` text;--> statement-breakpoint
ALTER TABLE `machineApplications` ADD CONSTRAINT `machineApplications_applicantUserId_users_id_fk` FOREIGN KEY (`applicantUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machineApplications` ADD CONSTRAINT `machineApplications_reviewerUserId_users_id_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;