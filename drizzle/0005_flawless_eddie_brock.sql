CREATE TABLE `machineListings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerUserId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`brand` varchar(64) NOT NULL,
	`model` varchar(128) NOT NULL,
	`price` decimal(12,2),
	`location` varchar(128),
	`contactPhone` varchar(32),
	`description` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`reviewedAt` timestamp,
	`reviewerUserId` int,
	`reviewNote` text,
	CONSTRAINT `machineListings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `machineListings` ADD CONSTRAINT `machineListings_sellerUserId_users_id_fk` FOREIGN KEY (`sellerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machineListings` ADD CONSTRAINT `machineListings_reviewerUserId_users_id_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;