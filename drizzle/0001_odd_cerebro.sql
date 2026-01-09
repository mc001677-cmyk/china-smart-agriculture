CREATE TABLE `fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`cropType` varchar(64) NOT NULL,
	`area` decimal(10,2) NOT NULL,
	`boundaryGeoJson` text,
	`centerLat` decimal(10,6),
	`centerLng` decimal(10,6),
	`status` enum('idle','working','completed') NOT NULL DEFAULT 'idle',
	`harvestProgress` decimal(5,2) DEFAULT '0',
	`avgYield` decimal(8,2),
	`avgMoisture` decimal(5,2),
	`ownerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(256) NOT NULL,
	`originalName` varchar(256) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`size` bigint NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`url` text NOT NULL,
	`category` enum('field_image','drone_image','document','report','other') NOT NULL DEFAULT 'other',
	`relatedFieldId` int,
	`relatedMachineId` int,
	`uploaderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`type` enum('harvester','tractor','seeder','sprayer') NOT NULL,
	`model` varchar(128),
	`licensePlate` varchar(32),
	`status` enum('online','offline','maintenance') NOT NULL DEFAULT 'offline',
	`currentLat` decimal(10,6),
	`currentLng` decimal(10,6),
	`currentSpeed` decimal(5,2),
	`fuelLevel` decimal(5,2),
	`engineHours` decimal(10,2),
	`ownerId` int,
	`assignedFieldId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`fieldId` int NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`workArea` decimal(10,2),
	`totalYield` decimal(12,2),
	`avgYield` decimal(8,2),
	`avgMoisture` decimal(5,2),
	`fuelConsumed` decimal(8,2),
	`pathGeoJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `fields` ADD CONSTRAINT `fields_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_relatedFieldId_fields_id_fk` FOREIGN KEY (`relatedFieldId`) REFERENCES `fields`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_relatedMachineId_machines_id_fk` FOREIGN KEY (`relatedMachineId`) REFERENCES `machines`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_uploaderId_users_id_fk` FOREIGN KEY (`uploaderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machines` ADD CONSTRAINT `machines_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machines` ADD CONSTRAINT `machines_assignedFieldId_fields_id_fk` FOREIGN KEY (`assignedFieldId`) REFERENCES `fields`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workLogs` ADD CONSTRAINT `workLogs_machineId_machines_id_fk` FOREIGN KEY (`machineId`) REFERENCES `machines`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workLogs` ADD CONSTRAINT `workLogs_fieldId_fields_id_fk` FOREIGN KEY (`fieldId`) REFERENCES `fields`(`id`) ON DELETE no action ON UPDATE no action;