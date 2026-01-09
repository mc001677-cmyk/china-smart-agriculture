# 阿里云 ECS 部署指南（生产：正式运行）

目标：把本项目以 **生产模式** 部署到阿里云 ECS，并通过 Nginx 提供公网访问（可选 HTTPS）。

> 说明：你选择的运行路线是 D+A（统一 JSON + HTTP 上报）。部署后硬件即可通过公网访问 `/api/telemetry` 上报数据。

---

## 1. 推荐环境
- **ECS**：Ubuntu 22.04 LTS（或 20.04）
- **CPU/内存**：2C4G 起步（演示可更低）
- **Node.js**：20.x
- **进程守护**：systemd
- **反向代理**：Nginx
- **数据库**：MySQL（阿里云 RDS MySQL 推荐；也可 ECS 自建）

---

## 2. 安全组/端口
在阿里云安全组放行：
- 80（HTTP）
- 443（HTTPS，可选）

**不要**直接把 3000 暴露公网（建议仅 Nginx 转发到 127.0.0.1:3000）。

---

## 3. 服务器初始化（Ubuntu）

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx curl
```

安装 Node 20（示例：NodeSource）：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

安装 pnpm：

```bash
sudo corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

---

## 4. 拉取代码并构建

```bash
sudo mkdir -p /srv/china-smart-agriculture
sudo chown -R $USER:$USER /srv/china-smart-agriculture
cd /srv/china-smart-agriculture

# 通过 git 拉取你的项目（你需要把代码放到你的 git 仓库）
git clone <YOUR_REPO_URL> .

pnpm install
pnpm build
```

---

## 5. 配置环境变量（.env）

在 `/srv/china-smart-agriculture/.env` 创建：

```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000

# 必填：鉴权与数据库
JWT_SECRET=REPLACE_ME_STRONG
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DBNAME

# OAuth（若你要正式登录）
OAUTH_SERVER_URL=REPLACE_ME_IF_USED
OWNER_OPEN_ID=REPLACE_ME_IF_USED
VITE_OAUTH_PORTAL_URL=REPLACE_ME_IF_USED
VITE_APP_ID=REPLACE_ME_IF_USED

# 吉林一号地图（前端使用）
VITE_JL1_MAP_MK=REPLACE_ME
VITE_JL1_MAP_TK=REPLACE_ME
VITE_JL1_MAP_BASE_URL=https://api.jl1mall.com/getMap

# 遥测接口（正式运行 D+A）
TELEMETRY_REQUIRE_SIGNATURE=true
TELEMETRY_AUTO_REGISTER=false
TELEMETRY_MAX_CLOCK_SKEW_MS=300000
TELEMETRY_NONCE_TTL_MS=600000
EOF
```

> 注：首次对接硬件时，你可以临时把 `TELEMETRY_AUTO_REGISTER=true`，并让设备首包携带 `X-Device-Secret` 完成注册；稳定后务必关掉。

---

## 6. 数据库迁移

项目使用 Drizzle：

```bash
pnpm db:push
```

如果你使用阿里云 RDS MySQL，确保 RDS 白名单已放行 ECS 出网 IP。

---

## 7. systemd 启动（守护进程）

创建服务文件：

```bash
sudo tee /etc/systemd/system/china-smart-agriculture.service > /dev/null << 'EOF'
[Unit]
Description=China Smart Agriculture Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/china-smart-agriculture
EnvironmentFile=/srv/china-smart-agriculture/.env
ExecStart=/usr/bin/node /srv/china-smart-agriculture/dist/index.js
Restart=always
RestartSec=3
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
EOF
```

给目录权限（推荐让 www-data 读项目目录）：

```bash
sudo chown -R www-data:www-data /srv/china-smart-agriculture
```

启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now china-smart-agriculture
sudo systemctl status china-smart-agriculture --no-pager
```

查看日志：

```bash
journalctl -u china-smart-agriculture -f
```

---

## 8. Nginx 反向代理（HTTP）

```bash
sudo tee /etc/nginx/sites-available/china-smart-agriculture > /dev/null << 'EOF'
server {
  listen 80;
  server_name your.domain.com;

  client_max_body_size 50m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

sudo ln -sf /etc/nginx/sites-available/china-smart-agriculture /etc/nginx/sites-enabled/china-smart-agriculture
sudo nginx -t
sudo systemctl reload nginx
```

---

## 9. HTTPS（可选，推荐）

使用 Certbot（Let’s Encrypt）：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain.com
```

---

## 10. 遥测上报公网地址

部署完成后，设备上报地址示例：
- `POST https://your.domain.com/api/telemetry`
- `POST https://your.domain.com/api/telemetry/batch`

签名规则参见：`docs/TELEMETRY_JSON_SPEC_V0.1.md`

