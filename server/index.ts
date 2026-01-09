import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import compression from "compression";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // 安全配置 - Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "wss:", "https:", "http://localhost:*"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
      }
    },
    crossOriginEmbedderPolicy: false, // 允许加载外部资源
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // 性能优化 - Gzip压缩
  app.use(compression({
    level: 6, // 压缩级别 1-9
    threshold: 1024, // 只压缩大于1KB的响应
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
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // 就绪检查端点
  app.get('/ready', (_req, res) => {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // 静态文件缓存策略
  app.use(express.static(staticPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // 对于JS和CSS文件设置长期缓存
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // 对于HTML文件不缓存
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

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
