FROM node:20-alpine

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# 本地 vendor 的 kekule(file: 依赖)必须在 install 前就存在
COPY vendor ./vendor
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]
