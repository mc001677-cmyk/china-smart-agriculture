/**
 * Database Seed Script
 * Migrates mock field and machine data to the database
 * Run with: node seed-db.mjs
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const connection = await mysql.createConnection({
  // FIX: 避免 localhost 的 socket/解析差异，统一走 TCP
  host: url.hostname === "localhost" ? "127.0.0.1" : url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  // FIX: Node URL.password 可能保留百分号编码（例如 %21），这里显式解码
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

console.log("Connected to database");

async function ensureDemoOwner() {
  const openId = "demo_owner";
  const [rows] = await connection.execute(
    "SELECT id FROM users WHERE openId = ? LIMIT 1",
    [openId]
  );
  if (Array.isArray(rows) && rows.length > 0) {
    return rows[0].id;
  }

  console.log("Creating demo owner user...");
  const [result] = await connection.execute(
    `INSERT INTO users (openId, name, loginMethod, role, membershipLevel)
     VALUES (?, ?, ?, ?, ?)`,
    [openId, "演示农场主", "seed", "user", "free"]
  );
  const insertedId = result?.insertId;
  if (!insertedId) {
    throw new Error("Failed to create demo owner user");
  }
  return insertedId;
}

// Seed Fields Data
const fieldsData = [
  {
    name: "建三江-01号地块",
    cropType: "大豆",
    area: "450",
    boundaryGeoJson: JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [132.545, 47.255],
        [132.555, 47.255],
        [132.555, 47.245],
        [132.545, 47.245],
        [132.545, 47.255]
      ]]
    }),
    centerLat: "47.25",
    centerLng: "132.55",
    status: "working",
    harvestProgress: "35",
    avgYield: "850",
    avgMoisture: "14.5",
    ownerId: null,
  },
  {
    name: "建三江-02号地块",
    cropType: "玉米",
    area: "320",
    boundaryGeoJson: JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [132.556, 47.255],
        [132.565, 47.255],
        [132.565, 47.245],
        [132.556, 47.245],
        [132.556, 47.255]
      ]]
    }),
    centerLat: "47.25",
    centerLng: "132.56",
    status: "idle",
    harvestProgress: "0",
    avgYield: null,
    avgMoisture: null,
    ownerId: null,
  },
  {
    name: "建三江-03号地块",
    cropType: "水稻",
    area: "580",
    boundaryGeoJson: JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [132.545, 47.244],
        [132.565, 47.244],
        [132.565, 47.235],
        [132.545, 47.235],
        [132.545, 47.244]
      ]]
    }),
    centerLat: "47.24",
    centerLng: "132.555",
    status: "completed",
    harvestProgress: "100",
    avgYield: "920",
    avgMoisture: "15.2",
    ownerId: null,
  },
];

// Seed Machines Data
const machinesData = [
  {
    name: "S780 收割机 (1号)",
    type: "harvester",
    model: "John Deere S780",
    licensePlate: "JDS780-2025-001",
    status: "online",
    currentLat: "47.252",
    currentLng: "132.552",
    currentSpeed: "5.2",
    fuelLevel: "65",
    assignedFieldId: 1,
    ownerId: null,
  },
  {
    name: "S780 收割机 (2号)",
    type: "harvester",
    model: "John Deere S780",
    licensePlate: "JDS780-2025-002",
    status: "online",
    currentLat: "47.258",
    currentLng: "132.558",
    currentSpeed: "4.8",
    fuelLevel: "58",
    assignedFieldId: 1,
    ownerId: null,
  },
  {
    name: "8R 410 拖拉机 (转运1)",
    type: "tractor",
    model: "John Deere 8R 410",
    licensePlate: "JD8R410-2025-001",
    status: "online",
    currentLat: "47.253",
    currentLng: "132.550",
    currentSpeed: "12.5",
    fuelLevel: "75",
    assignedFieldId: 1,
    ownerId: null,
  },
  {
    name: "8R 410 拖拉机 (转运2)",
    type: "tractor",
    model: "John Deere 8R 410",
    licensePlate: "JD8R410-2025-002",
    status: "online",
    currentLat: "47.260",
    currentLng: "132.565",
    currentSpeed: "25.0",
    fuelLevel: "82",
    assignedFieldId: null,
    ownerId: null,
  },
  {
    name: "8R 410 拖拉机 (转运3)",
    type: "tractor",
    model: "John Deere 8R 410",
    licensePlate: "JD8R410-2025-003",
    status: "offline",
    currentLat: "47.250",
    currentLng: "132.545",
    currentSpeed: "0",
    fuelLevel: "90",
    assignedFieldId: null,
    ownerId: null,
  },
];

async function seed() {
  try {
    const ownerId = await ensureDemoOwner();

    // Clear existing data (use correct table names from schema)
    console.log("Clearing existing data...");
    await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
    await connection.execute("DELETE FROM machines");
    await connection.execute("DELETE FROM fields");
    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
    
    // Insert Fields
    console.log("Inserting fields...");
    for (const field of fieldsData) {
      await connection.execute(
        `INSERT INTO fields (name, cropType, area, boundaryGeoJson, centerLat, centerLng, status, harvestProgress, avgYield, avgMoisture, ownerId) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          field.name,
          field.cropType,
          field.area,
          field.boundaryGeoJson,
          field.centerLat,
          field.centerLng,
          field.status,
          field.harvestProgress,
          field.avgYield,
          field.avgMoisture,
          ownerId,
        ]
      );
      console.log(`  ✓ Inserted field: ${field.name}`);
    }
    
    // Get inserted field IDs
    const [fieldRows] = await connection.execute("SELECT id, name FROM fields ORDER BY id");
    const fieldIdMap = {};
    fieldRows.forEach((row, index) => {
      fieldIdMap[index + 1] = row.id;
    });
    
    // Insert Machines
    console.log("Inserting machines...");
    for (const machine of machinesData) {
      const assignedFieldId = machine.assignedFieldId ? fieldIdMap[machine.assignedFieldId] : null;
      await connection.execute(
        `INSERT INTO machines (name, type, model, licensePlate, status, currentLat, currentLng, currentSpeed, fuelLevel, assignedFieldId, ownerId) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          machine.name,
          machine.type,
          machine.model,
          machine.licensePlate,
          machine.status,
          machine.currentLat,
          machine.currentLng,
          machine.currentSpeed,
          machine.fuelLevel,
          assignedFieldId,
          ownerId,
        ]
      );
      console.log(`  ✓ Inserted machine: ${machine.name}`);
    }
    
    // Verify
    const [fieldCount] = await connection.execute("SELECT COUNT(*) as count FROM fields");
    const [machineCount] = await connection.execute("SELECT COUNT(*) as count FROM machines");
    
    console.log("\n=== Seed Complete ===");
    console.log(`Fields: ${fieldCount[0].count}`);
    console.log(`Machines: ${machineCount[0].count}`);
    
  } catch (error) {
    console.error("Seed error:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch(console.error);
