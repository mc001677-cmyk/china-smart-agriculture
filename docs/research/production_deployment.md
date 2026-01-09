# 生产环境部署与性能优化研究笔记

## 1. Express.js生产环境最佳实践

### 1.1 代码层面优化

#### 使用Gzip压缩
```javascript
const compression = require('compression')
const express = require('express')
const app = express()

app.use(compression())
```

**注意**：高流量网站建议在反向代理层（如Nginx）实现压缩。

#### 避免同步函数
- 同步函数会阻塞事件循环
- 使用 `--trace-sync-io` 标志检测同步API调用
- 始终使用异步版本的函数

#### 正确的日志记录
- **调试日志**：使用 `debug` 模块
- **应用日志**：使用 `Pino`（最快的日志库）
- 避免在生产环境使用 `console.log()`

#### 异常处理
```javascript
// 使用try-catch处理同步代码
app.get('/search', (req, res) => {
  setImmediate(() => {
    try {
      const jsonObj = JSON.parse(req.query.params)
      res.send('Success')
    } catch (e) {
      res.status(400).send('Invalid JSON string')
    }
  })
})

// 使用async/await处理异步代码
app.get('/', async (req, res, next) => {
  const data = await userData()
  res.send(data)
})

// 全局错误处理中间件
app.use((err, req, res, next) => {
  res.status(err.status ?? 500).send({ error: err.message })
})
```

### 1.2 环境配置优化

#### 设置NODE_ENV为production
```bash
export NODE_ENV=production
```

**性能提升**：
- 缓存视图模板
- 缓存CSS文件
- 生成更简洁的错误信息
- 性能提升可达**3倍**

#### 确保应用自动重启
使用进程管理器：
- **PM2**：功能丰富的进程管理器
- **systemd**：Linux系统服务管理

**PM2配置示例**：
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'smart-agriculture',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
```

#### 集群模式运行
```javascript
const cluster = require('cluster')
const numCPUs = require('os').cpus().length

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`)
    cluster.fork()
  })
} else {
  require('./app')
}
```

#### 缓存请求结果
- 使用 **Redis** 缓存热点数据
- 使用 **Nginx** 缓存静态资源
- 使用 **Varnish** 作为HTTP缓存

#### 使用负载均衡器
- **Nginx**：轻量级，适合中小规模
- **HAProxy**：高性能，适合大规模

#### 使用反向代理
反向代理优势：
- 处理错误页面
- 压缩响应
- 提供静态文件
- 负载均衡
- SSL终止

## 2. Nginx配置

### 2.1 基本反向代理配置
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 静态文件
    location /static {
        alias /var/www/smart-agriculture/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # React前端
    location / {
        root /var/www/smart-agriculture/dist;
        try_files $uri $uri/ /index.html;
        
        # 缓存控制
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket代理
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 2.2 Gzip压缩配置
```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
gzip_min_length 1000;
```

### 2.3 SSL配置
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

## 3. React生产构建优化

### 3.1 构建命令
```bash
# 生产构建
npm run build

# 分析包大小
npm run build -- --analyze
```

### 3.2 代码分割
```javascript
// 路由级代码分割
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const FleetManagement = lazy(() => import('./pages/FleetManagement'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/fleet" element={<FleetManagement />} />
      </Routes>
    </Suspense>
  )
}
```

### 3.3 图片优化
- 使用WebP格式
- 实现懒加载
- 使用响应式图片

```jsx
<img 
  src="image.webp" 
  loading="lazy"
  srcSet="image-320.webp 320w, image-640.webp 640w"
  sizes="(max-width: 320px) 280px, 640px"
/>
```

### 3.4 缓存策略
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          maps: ['leaflet', 'react-leaflet']
        }
      }
    }
  }
})
```

## 4. 数据库优化

### 4.1 查询优化
- 使用索引
- 避免N+1查询
- 使用连接池

### 4.2 连接池配置
```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'smart_agriculture',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})
```

## 5. 监控与日志

### 5.1 应用监控
- **PM2 Plus**：进程监控
- **Prometheus + Grafana**：指标监控
- **Sentry**：错误追踪

### 5.2 日志配置
```javascript
const pino = require('pino')

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: process.env.NODE_ENV !== 'production'
    }
  }
})
```

## 6. 部署检查清单

### 6.1 部署前
- [ ] 设置 NODE_ENV=production
- [ ] 运行生产构建
- [ ] 检查环境变量
- [ ] 测试数据库连接
- [ ] 检查SSL证书

### 6.2 部署后
- [ ] 验证应用运行正常
- [ ] 检查日志无错误
- [ ] 测试关键功能
- [ ] 监控性能指标
- [ ] 设置告警规则

## 7. 应用于智慧农业系统

### 7.1 推荐部署架构
```
                    ┌─────────────┐
                    │   Nginx     │
                    │ (SSL/Gzip)  │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │   React     │ │   Node.js   │ │  WebSocket  │
    │   静态文件   │ │   API服务   │ │   实时服务   │
    └─────────────┘ └──────┬──────┘ └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Redis     │
                    │   缓存层    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   MySQL/    │
                    │ TimescaleDB │
                    └─────────────┘
```

### 7.2 PM2配置
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'smart-agriculture-api',
    script: 'dist/index.js',
    instances: 4,
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }, {
    name: 'smart-agriculture-ws',
    script: 'dist/websocket.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      WS_PORT: 8080
    }
  }]
}
```

---
*研究日期：2026年1月2日*
*来源：Express.js官方文档, DigitalOcean, 技术博客*
