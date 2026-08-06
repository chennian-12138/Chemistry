# Chemistry

化学科研平台：反应词条库 + 论文检索 + AI 聊天（RAG 教材检索）+ 逆合成等。

## 项目结构

```
.
├── backend/            # Express 5 + Prisma 7 + better-auth（端口 8000）
│   ├── python_service/ # FastAPI + RDKit（端口 5000，被后端 HTTP 调用）
│   ├── prisma/         # 数据库模型（schema/*.prisma）
│   ├── scripts/        # 数据管道/工具脚本
│   └── lib/            # env / prisma / auth / rag 等核心模块
├── frontend/           # Next.js 16 + pnpm + Tailwind（端口 3000）
└── docker-compose.yml  # 容器化部署参考（当前生产用原生 systemd 部署）
```

## 技术栈

| 组件 | 技术 |
|---|---|
| 前端 | Next.js 16, React 19, pnpm, TailwindCSS 4 |
| 后端 | Express 5, TypeScript, Prisma 7 (pg adapter) |
| 认证 | better-auth（邮箱 OTP 验证码 + GitHub OAuth） |
| 数据库 | PostgreSQL 16 + pgvector（RAG 向量检索） |
| 模型 | DeepSeek（对话，OpenAI 兼容）、SiliconFlow bge-m3（embedding） |
| 化学计算 | RDKit（python_service，分子/逆合成/论文抓取） |

---

## 本地开发

### 1. 数据库

本机 PostgreSQL 16 + pgvector 扩展：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. 后端

```bash
cd backend
npm install
npx prisma generate        # 生成 Prisma Client（输出到 backend/generated）
cp .env.example .env.development   # 填入真实值
npm run dev                # 同时启动 Node(8000) + Python(5000)
```

### 3. 前端

```bash
cd frontend
pnpm install
cp .env.example .env.development   # NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:8000
pnpm dev                   # http://localhost:3000
```

### 环境变量加载规则

后端按 `NODE_ENV` 选择环境文件（见 `lib/env.ts`）：

- `NODE_ENV` 未设置 / `development` → `.env.development`
- `NODE_ENV=production` → `.env.production`
- `.env` 作为兜底（不覆盖上述文件）

> ⚠️ 所有命令（`prisma`、启动脚本）都要保证 `NODE_ENV` 正确，否则加载错环境文件会报 `Cannot resolve environment variable: DATABASE_URL`。

---

## 生产部署（原生 systemd，无 Docker / 无宝塔）

### 一键部署脚本（推荐）

```bash
git clone <你的仓库地址> && cd Chemistry
sudo bash deploy.sh
```

交互式提示输入域名，其余自动完成：Node/pnpm/PostgreSQL16+pgvector/Nginx 安装、建库授权、后端 + Python(RDKit) + 前端依赖与构建、3 个 systemd 服务、Nginx 反代。

常用变体：

```bash
# 从旧库迁移数据（先在旧机器导出，再传到服务器）
pg_dump -h localhost -U postgres -d chemistry -Fc -f chemistry_dump.dump && gzip chemistry_dump.dump
scp chemistry_dump.dump.gz root@服务器:/tmp/
sudo DUMP_FILE=/tmp/chemistry_dump.dump.gz bash deploy.sh

# 域名由学校网关/前置代理转发 HTTPS（无需本机证书）
sudo SKIP_HTTPS=1 bash deploy.sh

# 用宝塔/其他反代，跳过本机 Nginx
sudo SKIP_NGINX=1 bash deploy.sh

# 非交互（全部用环境变量传入）
sudo DOMAIN=chem.example.com DB_PASSWORD=xxx LLM_API_KEY=xxx SILICONFLOW_API_KEY=xxx SMTP_PASS=xxx bash deploy.sh
```

> 部署完成后仍需手动补充 `backend/.env.production` 里的 API Key（DeepSeek / SiliconFlow / SMTP 授权码），补完 `systemctl restart chem-backend`。

