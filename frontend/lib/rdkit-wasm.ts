import type { RDKitModule } from "@rdkit/rdkit";

/**
 * 前端 WASM 版 RDKit 封装。
 *
 * 仅承载「子结构匹配」这类纯客户端能力，避免一次
 * 前端 -> Node -> Python 的网络往返。反应产物预测 (RunReactants)
 * WASM 版不支持，仍走后端，见 lib/rdkit.ts 的 predictProducts。
 *
 * WASM 资源放在 public/rdkit/ 下，通过动态注入 script 加载，
 * 由 locateFile 指向同目录的 .wasm 文件。
 */

const RDKIT_SCRIPT_SRC = "/rdkit/RDKit_minimal.js";
const RDKIT_WASM_SRC = "/rdkit/RDKit_minimal.wasm";

let rdkitPromise: Promise<RDKitModule> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 已经注入过则直接复用
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if (window.initRDKitModule) {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error("RDKit 脚本加载失败")),
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("RDKit 脚本加载失败"));
    document.head.appendChild(script);
  });
}

/**
 * 获取 RDKit 单例。首次调用会注入脚本并初始化 WASM，
 * 后续调用复用同一个 Promise。
 */
export function getRDKit(): Promise<RDKitModule> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("RDKit 只能在浏览器环境加载"));
  }

  if (!rdkitPromise) {
    rdkitPromise = loadScript(RDKIT_SCRIPT_SRC)
      .then(() =>
        window.initRDKitModule({
          locateFile: () => RDKIT_WASM_SRC,
        }),
      )
      .catch((err) => {
        // 失败时清空缓存，允许下次重试
        rdkitPromise = null;
        throw err;
      });
  }

  return rdkitPromise;
}

export interface LocalMatchResult {
  matched: boolean;
  matchCount: number;
  /** 所有匹配命中的原子索引（去重，基于重原子，索引与 Kekule 画板对齐） */
  atomIndices: number[];
}

/**
 * 在分子 (MolBlock) 中查找 SMARTS 模式，返回匹配的原子索引。
 *
 * 与原后端实现的一个区别：这里不做 AddHs，索引基于重原子，
 * 因此可直接交给 Kekule 的 highlightAtoms 高亮，不会出现氢原子导致的索引错位。
 */
export async function matchSmartsLocal(
  smarts: string,
  molBlock: string,
): Promise<LocalMatchResult> {
  const rdkit = await getRDKit();

  let mol: ReturnType<RDKitModule["get_mol"]> = null;
  let qmol: ReturnType<RDKitModule["get_qmol"]> = null;

  try {
    mol = rdkit.get_mol(molBlock);
    qmol = rdkit.get_qmol(smarts);

    if (!mol) {
      throw new Error("分子结构解析失败");
    }
    if (!qmol) {
      throw new Error("SMARTS 模式无效");
    }

    const raw = JSON.parse(mol.get_substruct_matches(qmol) || "[]") as Array<{
      atoms: number[];
      bonds: number[];
    }>;

    const atomIndices = [...new Set(raw.flatMap((group) => group.atoms ?? []))];

    return {
      matched: raw.length > 0,
      matchCount: raw.length,
      atomIndices,
    };
  } finally {
    // WASM 对象必须手动释放，否则反复调用会泄漏堆内存
    mol?.delete();
    qmol?.delete();
  }
}
