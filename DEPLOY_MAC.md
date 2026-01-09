# 友谊农场智慧农业平台 - Mac 本地部署指南

## 版本信息
- **版本**: 1.0.0
- **发布日期**: 2026年1月2日
- **推荐配置**: Mac Studio M3 Max / 512GB / 4TB

---

## 环境要求

### 必需软件
1. **Node.js** >= 18.0.0
   ```bash
   # 使用 Homebrew 安装
   brew install node
   
   # 或使用 nvm 管理多版本
   brew install nvm
   nvm install 18
   nvm use 18
   ```

2. **pnpm** (推荐的包管理器)
   ```bash
   npm install -g pnpm
   ```

3. **MySQL** 8.0+ (可选，用于生产环境)
   ```bash
   brew install mysql
   brew services start mysql
   ```

---

## 快速部署

### 1. 解压代码
```bash
# 解压到目标目录
unzip youyi-farm-v1.0.0.zip -d ~/Projects/
cd ~/Projects/china-smart-agriculture
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置（如需要）
nano .env
```

### 4. 启动开发服务器
```bash
pnpm dev
```

### 5. 访问平台
打开浏览器访问: http://localhost:3000

---

## 生产环境部署

### 构建生产版本
```bash
pnpm build
```

### 启动生产服务器
```bash
pnpm start
```

### 使用 PM2 守护进程（推荐）
```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start npm --name "youyi-farm" -- start

# 设置开机自启
pm2 startup
pm2 save
```

---

## 数据库配置（可选）

如果需要持久化数据，配置 MySQL 数据库：

```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE youyi_farm;
CREATE USER 'youyi'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON youyi_farm.* TO 'youyi'@'localhost';
FLUSH PRIVILEGES;
```

更新 `.env` 文件：
```
DATABASE_URL=mysql://youyi:your_password@localhost:3306/youyi_farm
```

运行数据库迁移：
```bash
pnpm db:push
```

---

## 高德地图 API 配置

当前使用的是演示 API Key，生产环境建议申请自己的 Key：

1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 注册账号并创建应用
3. 获取 Web 端 API Key
4. 更新 `client/src/components/Map.tsx` 中的 Key

---

## 目录结构

```
china-smart-agriculture/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── contexts/      # 状态管理
│   │   ├── lib/           # 工具函数和配置
│   │   └── pages/         # 页面组件
│   └── index.html
├── server/                 # 后端代码
├── shared/                 # 共享类型定义
├── docs/                   # 文档
├── package.json
├── pnpm-lock.yaml
└── VERSION
```

---

## 常见问题

### Q: 地图显示空白？
A: 检查网络连接，高德地图需要联网加载。

### Q: 端口被占用？
A: 修改启动命令指定其他端口：
```bash
pnpm dev --port 3001
```

### Q: 如何修改农场坐标？
A: 编辑 `client/src/lib/config.ts` 中的 `FARM_CONFIG.mapCenter`

---

## 技术支持

如有问题，请查阅项目文档或联系开发团队。

**友谊农场智慧农业平台 v1.0.0**