### 手动部署步骤

### 架构

```
浏览器 → 域名(HTTPS) → Nginx (80/443)
   ├── /api/*     → 后端 Express (127.0.0.1:8000)
   ├── /uploads/* → 后端静态文件 (127.0.0.1:8000)
   └── /          → 前端 Next.js (127.0.0.1:3000)
后端(8000) → PostgreSQL (127.0.0.1:5433) + python_service (127.0.0.1:5000)
```

### 1. 上传代码

```bash
# 本机
rm -rf backend/node_modules frontend/node_modules   # 别传 node_modules
git push   # 或 scp -r 整个项目到服务器
```

### 2. 服务器基础环境

```bash
# Node 22 LTS + pnpm（国内先配镜像）
npm config set registry https://registry.npmmirror.com
pnpm config set registry https://registry.npmmirror.com
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx
sudo npm install -g pnpm
```

### 3. 数据库（PostgreSQL 16 + pgvector）

```bash
sudo apt install -y postgresql-16 postgresql-16-pgvector
sudo systemctl enable --now postgresql
```

**从本机迁移数据**（本机导出 → 服务器恢复）：

```bash
# 本机：导出（自定义格式 + 压缩）
pg_dump -h localhost -U postgres -d chemistry -Fc -f chemistry_dump.dump
gzip chemistry_dump.dump
scp chemistry_dump.dump.gz user@服务器:/tmp/

# 服务器：解压 → 建库 → 恢复
gunzip /tmp/chemistry_dump.dump.gz
sudo -u postgres psql
  CREATE USER chemapp WITH PASSWORD '强密码';
  CREATE DATABASE chemistry OWNER chemapp;
  \q
sudo -u postgres pg_restore -d chemistry --no-owner /tmp/chemistry_dump.dump
```

> ⚠️ **恢复后必须授权**（dump 的表 owner 是 postgres，应用连库的 chemapp 会 `permission denied`）：
> ```bash
> sudo -u postgres -p 5433 psql -d chemistry -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chemapp; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chemapp; GRANT USAGE, CREATE ON SCHEMA public TO chemapp;"
> ```

验证：

```bash
sudo -u postgres -p 5433 psql -d chemistry -c "SELECT count(*) FROM rag_chunk;"
# 期望输出 996（RAG 向量数据）
```

> 多实例排查：`pg_lsclusters` 看 apt 集群；`ss -tlnp | grep 543[0-9]` 看所有 PG。宝塔自带的 PG 端口可能是 5432，apt 的是 5433，别连错。

### 4. 后端 + Python 服务

```bash
cd /www/wwwroot/chemistry/backend
npm install
export NODE_ENV=production      # 写进 ~/.bashrc 更好
npx prisma generate

cd python_service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

`.env.production`（关键项）：

```ini
DATABASE_URL="postgresql://chemapp:强密码@localhost:5433/chemistry?schema=public"
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://你的域名
FRONTEND_URL=https://你的域名
API_URL=https://你的域名            # avatar 图片 URL 依赖它
PYTHON_URL=http://127.0.0.1:5000
RDKIT_PYTHON_PATH=/www/wwwroot/chemistry/backend/python_service/.venv/bin/python
LLM_API_KEY=你的DeepSeekKey
SILICONFLOW_API_KEY=你的SiliconFlowKey   # RAG 必配
SMTP_HOST=smtp.qq.com  SMTP_PORT=465  SMTP_USER=你的QQ邮箱  SMTP_PASS=你的授权码
```

### 5. 前端

```bash
cd /www/wwwroot/chemistry/frontend
pnpm install
cat > .env.production << 'EOF'
NEXT_PUBLIC_BETTER_AUTH_URL=https://你的域名
FRONTEND_URL=https://你的域名
EOF
pnpm build
```

> ⚠️ `NEXT_PUBLIC_` 变量**构建时打进 JS 包**，改了必须重新 `pnpm build`。

### 6. systemd 托管（3 个服务）

`/etc/systemd/system/chem-backend.service`：

```ini
[Unit]
Description=Chemistry Backend
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/www/wwwroot/chemistry/backend
Environment=NODE_ENV=production
ExecStart=<node真实路径> /www/wwwroot/chemistry/backend/node_modules/.bin/tsx src/app.ts
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/chem-python.service`：

```ini
[Unit]
Description=Chemistry RDKit Python Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/www/wwwroot/chemistry/backend/python_service
ExecStart=/www/wwwroot/chemistry/backend/python_service/.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 5000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/chem-frontend.service`：

```ini
[Unit]
Description=Chemistry Frontend
After=network.target

