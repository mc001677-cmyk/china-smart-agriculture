CREATE TABLE `loginLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`loginMethod` varchar(32) NOT NULL,
	`status` enum('success','failed') NOT NULL,
	`ip` varchar(64),
	`userAgent` text,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loginLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smsLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`scene` varchar(32) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`status` enum('success','failed') NOT NULL,
	`errorMessage` text,
	`requestId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `smsLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`description` varchar(256),
	`category` varchar(64),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `systemSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemSettings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `verificationCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`scene` varchar(32) NOT NULL,
	`codeHash` varchar(256) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`isUsed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verificationCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `verificationCodes_phone_scene_idx` UNIQUE(`phone`,`scene`,`createdAt`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `wechatOpenid` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `wechatUnionid` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `phoneVerified` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isAdmin` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `adminRole` enum('super_admin','operation','support');--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','frozen','deleted') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `frozenAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `frozenReason` text;--> statement-breakpoint
ALTER TABLE `workOrders` ADD `contactName` varchar(64);--> statement-breakpoint
ALTER TABLE `workOrders` ADD `contactPhone` varchar(32);--> statement-breakpoint
ALTER TABLE `workOrders` ADD `contactWechat` varchar(64);--> statement-breakpoint
ALTER TABLE `workOrders` ADD `contactAddress` text;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_wechatOpenid_unique` UNIQUE(`wechatOpenid`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_wechatUnionid_unique` UNIQUE(`wechatUnionid`);--> statement-breakpoint
ALTER TABLE `loginLogs` ADD CONSTRAINT `loginLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `systemSettings` ADD CONSTRAINT `systemSettings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;