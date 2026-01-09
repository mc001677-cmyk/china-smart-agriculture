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
    orderBy: vi.fn().mockReturnThis(),
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

describe("WorkLogs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("workLogs.list", () => {
    it("returns empty array when no logs exist", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.list({});

      expect(Array.isArray(result)).toBe(true);
    });

    it("accepts machineId filter", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.list({ machineId: 1 });

      expect(Array.isArray(result)).toBe(true);
    });

    it("accepts fieldId filter", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.list({ fieldId: 1 });

      expect(Array.isArray(result)).toBe(true);
    });

    it("accepts limit parameter", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.list({ limit: 10 });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("workLogs.create", () => {
    it("creates a work log with required fields", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.create({
        machineId: 1,
        fieldId: 1,
        startTime: new Date(),
      });

      expect(result.success).toBe(true);
    });

    it("creates a work log with all optional fields", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.create({
        machineId: 1,
        fieldId: 1,
        startTime: new Date("2025-12-31T08:00:00"),
        endTime: new Date("2025-12-31T12:00:00"),
        workArea: 50,
        fuelConsumed: 120,
        totalYield: 42500,
        avgYield: 850,
        avgMoisture: 14.5,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("workLogs.getStats", () => {
    it("returns stats object with correct structure", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.getStats({});

      expect(result).toHaveProperty("totalLogs");
      expect(result).toHaveProperty("totalWorkArea");
      expect(result).toHaveProperty("totalFuelConsumed");
      expect(result).toHaveProperty("totalWorkHours");
    });

    it("accepts machineId filter for stats", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.getStats({ machineId: 1 });

      expect(result).toHaveProperty("totalLogs");
    });

    it("accepts fieldId filter for stats", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.getStats({ fieldId: 1 });

      expect(result).toHaveProperty("totalLogs");
    });
  });

  describe("workLogs.update", () => {
    it("updates work log with partial data", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.update({
        id: 1,
        workArea: 60,
        fuelConsumed: 150,
      });

      expect(result.success).toBe(true);
    });

    it("updates work log end time", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.update({
        id: 1,
        endTime: new Date("2025-12-31T16:00:00"),
      });

      expect(result.success).toBe(true);
    });
  });

  describe("workLogs.delete", () => {
    it("deletes a work log by id", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workLogs.delete({ id: 1 });

      expect(result.success).toBe(true);
    });
  });
});

describe("WorkLogs API router structure", () => {
  it("has all required procedures", () => {
    expect(appRouter.workLogs.list).toBeDefined();
    expect(appRouter.workLogs.get).toBeDefined();
    expect(appRouter.workLogs.getStats).toBeDefined();
    expect(appRouter.workLogs.create).toBeDefined();
    expect(appRouter.workLogs.update).toBeDefined();
    expect(appRouter.workLogs.delete).toBeDefined();
  });
});