[Service]
Type=simple
WorkingDirectory=/www/wwwroot/chemistry/frontend
# ⚠️ 不用 pnpm start（有兼容问题），直接 node 跑 next 二进制：
ExecStart=<node真实路径> /www/wwwroot/chemistry/frontend/node_modules/next/dist/bin/next start -p 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now chem-python chem-backend chem-frontend
```

> node 真实路径：`readlink -f $(which node)`（宝塔装的 Node 在 `/www/server/nodejs/vXX/bin/node`，不是 `/usr/local/bin/node`）。

### 7. Nginx 反代 + HTTPS

`/etc/nginx/sites-available/chemistry`（或宝塔站点配置文件）：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name 你的域名;

    location /uploads/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }

    # API：SSE 流式必须关缓冲！
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/chemistry /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d 你的域名   # 自动 HTTPS + 续期
```

### 8. 验收

- `https://你的域名` 打开前端
- 注册/登录（验证 SMTP）
- AI 聊天（验证 DeepSeek + SSE 流式）
- 聊化学问题（验证 RAG 检索）
- 反应库/论文页（验证 python_service）

---

## 日常更新

```bash
cd /www/wwwroot/chemistry && git pull

# 后端（改了 prisma schema 才需要 generate / db push）
cd backend && npm install && npx prisma generate && sudo systemctl restart chem-backend

# 前端（NEXT_PUBLIC_ 变了必须 build）
cd frontend && pnpm install && pnpm build && sudo systemctl restart chem-frontend

# Python（改了 python_service 才需要）
cd backend/python_service && .venv/bin/pip install -r requirements.txt && sudo systemctl restart chem-python

# Nginx 配置变更
sudo nginx -t && sudo systemctl reload nginx
```

## 数据库备份

```bash
# 手动备份
sudo -u postgres -p 5433 pg_dump -d chemistry -Fc | gzip > /www/backup/chemistry_$(date +%Y%m%d).dump.gz

# 每日凌晨 3 点自动备份
sudo crontab -e
# 0 3 * * * sudo -u postgres -p 5433 pg_dump -d chemistry -Fc | gzip > /www/backup/chemistry_$(date +\%Y\%m\%d).dump.gz
```

## 运维命令速查

```bash
systemctl status chem-backend chem-frontend chem-python   # 服务状态
journalctl -u chem-backend -f    # 实时日志（前端/后端/python 同理）
ss -tlnp | grep -E ':(3000|5000|8000|5433)'   # 端口监听检查
```

## 常见问题

| 现象 | 原因 | 解法 |
|---|---|---|
| npm 超时 | 国内网络 | `npm config set registry https://registry.npmmirror.com` |
| 500 / 循环重启 | 残留进程占端口 | `ss -tlnp | grep 端口` → `kill pid` |
| `permission denied for table` | 表 owner 是 postgres | 执行上方 GRANT 授权命令 |
| 前端 500 | `pnpm start` 兼容问题 | systemd 里直接 `node .../next start` |
| 改环境变量不生效 | `NEXT_PUBLIC_` 打进包 | 改完必须 `pnpm build` |
| 聊天不流式 | Nginx 缓冲 | `proxy_buffering off;` |
| `Cannot resolve env: DATABASE_URL` | NODE_ENV 不对 | `export NODE_ENV=production` 再跑 |
