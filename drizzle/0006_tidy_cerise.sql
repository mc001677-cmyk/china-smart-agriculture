CREATE TABLE `diamondApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`region` varchar(128),
	`organization` varchar(128),
	`contact` varchar(64),
	`message` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`submittedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`reviewedAt` timestamp,
	`reviewerUserId` int,
	`reviewNote` text,
	CONSTRAINT `diamondApplications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `membershipOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plan` enum('silver','gold','device_bundle','diamond') NOT NULL,
	`deviceCount` int NOT NULL DEFAULT 0,
	`price` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','cancelled','failed') NOT NULL DEFAULT 'pending',
	`paymentChannel` varchar(64),
	`outTradeNo` varchar(128),
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`note` text,
	CONSTRAINT `membershipOrders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publisherUserId` int NOT NULL,
	`workType` varchar(64) NOT NULL,
	`fieldName` varchar(128) NOT NULL,
	`area` decimal(10,2) NOT NULL,
	`cropType` varchar(64) NOT NULL,
	`description` text,
	`startDate` timestamp,
	`endDate` timestamp,
	`preferredTime` varchar(32),
	`priceType` enum('fixed','bidding') NOT NULL,
	`fixedPrice` decimal(10,2),
	`biddingStartPrice` decimal(10,2),
	`status` enum('open','pending','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `workOrders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `membershipLevel` enum('free','silver','gold','diamond') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `membershipExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `membershipSource` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `membershipNote` text;--> statement-breakpoint
ALTER TABLE `users` ADD `devicesOwned` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `diamondApplications` ADD CONSTRAINT `diamondApplications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diamondApplications` ADD CONSTRAINT `diamondApplications_reviewerUserId_users_id_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membershipOrders` ADD CONSTRAINT `membershipOrders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workOrders` ADD CONSTRAINT `workOrders_publisherUserId_users_id_fk` FOREIGN KEY (`publisherUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;