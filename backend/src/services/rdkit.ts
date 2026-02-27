import { spawn } from "child_process";
import { join } from "path";

const PYTHON_PATH = process.env.RDKIT_PYTHON_PATH as string;
const SCRIPT_DIR = join(process.cwd(), "scripts");

interface MatchResult {
  smarts: string;
  match_count: number;
  matches: number[][];
  atom_indices: number[];
  matched: boolean;
  error?: string;
}

export async function matchSmartsPattern(
  smarts: string,
  molBlock: string,
): Promise<MatchResult> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(
      PYTHON_PATH,
      [join(SCRIPT_DIR, "match_smarts.py"), smarts, molBlock],
      {
        timeout: 30000,
        killSignal: "SIGTERM",
      },
    );

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python 进程退出码 ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (e) {
        reject(new Error(`解析 Python 输出失败: ${stdout}`));
      }
    });

    pythonProcess.on("error", (err) => {
      reject(new Error(`Python 进程启动失败: ${err.message}`));
    });
  });
}
