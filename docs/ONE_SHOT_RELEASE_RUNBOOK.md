# 一次性上线 Runbook（工业监控 UI 大改版）

> 适用：本仓库为**全栈**（Express 提供 `/api/trpc` + 静态资源），不是纯前端静态站。  
> 目标：一次性上线时**可验证、可灰度、可回滚**，把风险收敛到可控范围。

---

## 0. 上线前的“硬门槛”

### 0.1 必须通过的本地门禁

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

### 0.2 生产环境必备配置（至少）
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `VITE_JL1_MAP_MK`
- `VITE_JL1_MAP_TK`
- （可选）`VITE_JL1_MAP_PRO`
- （可选）`VITE_JL1_MAP_BASE_URL`

---

## 1. 预发/灰度策略（强烈推荐）

### 1.1 蓝绿目录结构
- `/opt/smart-agri/releases/<timestamp>/`：每次发布一个目录
- `/opt/smart-agri/current`：软链指向当前运行版本
- `/opt/smart-agri/shared/.env`：生产环境变量（不进代码目录）

### 1.2 软链切换（回滚 ≤ 1 分钟）
- 上线：`ln -sfn /opt/smart-agri/releases/<new> /opt/smart-agri/current`
- 回滚：`ln -sfn /opt/smart-agri/releases/<old> /opt/smart-agri/current`
- 然后重启进程（PM2 或 systemd）

---

## 2. 上线步骤（生产）

> 假设当前目录已经 `cd /opt/smart-agri/current`

### 2.1 拉取新版本
方式 A：服务器直接拉代码（推荐你们先用这一套，最简单）

```bash
git fetch --all --prune
git checkout main
git pull --ff-only
```

方式 B：上传 release 包（更可控）
- 本地 `pnpm build` 后打包上传到 `/opt/smart-agri/releases/<timestamp>/`

### 2.2 安装依赖（锁定版本）

```bash
pnpm install --frozen-lockfile
```

### 2.3 迁移数据库（幂等）

```bash
pnpm db:push
```

### 2.4（可选）演示数据

```bash
node seed-db.mjs
```

### 2.5 构建

```bash
pnpm build
```

### 2.6 启动/重启

方式 A：PM2

```bash
pm2 start dist/index.js --name smart-agri --update-env || pm2 restart smart-agri --update-env
pm2 save
```

方式 B：systemd（建议后续升级）
- 写一个 `smart-agri.service`，ExecStart 指向 `node dist/index.js`

---

## 3. 健康检查（上线后 5 分钟内必须完成）

### 3.1 端口可用

```bash
curl -I http://127.0.0.1:${PORT:-3000}/ | head -n 20
```

### 3.2 关键路由可访问（至少）
- `/dashboard`
- `/dashboard/overview`
- `/dashboard/onboarding`
- `/dashboard/marketplace`

### 3.3 关键能力验证（人工点测）
- **地图**：吉林一号影像能出图；无密钥时能给出明确提示并降级
- **登录**：手机号登录可用；未登录页面不崩溃且有引导
- **核心页**：机队/交易/会员至少打开无报错

---

## 4. 回滚流程（出事就做，别犹豫）

1) 将 `/opt/smart-agri/current` 软链切回上一版
2) 重启进程（PM2/systemd）
3) 健康检查（第 3 节）
4) 记录故障：时间点、版本号、复现路径、日志片段

---

## 5. 日志与排障建议

- 进程日志：`pm2 logs smart-agri --lines 200`
- 关键关注：
  - 启动时报错（env 缺失、DB 连接失败）
  - tRPC 401/500
  - 地图瓦片连通性降级提示

