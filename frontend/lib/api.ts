import { DataupSchema } from "@/types/dataup-shema";

const API_BASE =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:8000";

export async function createReaction(data: DataupSchema) {
  const res = await fetch(`${API_BASE}/api/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getReactions(params?: { status?: string }) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  const res = await fetch(`${API_BASE}/api/reactions${query}`, {
    credentials: "include",
  });
  return res.json();
}

// 审核通过
export async function approveReaction(id: string) {
  const res = await fetch(`${API_BASE}/api/review/${id}/approve`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}

// 审核拒绝
export async function rejectReaction(id: string, reason: string) {
  const res = await fetch(`${API_BASE}/api/review/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reason }),
  });
  return res.json();
}

// 更新已有反应
export async function updateReaction(id: string, data: DataupSchema) {
  const res = await fetch(`${API_BASE}/api/reactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return res.json();
}

// 删除反应
export async function deleteReaction(id: string) {
  const res = await fetch(`${API_BASE}/api/review/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

export async function searchReactDicKeyword(term: string) {
  const res = await fetch(
    `${API_BASE}/api/reactdic/search/keyword?term=${encodeURIComponent(term)}`,
    {
      credentials: "include",
    },
  );
  return res.json();
}

export async function searchReactDicStructure(
  smarts: string,
  mode: "exact" | "substructure",
) {
  const res = await fetch(`${API_BASE}/api/reactdic/search/structure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ smarts, mode }),
  });
  return res.json();
}

export async function getReactionById(id: string) {
  const res = await fetch(`${API_BASE}/api/reactdic/${id}`, {
    credentials: "include",
  });
  return res.json();
}

// ========== Browsing History ==========

export async function recordHistory(
  type: string,
  targetId: string,
  title: string,
) {
  const res = await fetch(`${API_BASE}/api/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ type, targetId, title }),
  });
  return res.json();
}

export async function getHistoryList(limit: number = 20) {
  const res = await fetch(`${API_BASE}/api/history?limit=${limit}`, {
    credentials: "include",
  });
  return res.json();
}

export async function deleteHistory(id: string) {
  const res = await fetch(`${API_BASE}/api/history/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

// ========== Analytics ==========

export async function getDashboardAnalytics() {
  const res = await fetch(`${API_BASE}/api/analytics/dashboard`, {
    credentials: "include",
  });
  return res.json();
}

