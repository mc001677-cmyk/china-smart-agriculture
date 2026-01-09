# 中国米胖子农业智能平台 - 部署指南

## 项目信息

**项目名称**: 迪尔智联数字农业平台（China Smart Agriculture Platform）

**版本**: v1.8.0

**部署时间**: 2026年01月04日

**新增功能**: 农机作业交易模块

**在线访问地址**: https://3000-iefhyooazu3li55smnkgr-b5384846.sg1.manus.computer

## 技术栈

### 前端
- **框架**: Vite 6.0 + React 19 + TypeScript 5.7
- **样式**: TailwindCSS 3.4
- **UI组件**: Radix UI + Shadcn/ui
- **地图**: 高德地图 JS API 2.0
- **图表**: Recharts
- **状态管理**: React Context API
- **路由**: React Router v7

### 后端
- **运行时**: Node.js 22.13.0
- **框架**: Express.js
- **数据库**: MySQL 8.0
- **ORM**: Drizzle ORM
- **认证**: Manus OAuth

### 部署环境
- **操作系统**: Ubuntu 22.04 LTS
- **包管理器**: pnpm 9.15.4
- **进程管理**: 后台运行（可升级为PM2）

## 目录结构

```
china-rice-agriculture/
├── client/                 # 前端源码
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── pages/         # 页面组件
│   │   ├── contexts/      # Context状态管理
│   │   ├── lib/           # 工具函数
│   │   └── index.css      # 全局样式
│   └── index.html
├── server/                 # 后端源码
│   ├── _core/             # 核心配置
│   ├── routes/            # API路由
│   └── index.ts           # 入口文件
├── drizzle/               # 数据库Schema
│   └── schema.ts
├── dist/                   # 构建产物
│   ├── public/            # 前端静态文件
│   └── index.js           # 后端编译文件
├── .env                    # 环境变量
├── package.json
└── vite.config.ts
```

## 环境变量配置

`.env` 文件内容：

```env
# 数据库配置
DATABASE_URL=mysql://root:root@localhost:3306/rice_agriculture

# Manus OAuth（使用默认配置）
# MANUS_OAUTH_CLIENT_ID=
# MANUS_OAUTH_CLIENT_SECRET=

# 高德地图API Key
VITE_AMAP_KEY=your_amap_key_here

# 服务器端口
PORT=3000
```

## 数据库配置

### 数据库创建

```sql
CREATE DATABASE IF NOT EXISTS rice_agriculture 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

### 用户权限

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
FLUSH PRIVILEGES;
```

### 数据表结构

系统包含以下核心数据表：

1. **users** - 用户表
2. **machines** - 农机设备表
3. **fields** - 地块表
4. **work_logs** - 作业日志表
5. **alerts** - 警报表
6. **files** - 文件管理表

### 数据迁移

```bash
# 运行数据库迁移
pnpm db:push

# 填充示例数据
node seed-db.mjs
```

## 部署步骤

### 1. 环境准备

```bash
# 更新系统
sudo apt-get update

# 安装MySQL
sudo apt-get install -y mysql-server

# 启动MySQL服务
sudo service mysql start

# 安装Node.js 22（如未安装）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装pnpm
npm install -g pnpm
```

### 2. 项目部署

```bash
# 解压项目文件
unzip china-rice-agriculture-v9.0.zip
cd china-rice-agriculture

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入正确的配置

# 初始化数据库
pnpm db:push
node seed-db.mjs

# 构建项目
pnpm build

# 启动服务
NODE_ENV=production node dist/index.js
```

### 3. 后台运行（推荐使用PM2）

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start dist/index.js --name rice-agriculture

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs rice-agriculture

# 重启应用
pm2 restart rice-agriculture
```

### 4. 反向代理配置（可选）

使用Nginx作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 功能模块

### 1. 机队管理
- 实时查看所有设备状态
- 设备分类筛选（作业中/行驶中/待命）
- 设备搜索功能
- 高德地图实时定位
- 设备详情面板

### 2. 作业监控
- 实时作业数据展示
- 统计卡片（作业面积、收获量、油耗、转速等）
- 设备参数监控（转速、速度、油耗、负载）
- 燃油和尿素液位监控

### 3. 轨迹回放
- 历史轨迹查询
- 时间范围筛选
- 轨迹动画播放
- 作业路径可视化

### 4. 亩产分析
- 作业面积统计
- 产量分析
- 油耗分析
- 设备效率排名
- 作业类型分布
- 趋势图表展示

### 5. 智能警报
- 实时警报推送
- 警报级别分类（严重/警告/提示）
- 警报历史记录
- 警报处理状态跟踪

## 默认测试账号

系统已预置测试数据，可直接登录使用：

**用户名**: 合作社老板（通过Manus OAuth登录）

**测试设备**:
1. 约翰迪尔 S770 收割机 - 作业中
2. 凯斯 7130 收割机 - 作业中
3. 约翰迪尔 7M-2204 拖拉机 - 行驶中
4. 凯斯 Puma 2104 (A) 拖拉机 - 作业中
5. 凯斯 Puma 2104 (B) 拖拉机 - 待命

## 性能指标

### 构建产物

- **HTML**: 367.83 kB (gzip: 105.68 kB)
- **CSS**: 158.62 kB (gzip: 23.90 kB)
- **JavaScript**: 1,339.67 kB (gzip: 361.03 kB)
- **后端**: 39.5 kB

### 运行性能

- **首屏加载**: < 2s
- **页面帧率**: 60 fps
- **内存占用**: ~130 MB
- **API响应**: < 100ms

## 维护指南

### 日志查看

```bash
# 查看服务器日志
tail -f server.log

