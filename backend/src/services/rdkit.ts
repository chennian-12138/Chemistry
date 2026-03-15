
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
  const baseUrl = process.env.PYTHON_URL || "http://127.0.0.1:5000";
  const url = `${baseUrl}/api/match-smarts`;
  const body = { smarts, molBlock };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorDetail = errorData.detail;
      }
    } catch (e) {
      // Ignore JSON parse error if invalid json response
    }
    throw new Error(`Python 服务调用失败: ${errorDetail}`);
  }

  const result = await response.json();
  return result as MatchResult;
}

export interface PredictResult {
  productSets: string[][];
  error?: string;
}

export async function predictProducts(
  reactionSmarts: string,
  smilesList: string[],
): Promise<PredictResult> {
  const baseUrl = process.env.PYTHON_URL || "http://127.0.0.1:5000";
  const url = `${baseUrl}/api/predict-products`;
  const body = { reactionSmarts, smilesList };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorDetail = errorData.detail;
      }
    } catch (e) {
      // Ignore JSON parse error
    }
    throw new Error(`Python 服务调用失败: ${errorDetail}`);
  }

  const result = await response.json();
  return result as PredictResult;
}
