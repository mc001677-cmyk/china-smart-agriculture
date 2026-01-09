CREATE TABLE `machineTelemetry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(128) NOT NULL,
	`machineId` int,
	`seq` int NOT NULL,
	`sentAt` bigint NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`lat` decimal(10,6),
	`lng` decimal(10,6),
	`speedKph` decimal(6,2),
	`headingDeg` decimal(6,2),
	`status` varchar(32),
	`fuelPct` decimal(5,2),
	`defPct` decimal(5,2),
	`rpm` decimal(8,2),
	`loadPct` decimal(5,2),
	`payloadJson` text NOT NULL,
	CONSTRAINT `machineTelemetry_id` PRIMARY KEY(`id`),
	CONSTRAINT `machineTelemetry_device_seq_unique` UNIQUE(`deviceId`,`seq`)
);
--> statement-breakpoint
ALTER TABLE `machines` ADD `brand` varchar(64);--> statement-breakpoint
ALTER TABLE `machines` ADD `deviceId` varchar(128);--> statement-breakpoint
ALTER TABLE `machines` ADD `deviceSecret` varchar(128);--> statement-breakpoint
ALTER TABLE `machines` ADD `firmwareVersion` varchar(64);--> statement-breakpoint
ALTER TABLE `machines` ADD `lastSeenAt` timestamp;--> statement-breakpoint
ALTER TABLE `machines` ADD CONSTRAINT `machines_deviceId_unique` UNIQUE(`deviceId`);--> statement-breakpoint
ALTER TABLE `machineTelemetry` ADD CONSTRAINT `machineTelemetry_machineId_machines_id_fk` FOREIGN KEY (`machineId`) REFERENCES `machines`(`id`) ON DELETE no action ON UPDATE no action;