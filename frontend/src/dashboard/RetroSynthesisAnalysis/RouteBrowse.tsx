"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  listRetroRoutes,
  searchRetroRoutes,
  deleteRetroRoute,
} from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { molBlockToSmiles } from "@/lib/rdkit-wasm";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MolImg from "./MolImg";

const Composer = dynamic(() => import("@/components/kekule-react/composer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/20 animate-pulse rounded-md border text-muted-foreground">
      加载分子编辑器…
    </div>
  ),
});

interface RouteCard {
  id: string;
  targetSmiles: string;
  title: string | null;
  description: string | null;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
  stepCount: number;
  commentCount: number;
  upvotes: number;
  downvotes: number;
  score: number;
}

const fmtDate = (iso: string) => (iso ? iso.slice(0, 10) : "");

export default function RouteBrowse() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const role = ((session?.user as any)?.role ?? "").toUpperCase();
  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

  const [items, setItems] = useState<RouteCard[]>([]);
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(true);

  // 结构搜索
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMol, setSearchMol] = useState("");
  const [searchMode, setSearchMode] = useState<"substructure" | "exact">(
    "substructure",
  );
  const [searching, setSearching] = useState(false);
  const [isSearchResult, setIsSearchResult] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await listRetroRoutes({ sort, pageSize: 30, mine });
      if (res.error) {
        setMsg(res.error);
        setItems([]);
      } else {
        setItems(res.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [sort, mine]);

  useEffect(() => {
    if (!isSearchResult) load();
  }, [load, isSearchResult]);

  const doSearch = async () => {
    if (!searchMol) return;
    setSearching(true);
    setMsg(null);
    try {
      const smiles = await molBlockToSmiles(searchMol);
      if (!smiles) {
        setMsg("无法解析所绘结构");
        return;
      }
      const res = await searchRetroRoutes(smiles, searchMode, mine);
      if (res.error) {
        setMsg(res.error);
        return;
      }
      setItems(res.items ?? []);
      setIsSearchResult(true);
    } catch (e: any) {
      setMsg(`搜索失败：${e.message}`);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setIsSearchResult(false);
    setSearchOpen(false);
  };

  const del = async (id: string) => {
    if (!confirm("确定删除这条路线？此操作不可恢复。")) return;
    const res = await deleteRetroRoute(id);
    if (res.success) {
      setItems((prev) => prev.filter((r) => r.id !== id));
    } else {
      setMsg(res.error || "删除失败");
    }
  };

  return (
    <div className="w-full py-6 px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">社区逆合成路线</h1>
          <p className="text-muted-foreground text-sm">
            浏览、按结构搜索合成路线，参与评论并为每一步断键打分。
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={sort === "recent" ? "default" : "outline"}
            size="sm"
            onClick={() => setSort("recent")}
          >
            最新
          </Button>
          <Button
            variant={sort === "top" ? "default" : "outline"}
            size="sm"
            onClick={() => setSort("top")}
          >
            最高分
          </Button>
          {session && (
            <Button
              variant={mine ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setMine((v) => !v);
                setIsSearchResult(false);
              }}
            >
              只看我的
            </Button>
          )}
          <Button
            variant={searchOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setSearchOpen((v) => !v)}
          >
            结构搜索
          </Button>
          <a href="/dashboard/retrosynthesisanalysis">
            <Button size="sm">去探索</Button>
          </a>
        </div>
      </div>

      {/* 结构搜索面板 */}
      {searchOpen && (
        <div className="mb-5 rounded-xl border bg-white p-4">
          <div className="h-[340px] w-full bg-white rounded-lg border overflow-hidden">
            <Composer
              className="w-full h-full"
              exportFormat="molblock"
              onChange={(val) => setSearchMol(val)}
            />
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Select
              value={searchMode}
              onValueChange={(v: "substructure" | "exact") => setSearchMode(v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="substructure">子结构匹配</SelectItem>
                <SelectItem value="exact">精确匹配</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={doSearch} disabled={!searchMol || searching}>
              {searching ? "搜索中…" : "搜索路线"}
            </Button>
            {isSearchResult && (
              <Button variant="outline" onClick={clearSearch}>
                清除搜索
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              按目标分子结构匹配{mine ? "（仅我的）" : "社区"}路线
            </span>
          </div>
        </div>
      )}

      {msg && <p className="text-sm text-amber-600 mb-3">{msg}</p>}
      {isSearchResult && (
        <p className="text-sm text-muted-foreground mb-3">
          结构搜索结果：{items.length} 条
        </p>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-12">加载中…</p>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {isSearchResult
            ? "没有匹配该结构的路线。"
            : mine
              ? "你还没有上传过路线。"
              : "还没有已发布的路线，去探索并保存第一条吧！"}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((r) => {
            const canDelete = !!userId && (r.author?.id === userId || isAdmin);
            return (
              <div
                key={r.id}
                className="relative rounded-xl border bg-white hover:shadow-md transition-shadow overflow-hidden"
              >
                <a
                  href={`/dashboard/retrosynthesisanalysis/routes/${r.id}`}
                  className="block"
                >
                  <div className="h-[150px] flex items-center justify-center bg-gray-50 border-b p-2">
                    <MolImg smiles={r.targetSmiles} width={220} height={140} />
                  </div>
                  <div className="p-3 space-y-2">
                    <h3 className="font-medium text-sm truncate">
                      {r.title || "未命名路线"}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{r.author?.name || "匿名"}</span>
                      <span>{fmtDate(r.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="text-emerald-600">👍 {r.upvotes}</span>
                      <span className="text-rose-500">👎 {r.downvotes}</span>
                      <span>💬 {r.commentCount}</span>
                      <span className="ml-auto">{r.stepCount} 步</span>
                    </div>
                  </div>
                </a>
                {canDelete && (
                  <button
                    onClick={() => del(r.id)}
                    className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded bg-white/90 border border-rose-200 text-rose-500 hover:bg-rose-50"
                  >
                    删除
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
