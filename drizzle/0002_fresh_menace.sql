CREATE TABLE `maintenanceLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`maintenanceType` enum('routine','repair','inspection','parts_replace') NOT NULL,
	`maintenanceDate` timestamp NOT NULL,
	`engineHoursAtMaintenance` decimal(10,2),
	`description` text,
	`partsReplaced` text,
	`laborCost` decimal(10,2),
	`partsCost` decimal(10,2),
	`totalCost` decimal(10,2),
	`technician` varchar(64),
	`notes` text,
	`nextMaintenanceHours` decimal(10,2),
	`nextMaintenanceDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenanceLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenancePlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`planType` enum('oil_change','filter_replace','belt_check','brake_service','hydraulic_service','engine_overhaul','general_service') NOT NULL,
	`intervalHours` decimal(10,2) NOT NULL,
	`lastServiceHours` decimal(10,2),
	`lastServiceDate` timestamp,
	`nextServiceHours` decimal(10,2),
	`predictedNextDate` timestamp,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('pending','due','overdue','completed') NOT NULL DEFAULT 'pending',
	`estimatedCost` decimal(10,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenancePlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `maintenanceLogs` ADD CONSTRAINT `maintenanceLogs_machineId_machines_id_fk` FOREIGN KEY (`machineId`) REFERENCES `machines`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenancePlans` ADD CONSTRAINT `maintenancePlans_machineId_machines_id_fk` FOREIGN KEY (`machineId`) REFERENCES `machines`(`id`) ON DELETE no action ON UPDATE no action;