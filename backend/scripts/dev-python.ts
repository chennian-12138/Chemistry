import { spawn } from "child_process";
import { config } from "dotenv";
import { join } from "path";
import * as fs from "fs";

// 加载 .env 文件
config();

// 获取环境变量 RDKIT_PYTHON_PATH 或 PYTHON_PATH，如果不存在则回退到系统原生的 python
// 这个只在本地 npm run dev 的时候起作用，所以服务器不受任何影响
const pythonPath = process.env.RDKIT_PYTHON_PATH || process.env.PYTHON_PATH || "python";

const targetDir = join(process.cwd(), "python_service");

if (!fs.existsSync(pythonPath) && pythonPath !== "python" && pythonPath !== "python3") {
  console.warn(`[Python] 警告: 未在 ${pythonPath} 找到 Python 可执行文件，请检查你的 .env 文件配置!`);
}

console.log(`[Python] 正在启动 Python 服务，使用的解释器路径: ${pythonPath}`);

// 执行启动命令
// 使用 -m uvicorn 可以确保它运行的是该 python 环境下安装的 uvicorn
const p = spawn(pythonPath, ["-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "5000"], {
  cwd: targetDir,
  stdio: "inherit"
});

p.on("error", (err) => {
  console.error(`[Python] 启动失败: ${err.message}`);
});
