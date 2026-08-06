#!/usr/bin/env bash
#
# Chemistry 一键部署脚本（Ubuntu/Debian，原生 systemd，无需宝塔/Docker）
#
# 用法：
#   git clone <你的仓库地址> && cd Chemistry && sudo bash deploy.sh
#
# 可用环境变量覆盖（不想交互式输入时用）：
#   DOMAIN=你的域名            # 必填，或交互输入
#   DB_USER=chemapp            # 数据库用户（默认 chemapp）
#   DB_PASSWORD=强密码         # 数据库密码，不填则自动生成
#   DUMP_FILE=/path/dump.gz    # 可选：旧库导出文件（有则恢复数据，无则建空库+建表）
#   SKIP_NGINX=1               # 跳过 Nginx 配置（比如你已经用宝塔/其他反代）
#   SKIP_HTTPS=1               # 跳过 certbot HTTPS（学校网关/前置代理转发时用）
#   LLM_API_KEY=...            # 这些 key 有就填，没有则之后手动编辑 .env.production
#   SILICONFLOW_API_KEY=...
#   SMTP_PASS=...
#
set -euo pipefail

# ============ 配置 ============
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="${DOMAIN:-}"
DB_USER="${DB_USER:-chemapp}"
DB_PASSWORD="${DB_PASSWORD:-}"
DUMP_FILE="${DUMP_FILE:-}"
SKIP_NGINX="${SKIP_NGINX:-0}"
SKIP_HTTPS="${SKIP_HTTPS:-0}"

# ============ 工具函数 ============
info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[OK]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
fail() { echo -e "\033[1;31m[FAIL]\033[0m $*"; exit 1; }

# ============ 交互收集配置 ============
if [ -z "$DOMAIN" ]; then
  read -rp "请输入访问域名（如 chem.example.com）: " DOMAIN
fi
[ -z "$DOMAIN" ] && fail "域名不能为空（可用环境变量 DOMAIN 传入）"

if [ -z "$DB_PASSWORD" ]; then
  DB_PASSWORD="$(openssl rand -base64 18 | tr '+/' '-_' | tr -d '=')"
  info "已自动生成数据库密码: $DB_PASSWORD（保存在 backend/.env.production）"
fi

if [ -n "$DUMP_FILE" ] && [ ! -f "$DUMP_FILE" ]; then
  fail "DUMP_FILE 不存在: $DUMP_FILE"
fi

# ============ 1. 系统依赖 ============
info "===== 1/7 安装系统依赖 ====="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

# Node 22（若已装且 >= 20 则跳过）
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - || true
  apt-get install -y nodejs
fi
ok "Node: $(node -v)"

if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
fi
npm config set registry https://registry.npmmirror.com || true
pnpm config set registry https://registry.npmmirror.com || true
ok "pnpm: $(pnpm -v)"

# PostgreSQL 16 + pgvector + Nginx
apt-get install -y postgresql-16 postgresql-16-pgvector nginx || {
  warn "直接安装失败，尝试 PGDG 源..."
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc || true
  . /etc/os-release
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq
  apt-get install -y postgresql-16 postgresql-16-pgvector nginx
}
systemctl enable --now postgresql nginx || true
ok "PostgreSQL + pgvector + Nginx 已安装"

# ============ 2. 检测 PostgreSQL 端口 ============
info "===== 2/7 检测 PostgreSQL ====="
# 优先找 apt 集群（socket 在 /var/run/postgresql，宝塔的 PG socket 不在这里）
PG_PORT=""
for port in $(ss -tln 2>/dev/null | grep -oP ':\K(543[0-9])' | sort -u); do
  if [ -S "/var/run/postgresql/.s.PGSQL.$port" ]; then
    PG_PORT="$port"
    break
  fi
done
if [ -z "$PG_PORT" ]; then
  PG_PORT=$(pg_lsclusters 2>/dev/null | awk 'NR>1 && $4=="online" {print $3; exit}')
fi
PG_PORT="${PG_PORT:-5432}"
ok "使用 PostgreSQL 端口: $PG_PORT"

# 等 PG 就绪
for i in $(seq 1 15); do
  pg_isready -p "$PG_PORT" >/dev/null 2>&1 && break
  sleep 1
done

# ============ 3. 建库建用户 ============
info "===== 3/7 创建数据库 ====="
if ! sudo -u postgres -p "$PG_PORT" psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  sudo -u postgres -p "$PG_PORT" psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
  ok "已创建用户 $DB_USER"
fi
if ! sudo -u postgres -p "$PG_PORT" psql -tAc "SELECT 1 FROM pg_database WHERE datname='chemistry'" | grep -q 1; then
  sudo -u postgres -p "$PG_PORT" createdb -O "$DB_USER" chemistry
  ok "已创建数据库 chemistry"
fi
sudo -u postgres -p "$PG_PORT" psql -d chemistry -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER; GRANT USAGE, CREATE ON SCHEMA public TO $DB_USER;"
ok "数据库权限已配置"

# ============ 4. 后端 ============
info "===== 4/7 部署后端 ====="
cd "$PROJECT_DIR/backend"
npm install

