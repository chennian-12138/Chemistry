"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getRetroRoute,
  rateRetroStep,
  addRetroComment,
  deleteRetroRoute,
  deleteRetroComment,
} from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useRecordHistory } from "@/hooks/use-record-history";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import MolImg from "./MolImg";
import RouteGraph from "./RouteGraph";

// 统一日期显示：YYYY-MM-DD HH:mm（无时间信息时退化为 YYYY-MM-DD）
const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  const t = iso.slice(11, 16);
  return t ? `${d} ${t}` : d;
};

interface Step {
  id: string;
  parentStepId: string | null;
  productSmiles: string;
  precursors: string[];
  templateId: string | null;
  templateName: string | null;
  templateSmarts: string | null;
  reactionId: string | null;
  depth: number;
  upvotes: number;
  downvotes: number;
  score: number;
  myVote: number;
}

interface Comment {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
}

interface RouteDetailData {
  id: string;
  targetSmiles: string;
  title: string | null;
  description: string | null;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
  steps: Step[];
  comments: Comment[];
}

export default function RouteDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: session } = useSession();
  const { requireAuth, loginPrompt } = useRequireAuth();
  const { record, registrationWall } = useRecordHistory();
  const userId = session?.user?.id;
  const role = ((session?.user as any)?.role ?? "").toUpperCase();
  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

  const [route, setRoute] = useState<RouteDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRetroRoute(id);
      if (res?.error || !res?.id) {
        setNotFound(true);
        return;
      }
      // precursors 是 JSON，运行时为 string[]
      res.steps = (res.steps ?? []).map((s: any) => ({
        ...s,
        precursors: Array.isArray(s.precursors) ? s.precursors : [],
      }));
      setRoute(res);

      // 记入浏览历史（侧边栏 RETRO_SYNTHESIS，targetId 用 routes/<id> 以拼出详情页链接）
      const histTitle = res.title || "逆合成路线";
      void record("RETRO_SYNTHESIS", `routes/${id}`, histTitle);
    } finally {
      setLoading(false);
    }
  }, [id, record]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  // ---------- 单步打分 ----------
  const vote = async (stepId: string, target: 1 | -1) => {
    if (!requireAuth()) return;
    const step = route?.steps.find((s) => s.id === stepId);
    if (!step) return;
    const value = step.myVote === target ? 0 : target;
    const res = await rateRetroStep(step.id, value);
    if (!res.success) {
      setMsg(res.error || "打分失败（请先登录）");
      return;
    }
    setRoute((prev) =>
      prev
        ? {
            ...prev,
            steps: prev.steps.map((s) =>
              s.id === step.id
                ? {
                    ...s,
                    upvotes: res.upvotes,
                    downvotes: res.downvotes,
                    score: res.score,
                    myVote: res.myVote,
                  }
                : s,
            ),
          }
        : prev,
    );
  };

  // ---------- 评论 ----------
  const submitComment = async (content: string, parentId?: string) => {
    if (!requireAuth()) return;
    if (!content.trim()) return;
    const res = await addRetroComment(id, content.trim(), parentId);
    if (!res.success) {
      setMsg(res.error || "评论失败（请先登录）");
      return;
    }
    setRoute((prev) =>
      prev ? { ...prev, comments: [...prev.comments, res.comment] } : prev,
    );
    if (parentId) {
      setReplyText("");
      setReplyTo(null);
    } else {
      setCommentText("");
    }
  };

  // ---------- 删除路线（作者 / 管理员） ----------
  const canManageRoute =
    !!userId && (route?.author?.id === userId || isAdmin);

  const delRoute = async () => {
    if (!confirm("确定删除这条路线？此操作不可恢复。")) return;
    const res = await deleteRetroRoute(id);
    if (res.success) {
      router.push("/dashboard/retrosynthesisanalysis/routes");
    } else {
      setMsg(res.error || "删除失败");
    }
  };

  // ---------- 删除评论（作者 / 管理员） ----------
  const delComment = async (commentId: string) => {
    if (!confirm("确定删除这条评论？")) return;
    const res = await deleteRetroComment(commentId);
    if (res.success) {
      setRoute((prev) =>
        prev
          ? {
              ...prev,
              comments: prev.comments.filter(
                (c) => c.id !== commentId && c.parentId !== commentId,
              ),
            }
          : prev,
      );
    } else {
      setMsg(res.error || "删除失败");
    }
  };

  const canManageComment = (c: Comment) =>
    !!userId && (c.user?.id === userId || isAdmin);

  // 路线涉及的单步反应（去重，用于右侧抽屉跳转反应介绍页）
  const stepReactions = useMemo(() => {
    const seen = new Set<string>();
    const list: { name: string; reactionId: string | null; product: string }[] =
      [];
    for (const s of route?.steps ?? []) {
      const key = s.templateName || s.templateId || s.id;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        name: s.templateName || s.templateId || "未命名反应",
        reactionId: s.reactionId,
        product: s.productSmiles,
      });
    }
    return list;
  }, [route?.steps]);

  const { topComments, repliesByParent } = useMemo(() => {
    const top: Comment[] = [];
    const byParent: Record<string, Comment[]> = {};
    for (const c of route?.comments ?? []) {
      if (c.parentId) (byParent[c.parentId] ??= []).push(c);
      else top.push(c);
    }
    return { topComments: top, repliesByParent: byParent };
  }, [route?.comments]);

  if (loading) return <p className="text-center text-muted-foreground py-12">加载中…</p>;
  if (notFound || !route)
    return <p className="text-center text-muted-foreground py-12">路线不存在或未公开。</p>;

  return (
    <div className="w-full py-6 px-6 space-y-6">
      {loginPrompt}
      {registrationWall}
      {/* 头部 */}
      <div className="flex items-start gap-4">
        <div className="w-[200px] h-[150px] flex items-center justify-center bg-gray-50 rounded-lg border shrink-0">
          <MolImg smiles={route.targetSmiles} width={190} height={140} />
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {route.title || "未命名路线"}
          </h1>
          <p className="text-sm text-muted-foreground">
            由 {route.author?.name || "匿名"} 发布 · {fmtDateTime(route.createdAt)}{" "}
            · {route.steps.length} 步
          </p>
          {route.description && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {route.description}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <a href="/dashboard/retrosynthesisanalysis/routes">
              <Button variant="outline" size="sm">
                返回列表
              </Button>
            </a>

            {/* 右侧抽屉：涉及的单步反应，跳转反应介绍页 */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  涉及的反应（{stepReactions.length}）
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[380px] sm:w-[420px]">
                <SheetHeader>
                  <SheetTitle>本路线涉及的单步反应</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2 overflow-y-auto pr-1">
                  {stepReactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      暂无可识别的反应模板。
                    </p>
                  ) : (
                    stepReactions.map((rxn, i) => (
                      <div
                        key={i}
                        className="rounded-lg border p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {rxn.name}
                          </p>
                          <p
                            className="text-[11px] text-gray-400 font-mono truncate"
                            title={rxn.product}
                          >
                            {rxn.product}
                          </p>
                        </div>
                        {rxn.reactionId ? (
                          <a
                            href={`/dashboard/reactdic/${rxn.reactionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                          >
                            <Button size="sm" variant="outline">
                              反应介绍 ↗
                            </Button>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0">
                            暂无介绍
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {canManageRoute && (
              <Button variant="destructive" size="sm" onClick={delRoute}>
                删除路线
              </Button>
            )}
          </div>
        </div>
      </div>

      {msg && <p className="text-sm text-amber-600">{msg}</p>}

      {/* 完整反应路线图（起始原料 → 最终产物，反应节点可打分） */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">反应路线图</h2>
        <p className="text-xs text-muted-foreground">
          从左侧起始原料到右侧最终产物；点击每个反应上的 👍/👎 为该步断键打分。
        </p>
        <RouteGraph
          steps={route.steps}
          targetSmiles={route.targetSmiles}
          onVote={vote}
        />
      </div>

      {/* 评论 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          评论（{route.comments.length}）
        </h2>

        {/* 发表评论 */}
        <div className="flex gap-2">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={2}
            placeholder="对这条路线说点什么…"
            className="flex-1 border rounded-md px-3 py-2 text-sm resize-none"
          />
          <Button onClick={() => submitComment(commentText)}>发表</Button>
        </div>

        {/* 评论列表 */}
        <div className="space-y-4">
          {topComments.map((c) => (
            <div key={c.id} className="space-y-2">
              <div className="rounded-lg border bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {c.user?.name || "匿名"}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {fmtDateTime(c.createdAt)}
                    </span>
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      className="text-xs text-muted-foreground hover:text-indigo-600"
                      onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                    >
                      回复
                    </button>
                    {canManageComment(c) && (
                      <button
                        className="text-xs text-muted-foreground hover:text-rose-500"
                        onClick={() => delComment(c.id)}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                  {c.content}
                </p>
              </div>

              {/* 回复框 */}
              {replyTo === c.id && (
                <div className="flex gap-2 pl-6">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={1}
                    placeholder="回复…"
                    className="flex-1 border rounded-md px-3 py-1.5 text-sm resize-none"
                  />
                  <Button size="sm" onClick={() => submitComment(replyText, c.id)}>
                    回复
                  </Button>
                </div>
              )}

              {/* 子回复 */}
              {(repliesByParent[c.id] ?? []).map((r) => (
                <div key={r.id} className="ml-6 rounded-lg border bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {r.user?.name || "匿名"}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {fmtDateTime(r.createdAt)}
                      </span>
                    </span>
                    {canManageComment(r) && (
                      <button
                        className="text-xs text-muted-foreground hover:text-rose-500"
                        onClick={() => delComment(r.id)}
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                    {r.content}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
