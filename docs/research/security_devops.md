# 网站安全配置与DevOps实践研究笔记

## 1. Express.js安全最佳实践

### 1.1 使用Helmet设置安全头

**安装**：
```bash
npm install helmet
```

**使用**：
```javascript
const helmet = require('helmet')
app.use(helmet())
```

**Helmet默认设置的安全头**：

| 安全头 | 作用 |
|--------|------|
| Content-Security-Policy | 白名单控制页面可执行的内容 |
| Cross-Origin-Opener-Policy | 进程隔离 |
| Cross-Origin-Resource-Policy | 阻止跨域加载资源 |
| Origin-Agent-Cluster | 基于源的进程隔离 |
| Referrer-Policy | 控制Referer头 |
| Strict-Transport-Security | 强制HTTPS |
| X-Content-Type-Options | 防止MIME嗅探 |
| X-DNS-Prefetch-Control | 控制DNS预取 |
| X-Frame-Options | 防止点击劫持 |
| X-XSS-Protection | 禁用（现代浏览器不需要）|

### 1.2 使用TLS/HTTPS

```javascript
const https = require('https')
const fs = require('fs')

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
}

https.createServer(options, app).listen(443)
```

**推荐**：使用 Let's Encrypt 免费SSL证书

### 1.3 输入验证

```javascript
const { body, validationResult } = require('express-validator')

app.post('/api/equipment',
  body('name').isString().trim().escape(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    // 处理请求
  }
)
```

### 1.4 防止SQL注入

```javascript
// 使用参数化查询
const query = 'SELECT * FROM equipment WHERE id = ?'
db.query(query, [req.params.id], (err, results) => {
  // 处理结果
})

// 使用ORM（如Drizzle）
const equipment = await db.select()
  .from(equipmentTable)
  .where(eq(equipmentTable.id, req.params.id))
```

### 1.5 Cookie安全配置

```javascript
app.use(session({
  name: 'sessionId', // 不使用默认名称
  secret: process.env.SESSION_SECRET,
  cookie: {
    secure: true,      // 仅HTTPS
    httpOnly: true,    // 防止XSS
    sameSite: 'strict', // 防止CSRF
    maxAge: 3600000    // 1小时
  }
}))
```

### 1.6 防止暴力破解

```javascript
const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  message: '登录尝试次数过多，请15分钟后再试'
})

app.post('/api/login', loginLimiter, loginHandler)
```

### 1.7 依赖安全检查

```bash
# 使用npm audit
npm audit

# 使用Snyk
npm install -g snyk
snyk test
```

## 2. OWASP Top 10 防护

### 2.1 注入攻击防护
- 使用参数化查询
- 使用ORM
- 输入验证和转义

### 2.2 身份认证失效防护
- 使用强密码策略
- 实现账户锁定
- 使用多因素认证

### 2.3 敏感数据泄露防护
- 使用HTTPS
- 加密存储敏感数据
- 不在日志中记录敏感信息

### 2.4 XSS攻击防护
- 输出编码
- 使用CSP头
- 验证和清理输入

### 2.5 CSRF攻击防护
```javascript
const csrf = require('csurf')
app.use(csrf({ cookie: true }))

// 在表单中添加token
app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() })
})
```

## 3. CI/CD流水线配置

### 3.1 GitHub Actions配置

```yaml
# .github/workflows/deploy.yml
name: Deploy Smart Agriculture

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test
      
      - name: Run security audit
        run: pnpm audit

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: dist
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/smart-agriculture
            git pull origin main
            pnpm install --production
            pnpm build
            pm2 restart all
```

### 3.2 Docker部署

**Dockerfile**：
```dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build

# 生产阶段
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**docker-compose.yml**：
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: mysql:8.0
    volumes:
      - mysql_data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=smart_agriculture
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
```

### 3.3 自动化测试

```javascript
// tests/api.test.js
const request = require('supertest')
const app = require('../src/app')

describe('Equipment API', () => {
  test('GET /api/equipment should return equipment list', async () => {
    const response = await request(app)
      .get('/api/equipment')
      .expect('Content-Type', /json/)
      .expect(200)
    
    expect(Array.isArray(response.body)).toBe(true)
  })

  test('POST /api/equipment should validate input', async () => {
    const response = await request(app)
      .post('/api/equipment')
      .send({ name: '' })
      .expect(400)
    
    expect(response.body.errors).toBeDefined()
  })
})
```

## 4. 监控与告警

### 4.1 健康检查端点

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
})

app.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1')
    res.json({ status: 'ready' })
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message })
  }
})
```

### 4.2 Prometheus指标

```javascript
const promClient = require('prom-client')

// 收集默认指标
promClient.collectDefaultMetrics()

// 自定义指标
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
})

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration
    )
  })
  next()
})

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType)
  res.end(await promClient.register.metrics())
})
```

## 5. 应用于智慧农业系统

### 5.1 安全配置清单

```javascript
// security.js
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const cors = require('cors')

module.exports = (app) => {
  // Helmet安全头
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"]
      }
    }
  }))

  // CORS配置
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }))

  // 速率限制
  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  }))

  // 禁用X-Powered-By
  app.disable('x-powered-by')
}
```

### 5.2 环境变量管理

```bash
# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:pass@localhost:3306/smart_agriculture
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-super-secret-key
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=https://yourdomain.com
```

### 5.3 部署脚本

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment..."

# 拉取最新代码
git pull origin main

# 安装依赖
pnpm install --production

# 构建前端
pnpm build

# 运行数据库迁移
pnpm db:migrate

# 重启服务
pm2 reload ecosystem.config.js --env production

# 健康检查
sleep 5
curl -f http://localhost:3000/health || exit 1

echo "✅ Deployment completed successfully!"
```

---
*研究日期：2026年1月2日*
*来源：Express.js官方文档, OWASP, GitHub Actions文档*
