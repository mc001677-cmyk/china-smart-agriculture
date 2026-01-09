import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// Mock storage module at the top level
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "test-key",
    url: "https://storage.example.com/test-key",
  }),
}));

// Mock database module with inline implementation
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue({ insertId: 1 }),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }),
}));

// Import after mocks
import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("Fields CRUD operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fields.create", () => {
    it("creates a new field with required data", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.fields.create({
        name: "测试地块",
        cropType: "大豆",
        area: 100,
        centerLat: 47.25,
        centerLng: 132.55,
      });

      expect(result.success).toBe(true);
    });

    it("validates required fields", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Should throw validation error for empty name
      await expect(
        caller.fields.create({
          name: "",
          cropType: "大豆",
          area: 100,
        })
      ).rejects.toThrow();
    });
  });

  describe("fields.update", () => {
    it("updates field with partial data", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.fields.update({
        id: 1,
        name: "更新后的地块名称",
        status: "working",
        harvestProgress: 50,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("fields.delete", () => {
    it("deletes a field by id", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.fields.delete({ id: 1 });

      expect(result.success).toBe(true);
    });
  });
});

describe("Machines CRUD operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("machines.create", () => {
    it("creates a new machine with required data", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.machines.create({
        name: "测试收割机",
        type: "harvester",
        model: "John Deere S780",
        licensePlate: "JDS780-TEST-001",
      });

      expect(result.success).toBe(true);
    });

    it("accepts different machine types", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const types = ["harvester", "tractor", "seeder", "sprayer"] as const;
      
      for (const type of types) {
        const result = await caller.machines.create({
          name: `测试${type}`,
          type,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("machines.updateStatus", () => {
    it("updates machine status", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.machines.updateStatus({
        id: 1,
        status: "online",
        currentLat: 47.252,
        currentLng: 132.552,
        currentSpeed: 5.5,
        fuelLevel: 75,
      });

      expect(result.success).toBe(true);
    });

    it("can set machine to offline", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.machines.updateStatus({
        id: 1,
        status: "offline",
      });

      expect(result.success).toBe(true);
    });
  });
});

describe("WorkLogs CRUD operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("workLogs.create", () => {
    it("creates a new work log entry", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.create({
        machineId: 1,
        fieldId: 1,
        startTime: new Date(),
        workArea: 50,
        totalYield: 42500,
        avgYield: 850,
        avgMoisture: 14.5,
        fuelConsumed: 120,
      });

      expect(result.success).toBe(true);
    });
  });
});

describe("API router structure verification", () => {
  it("has all required field procedures", () => {
    expect(appRouter.fields.list).toBeDefined();
    expect(appRouter.fields.get).toBeDefined();
    expect(appRouter.fields.create).toBeDefined();
    expect(appRouter.fields.update).toBeDefined();
    expect(appRouter.fields.delete).toBeDefined();
  });

  it("has all required machine procedures", () => {
    expect(appRouter.machines.list).toBeDefined();
    expect(appRouter.machines.get).toBeDefined();
    expect(appRouter.machines.create).toBeDefined();
    expect(appRouter.machines.updateStatus).toBeDefined();
  });

  it("has all required workLogs procedures", () => {
    expect(appRouter.workLogs.list).toBeDefined();
    expect(appRouter.workLogs.create).toBeDefined();
  });

  it("has all required files procedures", () => {
    expect(appRouter.files.list).toBeDefined();
    expect(appRouter.files.upload).toBeDefined();
    expect(appRouter.files.delete).toBeDefined();
  });
});