# 使用PM2查看日志
pm2 logs rice-agriculture
```

### 数据库备份

```bash
# 备份数据库
mysqldump -u root -p rice_agriculture > backup_$(date +%Y%m%d).sql

# 恢复数据库
mysql -u root -p rice_agriculture < backup_20260101.sql
```

### 更新部署

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
pnpm install

# 运行数据库迁移（如有）
pnpm db:push

# 重新构建
pnpm build

# 重启服务
pm2 restart rice-agriculture
```

### 监控检查

```bash
# 检查服务状态
pm2 status

# 检查端口占用
netstat -tulpn | grep 3000

# 检查MySQL状态
sudo service mysql status

# 检查磁盘空间
df -h

# 检查内存使用
free -h
```

## 故障排查

### 问题1: 服务无法启动

**可能原因**:
- 端口3000被占用
- MySQL服务未启动
- 环境变量配置错误

**解决方案**:
```bash
# 检查端口占用
lsof -i :3000

# 启动MySQL
sudo service mysql start

# 检查环境变量
cat .env
```

### 问题2: 数据库连接失败

**可能原因**:
- MySQL密码错误
- 数据库不存在
- 权限不足

**解决方案**:
```bash
# 重置MySQL密码
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';"

# 创建数据库
sudo mysql -e "CREATE DATABASE IF NOT EXISTS rice_agriculture;"

# 刷新权限
sudo mysql -e "FLUSH PRIVILEGES;"
```

### 问题3: 地图无法显示

**可能原因**:
- 高德地图API Key未配置或无效
- 网络问题

**解决方案**:
- 在 `.env` 文件中配置有效的 `VITE_AMAP_KEY`
- 检查网络连接
- 查看浏览器控制台错误信息

### 问题4: 页面加载缓慢

**可能原因**:
- 服务器资源不足
- 数据库查询慢
- 网络带宽限制

**解决方案**:
```bash
# 检查系统资源
top
htop

# 优化数据库
sudo mysql rice_agriculture -e "OPTIMIZE TABLE machines, work_logs, alerts;"

# 添加数据库索引（如需要）
```

## 安全建议

### 1. 数据库安全

- 修改默认root密码
- 创建专用数据库用户
- 限制远程访问
- 定期备份数据

### 2. 应用安全

- 使用HTTPS（配置SSL证书）
- 启用防火墙
- 定期更新依赖包
- 配置CORS策略

### 3. 服务器安全

- 禁用root SSH登录
- 使用SSH密钥认证
- 配置fail2ban防暴力破解
- 定期更新系统补丁

## 扩展功能

### 未来规划

1. **移动端适配**: 优化移动设备体验
2. **实时通知**: WebSocket推送实时警报
3. **数据导出**: 支持Excel/PDF报表导出
4. **多租户支持**: 支持多个合作社独立管理
5. **AI预测**: 基于历史数据的智能预测
6. **语音控制**: 集成语音助手
7. **离线模式**: PWA支持离线使用

## V1.8.0 新增功能

### 农机作业交易模块

1. **交易大厅** (`/dashboard/marketplace`)
   - 平台统计数据展示
   - 订单列表（待抢单/进行中/已完成）
   - 订单搜索和筛选
   - 立即抢单/竞价功能

2. **发布订单** (`/dashboard/publish-order`)
   - 3步骤向导（基本信息→地块详情→价格设置）
   - 8种作业类型选择
   - 固定价/竞价两种定价模式
   - 实时价格预览

3. **认证中心** (`/dashboard/certification`)
   - 身份认证、驾照认证
   - 营业执照、设备认证
   - 成就徽章系统
   - 信用分展示

4. **评分排行榜** (`/dashboard/rating`)
   - 双维度评分系统（机手/地主）
   - 全部/质量/效率排行榜
   - 信用分等级（S/A/B/C/D）
   - 最近评价展示

5. **订单追踪** (`/dashboard/order-tracking`)
   - 订单列表和详情展示
   - 作业进度时间线
   - 与机手/地主沟通功能
   - 实时进度追踪

## 技术支持

### 文档资源

- **项目文档**: `/home/ubuntu/china-smart-agriculture/`
- **优化报告**: `OPTIMIZATION_REPORT.md`
- **测试日志**: `test-log.md`
- **部署记录**: `DEPLOYMENT_REPORT.md`
- **V1.8.0发布说明**: `MARKETPLACE_RELEASE_V1.8.0.md`

### 联系方式

如有问题，请查阅项目文档或联系技术团队。

## 许可证

本项目为私有项目，版权归项目所有者所有。

---

**部署完成时间**: 2026年01月01日

**部署状态**: ✅ 运行正常

**最后更新**: 2026年01月04日 06:27

**V1.8.0更新内容**: 新增农机作业交易模块（交易大厅、发布订单、认证中心、评分排行榜、订单追踪）
