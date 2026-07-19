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

// ========== Drafts ==========

export async function uploadDraft(
  id: string | undefined,
  name: string,
  data: DataupSchema,
) {
  const res = await fetch(`${API_BASE}/api/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id, name, data }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Status: ${res.status}`);
  }
  return res.json();
}

export async function getDraftsList() {
  const res = await fetch(`${API_BASE}/api/drafts`, {
    credentials: "include",
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Status: ${res.status}`);
  }
  return res.json();
}

export async function deleteDraftItem(id: string) {
  const res = await fetch(`${API_BASE}/api/drafts/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Status: ${res.status}`);
  }
  return res.json();
}

// ========== Papers (文献速递) ==========

export interface PaperSubfieldItem {
  id: string;
  displayNameZh: string;
}

export interface PaperAuthors {
  firstAuthor: string;
  lastAuthor: string;
  institution: string;
}

export interface Paper {
  id: string;
  openalexId: string;
  doi: string | null;
  title: string;
  abstract: string | null;
  journalName: string | null;
  jcrQuartile: string | null;
  impactFactor: number | null;
  publishedDate: string | null;
  landingPageUrl: string | null;
  authors: PaperAuthors | null;
  articleType: string | null;
  likeCount: number;
  subfields: PaperSubfieldItem[];
  liked: boolean;
  bookmarked: boolean;
}

export interface PapersListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  sort?: "date" | "likes" | "impact";
  articleType?: string; // "all" | "article" | "review"
  dateFrom?: string;    // ISO date string, e.g. "2025-01-01"
  dateTo?: string;
}

export async function getPapers(params: PapersListParams = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.sort) query.set("sort", params.sort);
  if (params.articleType && params.articleType !== "all") query.set("articleType", params.articleType);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);

  const res = await fetch(`${API_BASE}/api/papers?${query.toString()}`, {
    credentials: "include",
  });
  return res.json() as Promise<{
    success: boolean;
    data: Paper[];
    total: number;
    page: number;
    limit: number;
  }>;
}

export async function getPaperSubfields() {
  const res = await fetch(`${API_BASE}/api/papers/subfields`, {
    credentials: "include",
  });
  return res.json() as Promise<{
    success: boolean;
    data: { id: string; displayName: string; displayNameZh: string }[];
  }>;
}

export async function getBookmarkedPapers(page = 1, limit = 20) {
  const res = await fetch(
    `${API_BASE}/api/papers/bookmarks?page=${page}&limit=${limit}`,
    { credentials: "include" },
  );
  return res.json() as Promise<{
    success: boolean;
    data: Paper[];
    total: number;
    page: number;
    limit: number;
  }>;
}

export async function togglePaperLike(paperId: string) {
  const res = await fetch(`${API_BASE}/api/papers/${paperId}/like`, {
    method: "POST",
    credentials: "include",
  });
  return res.json() as Promise<{ success: boolean; liked: boolean }>;
}

export async function togglePaperBookmark(paperId: string) {
  const res = await fetch(`${API_BASE}/api/papers/${paperId}/bookmark`, {
    method: "POST",
    credentials: "include",
  });
  return res.json() as Promise<{ success: boolean; bookmarked: boolean }>;
}

// 仅 SUPERADMIN：手动触发一次增量爬取（调试用）
export async function triggerDailyFetch() {
  const res = await fetch(`${API_BASE}/api/papers/trigger-daily`, {
    method: "POST",
    credentials: "include",
  });
  return res.json() as Promise<{
    success?: boolean;
    status?: string;
    message?: string;
    error?: string;
  }>;
}

export interface AccountStats {
  reactionStatus: { name: string; value: number }[];
  totals: { reactions: number; approved: number; drafts: number; history: number };
  historyByType: { name: string; value: number }[];
  activity: { name: string; clicks: number }[];
}

export async function getAccountStats(): Promise<{
  success: boolean;
  data?: AccountStats;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/account/stats`, {
    credentials: "include",
  });
  return res.json();
}

// 改邮箱：发送验证码到新邮箱
export async function sendChangeEmailOtp(newEmail: string) {
  const res = await fetch(`${API_BASE}/api/account/change-email/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ newEmail }),
  });
  return res.json();
}

// 改邮箱：校验验证码并落地
export async function verifyChangeEmailOtp(otp: string) {
  const res = await fetch(`${API_BASE}/api/account/change-email/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ otp }),
  });
  return res.json();
}
