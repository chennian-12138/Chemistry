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

export async function searchReactDicStructure(molBlocks: string[]) {
  const res = await fetch(`${API_BASE}/api/reactdic/search/structure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ molBlocks }),
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

// ========== AI Chat 会话 ==========

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  createdAt?: string;
}

export interface ConversationDetail extends ConversationSummary {
  userId: string;
  messages: ConversationMessage[];
}

export async function getConversations(): Promise<{
  success: boolean;
  data: ConversationSummary[];
}> {
  const res = await fetch(`${API_BASE}/api/chat/conversations`, {
    credentials: "include",
  });
  return res.json();
}

export async function getConversation(id: string): Promise<{
  success: boolean;
  data?: ConversationDetail;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/chat/conversations/${id}`, {
    credentials: "include",
  });
  return res.json();
}

export async function deleteConversation(id: string) {
  const res = await fetch(`${API_BASE}/api/chat/conversations/${id}`, {
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

// 4 大主功能对应的 BrowsingHistory.type
export type FeatureType = "AI_CHAT" | "RETRO_SYNTHESIS" | "REACTDIC" | "PAPER";

export interface AccountStats {
  // 每个功能一张指标卡：累计总量 + 近 30 天增量
  features: { type: FeatureType; total: number; recent: number }[];
  // 近 6 个月使用趋势，每月一行、各功能一列（键为 FeatureType）
  trend: ({ name: string } & Record<FeatureType, number>)[];
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

// ==================== 逆合成分析 ====================

export interface RetroPrecursorSet {
  templateId: string;
  templateName: string;
  templateSmarts: string;
  precursors: string[];
  reactionId?: string | null;
}

export interface RetroExpandResult {
  success: boolean;
  target: string;
  precursorSets: RetroPrecursorSet[];
  count: number;
  error?: string;
}

// 渐进式展开：对单个分子做一步逆合成
export async function retroExpand(
  smiles: string,
  maxResults = 25,
): Promise<RetroExpandResult> {
  const res = await fetch(`${API_BASE}/api/retro/expand`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ smiles, maxResults }),
  });
  return res.json();
}

export interface SaveRouteStep {
  productSmiles: string;
  precursors: string[];
  templateId?: string;
  templateName?: string;
  templateSmarts?: string;
  depth: number;
  parentIndex: number | null;
}

// 保存一条完整路线
export async function saveRetroRoute(data: {
  targetSmiles: string;
  title?: string;
  description?: string;
  isPublic?: boolean;
  steps: SaveRouteStep[];
}) {
  const res = await fetch(`${API_BASE}/api/retro/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return res.json();
}

// 博客式浏览：路线列表
export async function listRetroRoutes(params?: {
  page?: number;
  pageSize?: number;
  sort?: "recent" | "top";
  withinDays?: number;
  mine?: boolean;
}) {
  const query = params
    ? `?${new URLSearchParams(
        Object.entries(params).reduce(
          (acc, [k, v]) => {
            if (v != null) acc[k] = String(v);
            return acc;
          },
          {} as Record<string, string>,
        ),
      ).toString()}`
    : "";
  const res = await fetch(`${API_BASE}/api/retro/routes${query}`, {
    credentials: "include",
  });
  return res.json();
}

// 结构搜索社区路线（按目标分子子结构/精确匹配）
export async function searchRetroRoutes(
  query: string,
  mode: "substructure" | "exact",
  mine = false,
) {
  const res = await fetch(`${API_BASE}/api/retro/routes/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ query, mode, mine }),
  });
  return res.json();
}

// 路线详情
export async function getRetroRoute(id: string) {
  const res = await fetch(`${API_BASE}/api/retro/routes/${id}`, {
    credentials: "include",
  });
  return res.json();
}

// 删除路线
export async function deleteRetroRoute(id: string) {
  const res = await fetch(`${API_BASE}/api/retro/routes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

// 单步打分：value 为 1(👍) / -1(👎) / 0(撤销)
export async function rateRetroStep(stepId: string, value: 1 | -1 | 0) {
  const res = await fetch(`${API_BASE}/api/retro/steps/${stepId}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ value }),
  });
  return res.json();
}

// 添加路线评论
export async function addRetroComment(
  routeId: string,
  content: string,
  parentId?: string,
) {
  const res = await fetch(`${API_BASE}/api/retro/routes/${routeId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content, parentId }),
  });
  return res.json();
}

// 删除评论
export async function deleteRetroComment(id: string) {
  const res = await fetch(`${API_BASE}/api/retro/comments/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

// ========== 管理后台（ADMIN / SUPERADMIN） ==========

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  roleName: string;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  emailVerified: boolean;
  hasLlmConfig: boolean;
  llmModel: string | null;
  stats: {
    reactions: number;
    conversations: number;
    paperLikes: number;
    paperBookmarks: number;
  };
}

export interface AdminUserListResult {
  success: boolean;
  data?: {
    users: AdminUser[];
    total: number;
    page: number;
    pageSize: number;
  };
  error?: string;
}

// 用户列表
export async function getAdminUsers(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  banned?: string;
}): Promise<AdminUserListResult> {
  const query = params
    ? `?${new URLSearchParams(
        Object.entries(params).reduce(
          (acc, [k, v]) => {
            if (v != null && v !== "") acc[k] = String(v);
            return acc;
          },
          {} as Record<string, string>,
        ),
      ).toString()}`
    : "";
  const res = await fetch(`${API_BASE}/api/admin/users${query}`, {
    credentials: "include",
  });
  return res.json();
}

// 修改用户角色（仅 SUPERADMIN）
export async function updateAdminUserRole(id: string, role: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  return res.json();
}

// 封禁用户
export async function banAdminUser(
  id: string,
  reason?: string,
  banExpires?: string,
) {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reason, banExpires }),
  });
  return res.json();
}

// 解封用户
export async function unbanAdminUser(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}/unban`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}

// 用户使用统计（管理员视角）
export async function getAdminUserStats(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}/stats`, {
    credentials: "include",
  });
  return res.json();
}

// 管理仪表盘概览
export async function getAdminOverview() {
  const res = await fetch(`${API_BASE}/api/admin/overview`, {
    credentials: "include",
  });
  return res.json();
}

// 审核统计（管理员看板）
export async function getReviewStats() {
  const res = await fetch(`${API_BASE}/api/review/stats`, {
    credentials: "include",
  });
  return res.json();
}
