// 逆合成分析：转发到 Python 服务（RunReactants 在 Python 侧）。

export interface PrecursorSet {
  templateId: string;
  templateName: string;
  templateSmarts: string;
  precursors: string[];
}

export interface ExpandResult {
  target: string;
  precursorSets: PrecursorSet[];
  count: number;
  error?: string;
}

/**
 * 对单个分子做一步逆合成展开（渐进式）。
 * @param smiles     目标分子 SMILES
 * @param maxResults 最多返回多少种断键方法
 */
export async function expandOne(
  smiles: string,
  maxResults = 25,
): Promise<ExpandResult> {
  const baseUrl = process.env.PYTHON_URL || "http://127.0.0.1:5000";
  const url = `${baseUrl}/api/retro/expand-one`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ smiles, maxResults }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      if (data?.detail) detail = data.detail;
    } catch {
      // 忽略 JSON 解析错误
    }
    throw new Error(`Python 服务调用失败: ${detail}`);
  }

  return (await response.json()) as ExpandResult;
}

/**
 * 结构匹配：在候选分子中找出与 query（SMILES/SMARTS）匹配的 id。
 * @param mode substructure(子结构) | exact(精确)
 */
export async function matchRoutes(
  query: string,
  mode: "substructure" | "exact",
  candidates: { id: string; smiles: string }[],
): Promise<string[]> {
  const baseUrl = process.env.PYTHON_URL || "http://127.0.0.1:5000";
  const response = await fetch(`${baseUrl}/api/retro/match-routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode, candidates }),
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* ignore */
    }
    throw new Error(`结构匹配失败: ${detail}`);
  }
  const data = (await response.json()) as { ids: string[] };
  return data.ids ?? [];
}
