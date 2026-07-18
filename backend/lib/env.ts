import { config } from "dotenv";
import path from "node:path";

/**
 * 统一环境变量加载入口。
 *
 * 按 NODE_ENV 选择环境文件：
 *   - 未设置 / development → .env.development（本机开发）
 *   - production           → .env.production （服务器）
 *
 * 加载顺序即优先级：先加载环境专属文件，再用 .env 兜底。
 * dotenv 默认「不覆盖已存在的值」，因此：
 *   1. docker-compose / 系统已注入的变量优先级最高（不会被文件覆盖）；
 *   2. 环境专属文件次之；
 *   3. .env 仅作为缺省兜底。
 *
 * 三个入口（app 启动、prisma、dev-python）都 import 本模块，
 * 不再各自散落 `import "dotenv/config"`，从此靠 NODE_ENV 自动切换，
 * 不用再手动改注释。
 */
const nodeEnv = process.env.NODE_ENV || "development";
const envFile = `.env.${nodeEnv}`;
const cwd = process.cwd();

config({ path: path.resolve(cwd, envFile) });
config({ path: path.resolve(cwd, ".env") }); // 兜底，不覆盖已加载的值

if (process.env.NODE_ENV !== "production") {
  console.log(`[env] 已加载环境: ${nodeEnv} (${envFile})`);
}
