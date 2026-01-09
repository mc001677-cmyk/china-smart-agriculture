import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import compression from "compression";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerLocalAuthRoutes } from "./localAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerTelemetryRoutes } from "./telemetry";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // 安全配置 - Helmet (禁用CSP以允许高德地图加载)
  app.use(helmet({
    contentSecurityPolicy: false,  // 禁用CSP以解决高德地图API加载问题
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // 性能优化 - Gzip压缩
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // 禁用X-Powered-By头
  app.disable('x-powered-by');

  // 健康检查端点
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    });
  });

  // 就绪检查端点
  app.get('/ready', (_req, res) => {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      // 用于遥测签名：计算 body_raw 的 SHA256
      (req as any).rawBody = Buffer.from(buf);
    },
  }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Local auth (传统注册/登录)
  registerLocalAuthRoutes(app);

  // Telemetry HTTP API (D + A)
  registerTelemetryRoutes(app);
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🌾 友谊农场智慧农业平台 - 服务器已启动                    ║
║                                                            ║
║   地址: http://localhost:${port}/                           ║
║   环境: ${process.env.NODE_ENV || 'development'}                              ║
║   时间: ${new Date().toLocaleString('zh-CN')}                    ║
║                                                            ║
║   安全配置: ✅ Helmet已启用                                 ║
║   性能优化: ✅ Gzip压缩已启用                               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });

  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在优雅关闭服务器...');
    server.close(() => {
      console.log('服务器已关闭');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在优雅关闭服务器...');
    server.close(() => {
      console.log('服务器已关闭');
      process.exit(0);
    });
  });
}

startServer().catch(console.error);
