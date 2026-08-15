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
      if (typeof window.initRDKitModule === "function") {
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
 * 预处理 Kekule 导出的 V2000 MolBlock：把原子块里的 H 计数字段清零。
 *
 * 背景：Kekule 把"NH2⁻"这类原子的氢数存在 atom.hydrogenCount 属性上，
 * 导出 mol 时写进 V2000 原子行的 H 计数字段（值 = 氢数 + 1）。RDKit 读到
 * 该字段后会设置 NoImplicit 并丢弃氢（NH2⁻ 被解析成 [N-]，氢全部丢失），
 * 导致带 H 计数要求的 SMARTS（如 [N;H2-:3]）无法匹配。清零该字段后
 * RDKit 按价态模型自行补氢，得到正确的 [NH2-]。
 *
 * 显式画出的 H 是独立原子行，不受此处理影响。V3000 不处理（Kekule 不导出）。
 */
export function normalizeMolBlockForRDKit(molBlock: string): string {
  const lines = molBlock.split("\n");
  const countsIdx = lines.findIndex((l) => l.includes("V2000"));
  if (countsIdx < 0) return molBlock;

  const atomCount = parseInt(lines[countsIdx].slice(0, 3), 10);
  if (!Number.isFinite(atomCount) || atomCount <= 0) return molBlock;

  for (let i = 0; i < atomCount; i++) {
    const idx = countsIdx + 1 + i;
    const line = lines[idx];
    // V2000 原子行为定宽格式，H 计数字段在 1-based 第 44-46 列
    if (!line || line.length < 46) continue;
    lines[idx] = `${line.slice(0, 43)}  0${line.slice(46)}`;
  }
  return lines.join("\n");
}

/**
 * 在分子 (MolBlock) 中查找 SMARTS 模式，返回匹配的原子索引。
 *
 * 匹配在 AddHs 后的副本上进行（WASM 版 add_hs 返回 molblock 字符串，
 * 需重新 get_mol），使含显式 [H] 的 SMARTS（如 C([H])#[C;H0]）也能命中。
 * RDKit 的 AddHs 把氢原子追加在原子表末尾、重原子索引保持不变，
 * 因此过滤掉 >= 原原子数的索引后，结果仍与 Kekule 画板高亮对齐。
 */
export async function matchSmartsLocal(
  smarts: string,
  molBlock: string,
): Promise<LocalMatchResult> {
  const rdkit = await getRDKit();

  let mol: ReturnType<RDKitModule["get_mol"]> = null;
  let molH: ReturnType<RDKitModule["get_mol"]> = null;
  let qmol: ReturnType<RDKitModule["get_qmol"]> = null;

  try {
    mol = rdkit.get_mol(normalizeMolBlockForRDKit(molBlock));
    qmol = rdkit.get_qmol(smarts);

    if (!mol) {
      throw new Error("分子结构解析失败");
    }
    if (!qmol) {
      throw new Error("SMARTS 模式无效");
    }

    const heavyAtomCount: number = JSON.parse(mol.get_json()).molecules?.[0]
      ?.atoms?.length;

    // 加氢副本；失败（如已达合理价态）时退回原分子
    let matchSource = mol;
    const addedMolBlock = mol.add_hs();
    if (addedMolBlock) {
      molH = rdkit.get_mol(addedMolBlock);
      if (molH) matchSource = molH;
    }

    // 注意：RDKit WASM 零匹配时返回 "{}" 而非 "[]"，直接 flatMap 会崩溃
    const parsed = JSON.parse(matchSource.get_substruct_matches(qmol) || "[]");
    const raw = (Array.isArray(parsed) ? parsed : []) as Array<{
      atoms: number[];
      bonds: number[];
    }>;

    const atomIndices = [
      ...new Set(
        raw.flatMap((group) =>
          (group.atoms ?? []).filter((i) => i < heavyAtomCount),
        ),
      ),
    ];

    return {
      matched: raw.length > 0,
      matchCount: raw.length,
      atomIndices,
    };
  } finally {
    // WASM 对象必须手动释放，否则反复调用会泄漏堆内存
    mol?.delete();
    molH?.delete();
    qmol?.delete();
  }
}

/**
 * 将 SMILES 渲染为 SVG 字符串，用于在逆合成图的节点里展示分子结构。
 * 纯客户端，无需网络往返。非法 SMILES 返回空字符串。
 */
export async function smilesToSvg(
  smiles: string,
  width = 220,
  height = 160,
): Promise<string> {
  const rdkit = await getRDKit();
  let mol: ReturnType<RDKitModule["get_mol"]> = null;
  try {
    mol = rdkit.get_mol(smiles);
    if (!mol) return "";
    return mol.get_svg(width, height);
  } catch {
    return "";
  } finally {
    mol?.delete();
  }
}

/**
 * 将 Kekule 导出的 MolBlock 转为 canonical SMILES。
 * 用于把画板结构交给后端逆合成接口，避免依赖 Kekule 的 OpenBabel 异步模块。
 */
export async function molBlockToSmiles(
  molBlock: string,
): Promise<string | null> {
  const rdkit = await getRDKit();
  let mol: ReturnType<RDKitModule["get_mol"]> = null;
  try {
    mol = rdkit.get_mol(normalizeMolBlockForRDKit(molBlock));
    if (!mol) return null;
    const smiles = mol.get_smiles();
    return smiles || null;
  } catch {
    return null;
  } finally {
    mol?.delete();
  }
}
