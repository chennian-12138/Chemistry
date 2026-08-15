#!/usr/bin/env bash
# ============================================================================
# Chemistry 服务器部署脚本（单点配置版）
#
# 用法:   sudo bash deploy/upgrade.sh /www/wwwroot/chemistry_新版本目录
# 可选:   DB_PUSH=1 sudo bash deploy/upgrade.sh /www/wwwroot/chemistry_新版本目录
#         （DB_PUSH=1 时额外执行 prisma db push，schema 有改动才需要）
#
# 前置条件（一次性，服务器上已具备）:
#   - /www/chemistry.env      所有环境变量（含 DATABASE_URL / BETTER_AUTH_* / SMTP / API keys）
#   - /www/venvs/chem-python   外置 Python 虚拟环境
#   - deploy/systemd/*.service 三个 systemd 服务文件（本仓库自带）
#
# 脚本幂等：重复执行不报错，可放心重跑。
# ============================================================================
set -euo pipefail

NEW_DIR="${1:?用法: sudo bash deploy/upgrade.sh /www/wwwroot/chemistry_新版本目录}"

# ---------- 0. 前置检查 ----------
[ -d "$NEW_DIR" ]                 || { echo "❌ 目录不存在: $NEW_DIR"; exit 1; }
[ -f /www/chemistry.env ]         || { echo "❌ 缺少 /www/chemistry.env"; exit 1; }
[ -x /www/venvs/chem-python/bin/python ] || { echo "❌ 缺少 /www/venvs/chem-python"; exit 1; }
[ -d "$NEW_DIR/deploy/systemd" ]  || { echo "❌ 新目录缺少 deploy/systemd（代码没拉全？）"; exit 1; }

# 加载单点配置到当前 shell（引号会被 shell 正确处理）
set -a; source /www/chemistry.env; set +a

echo "================================================"
echo "部署目标: $NEW_DIR"
echo "域名: ${BETTER_AUTH_URL:-未知}"
echo "================================================"

# ---------- 1. 切换 current 符号链接 ----------
echo "==> [1/6] 切换 current → $NEW_DIR"
sudo rm -f /www/wwwroot/current
sudo ln -s "$NEW_DIR" /www/wwwroot/current
ls -la /www/wwwroot/current

# ---------- 2. 后端依赖 ----------
echo "==> [2/6] 后端 npm install（含 dev 依赖）+ prisma generate"
cd /www/wwwroot/current/backend
# NODE_ENV=production 时 npm 会跳过 devDependencies（tsx/prisma），必须 --include=dev
npm install --include=dev
npx prisma generate

# ---------- 3. Python 依赖幂等补装 ----------
echo "==> [3/6] Python 依赖补装"
/www/venvs/chem-python/bin/pip install \
  -r /www/wwwroot/current/backend/python_service/requirements.txt \
  -i https://pypi.tuna.tsinghua.edu.cn/simple

# ---------- 4. 前端 ----------
echo "==> [4/6] 前端安装 + 构建"
cd /www/wwwroot/current/frontend
pnpm config get registry 2>/dev/null | grep -q npmmirror || \
  pnpm config set registry https://registry.npmmirror.com
# 从单点配置提取域名生成 NEXT_PUBLIC_ 变量（构建时打进 JS 包）
[ -n "${BETTER_AUTH_URL:-}" ] && echo "NEXT_PUBLIC_BETTER_AUTH_URL=$BETTER_AUTH_URL" > .env.production
pnpm install
pnpm build

# ---------- 5. 注册 systemd 服务（幂等：ln -sf 覆盖旧链接） ----------
echo "==> [5/6] 注册 systemd 服务"
for s in chem-backend chem-python chem-frontend; do
  sudo ln -sf "/www/wwwroot/current/deploy/systemd/$s.service" "/etc/systemd/system/$s.service"
done
sudo systemctl daemon-reload

# ---------- 6. 启动 + 可选 db push ----------
echo "==> [6/6] 启动服务"
if [ "${DB_PUSH:-0}" = "1" ]; then
  echo "    （DB_PUSH=1，执行 prisma db push）"
  cd /www/wwwroot/current/backend
  npx prisma db push
fi
sudo systemctl enable --now chem-backend chem-python chem-frontend
sudo systemctl restart chem-backend chem-python chem-frontend

# ---------- 验证 ----------
echo "==> 验证"
sleep 6
systemctl is-active chem-backend chem-python chem-frontend
echo "---- 端口 ----"
ss -tlnp | grep -E ':(3000|5000|8000)' || true
echo "================================================"
echo "✅ 部署完成。若 backend 未 active，排查:"
echo "   journalctl -u chem-backend -n 30 --no-pager"
echo "================================================"
