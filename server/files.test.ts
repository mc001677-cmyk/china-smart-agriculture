import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// Mock the storage module - must be at top level with inline factory
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "uploads/1/other/test123.png",
    url: "https://storage.example.com/uploads/1/other/test123.png",
  }),
}));

// Mock the database module with inline factory
vi.mock("./db", () => {
  const mockDb = {
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
  };
  
  return {
    getDb: vi.fn().mockResolvedValue(mockDb),
  };
});

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

describe("files router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("files.upload", () => {
    it("uploads a file and returns success with url", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Base64 encoded "test" string
      const base64Data = Buffer.from("test file content").toString("base64");

      const result = await caller.files.upload({
        filename: "test.png",
        mimeType: "image/png",
        base64Data,
        category: "field_image",
      });

      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      expect(result.fileKey).toBeDefined();
    });

    it("generates unique file key with user id and category", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const base64Data = Buffer.from("test").toString("base64");

      const result = await caller.files.upload({
        filename: "drone_photo.jpg",
        mimeType: "image/jpeg",
        base64Data,
        category: "drone_image",
      });

      expect(result.success).toBe(true);
      expect(result.fileKey).toContain("uploads/1/drone_image/");
    });
  });
});

describe("API router structure", () => {
  it("has fields router with expected procedures", () => {
    expect(appRouter.fields).toBeDefined();
    expect(appRouter.fields.list).toBeDefined();
    expect(appRouter.fields.get).toBeDefined();
    expect(appRouter.fields.create).toBeDefined();
    expect(appRouter.fields.update).toBeDefined();
    expect(appRouter.fields.delete).toBeDefined();
  });

  it("has machines router with expected procedures", () => {
    expect(appRouter.machines).toBeDefined();
    expect(appRouter.machines.list).toBeDefined();
    expect(appRouter.machines.get).toBeDefined();
    expect(appRouter.machines.create).toBeDefined();
    expect(appRouter.machines.updateStatus).toBeDefined();
  });

  it("has files router with expected procedures", () => {
    expect(appRouter.files).toBeDefined();
    expect(appRouter.files.list).toBeDefined();
    expect(appRouter.files.upload).toBeDefined();
    expect(appRouter.files.delete).toBeDefined();
  });

  it("has workLogs router with expected procedures", () => {
    expect(appRouter.workLogs).toBeDefined();
    expect(appRouter.workLogs.list).toBeDefined();
    expect(appRouter.workLogs.create).toBeDefined();
  });
});