# 写 .env.production（不覆盖已存在的）
if [ ! -f .env.production ]; then
  BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
  cat > .env.production << EOF
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:$PG_PORT/chemistry?schema=public"
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
BETTER_AUTH_URL=https://$DOMAIN
FRONTEND_URL=https://$DOMAIN
API_URL=https://$DOMAIN
PYTHON_URL=http://127.0.0.1:5000
RDKIT_PYTHON_PATH=$PROJECT_DIR/backend/python_service/.venv/bin/python
LLM_API_KEY=${LLM_API_KEY:-你的DeepSeek_Key}
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash
LLM_TITLE_MODEL=deepseek-v4-flash
CHAT_DAILY_LIMIT=25
SILICONFLOW_API_KEY=${SILICONFLOW_API_KEY:-你的SiliconFlow_Key}
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=${SMTP_USER:-你的QQ邮箱@qq.com}
SMTP_PASS=${SMTP_PASS:-你的SMTP授权码}
EMAIL_FROM=${EMAIL_FROM:-你的QQ邮箱@qq.com}
EOF
  warn "已生成 backend/.env.production（数据库配置自动填入，API Key 请手动补）"
else
  warn "backend/.env.production 已存在，跳过生成（如需更新请手动编辑）"
fi

export NODE_ENV=production
npx prisma generate

# Python 服务
cd "$PROJECT_DIR/backend/python_service"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple || \
  .venv/bin/pip install -r requirements.txt
ok "Python 依赖已装（含 RDKit）"

# ============ 5. 数据（dump 恢复 或 建表） ============
info "===== 5/7 数据库数据 ====="
cd "$PROJECT_DIR/backend"
TABLE_COUNT=$(sudo -u postgres -p "$PG_PORT" psql -d chemistry -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" || echo 0)
if [ -n "$DUMP_FILE" ]; then
  info "恢复数据从 $DUMP_FILE ..."
  gzip -t "$DUMP_FILE" 2>/dev/null && gunzip -k -c "$DUMP_FILE" > /tmp/chemistry_restore.dump || cp "$DUMP_FILE" /tmp/chemistry_restore.dump
  sudo -u postgres -p "$PG_PORT" pg_restore -d chemistry --no-owner /tmp/chemistry_restore.dump || warn "pg_restore 有警告，继续（检查日志确认关键表是否恢复）"
  sudo -u postgres -p "$PG_PORT" psql -d chemistry -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER; GRANT USAGE, CREATE ON SCHEMA public TO $DB_USER;"
  ok "数据恢复完成"
elif [ "$TABLE_COUNT" -eq 0 ]; then
  info "空库，执行 prisma db push 建表..."
  export NODE_ENV=production
  npx prisma db push
  ok "数据表已创建"
else
  ok "数据库已有 $TABLE_COUNT 张表，跳过建表"
fi

# ============ 6. systemd 服务 ============
info "===== 6/7 配置 systemd 服务 ====="
NODE_BIN="$(readlink -f "$(command -v node)")"

cat > /etc/systemd/system/chem-backend.service << EOF
[Unit]
Description=Chemistry Backend
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR/backend
Environment=NODE_ENV=production
ExecStart=$NODE_BIN $PROJECT_DIR/backend/node_modules/.bin/tsx src/app.ts
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/chem-python.service << EOF
[Unit]
Description=Chemistry RDKit Python Service
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR/backend/python_service
ExecStart=$PROJECT_DIR/backend/python_service/.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 5000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/chem-frontend.service << EOF
[Unit]
Description=Chemistry Frontend
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR/frontend
ExecStart=$NODE_BIN $PROJECT_DIR/frontend/node_modules/next/dist/bin/next start -p 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now chem-python chem-backend chem-frontend

# ============ 7. 前端构建 ============
info "===== 7/7 构建前端 ====="
cd "$PROJECT_DIR/frontend"
if [ ! -f .env.production ]; then
  cat > .env.production << EOF
NEXT_PUBLIC_BETTER_AUTH_URL=https://$DOMAIN
FRONTEND_URL=https://$DOMAIN
EOF
fi
pnpm install
pnpm build

# 前端构建后需要重启（.next 更新）
systemctl restart chem-frontend

# ============ Nginx（可选） ============
if [ "$SKIP_NGINX" = "1" ]; then
  warn "已跳过 Nginx 配置（SKIP_NGINX=1），请自行反代 3000/8000"
else
  info "配置 Nginx ..."
  cat > /etc/nginx/sites-available/chemistry << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /uploads/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  ln -sf /etc/nginx/sites-available/chemistry /etc/nginx/sites-enabled/chemistry
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  ok "Nginx 已配置"

  if [ "$SKIP_HTTPS" != "1" ]; then
    info "申请 HTTPS 证书（certbot）..."
    apt-get install -y certbot python3-certbot-nginx >/dev/null 2>&1 || true
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@"$DOMAIN" --redirect || \
      warn "certbot 自动申请失败，可手动运行: certbot --nginx -d $DOMAIN"
  else
    warn "已跳过 HTTPS（SKIP_HTTPS=1）——若域名由网关/前置代理转发，这样是对的"
  fi
fi

# ============ 完成 ============
echo ""
ok "=========== 部署完成 ==========="
echo "  前端:     https://$DOMAIN"
echo "  后端 API: http://127.0.0.1:8000"
echo ""
echo "  服务管理: systemctl status chem-backend chem-frontend chem-python"
echo "  日志:     journalctl -u chem-backend -f"
echo ""
echo "  需要手动补充的密钥（backend/.env.production）:"
echo "    - LLM_API_KEY (DeepSeek)"
echo "    - SILICONFLOW_API_KEY (RAG embedding)"
echo "    - SMTP_PASS (QQ邮箱授权码)"
echo "    补完执行: systemctl restart chem-backend"
echo ""
echo "  数据库: $DB_USER@localhost:$PG_PORT/chemistry  (密码在 backend/.env.production)"
