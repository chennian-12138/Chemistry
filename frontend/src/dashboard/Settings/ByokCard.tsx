"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:8000";

// ── 与后端 /api/chat/byok 的契约保持一致
interface ByokConfigured {
  configured: true;
  baseUrl: string;
  model: string;
  keyHint: string;
}
type ByokGetResponse = { configured: false } | ByokConfigured;

// 已保存的配置（API Key 永不回传明文，只有掩码 keyHint）
interface ByokConfig {
  baseUrl: string;
  model: string;
  keyHint: string;
}

// ── 卡片状态机：加载中 / 匿名 / 加载失败 / 表单（未配置或编辑中）/ 已配置摘要
type View = "loading" | "anonymous" | "error" | "form" | "summary";

export function ByokCard() {
  const [view, setView] = useState<View>("loading");
  const [config, setConfig] = useState<ByokConfig | null>(null);

  // ── 表单字段
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── 挂载时拉取当前配置；401 说明匿名，只展示登录提示
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/chat/byok`, {
          credentials: "include",
        });
        if (cancelled) return;
        if (res.status === 401) {
          setView("anonymous");
          return;
        }
        if (!res.ok) throw new Error();
        const data = (await res.json()) as ByokGetResponse;
        if (cancelled) return;
        if (data.configured) {
          setConfig({
            baseUrl: data.baseUrl,
            model: data.model,
            keyHint: data.keyHint,
          });
          setView("summary");
        } else {
          setView("form");
        }
      } catch {
        if (!cancelled) setView("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 保存并测试：后端会先实测连接再落库，耗时可达 ~10s，期间禁用整个表单
  const saveByok = async () => {
    if (!apiKey.trim()) {
      setFormError("请输入 API Key");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body: { apiKey: string; baseUrl?: string; model?: string } = {
        apiKey: apiKey.trim(),
      };
      if (baseUrl.trim()) body.baseUrl = baseUrl.trim();
      if (model.trim()) body.model = model.trim();
      const res = await fetch(`${API_BASE}/api/chat/byok`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Partial<ByokConfigured> & {
        error?: string;
      };
      if (!res.ok) {
        // 400 等失败：后端返回的 error 文案内联展示（不用 toast），表单保持可编辑
        setFormError(data.error ?? "保存失败，请稍后重试");
        return;
      }
      setConfig({
        baseUrl: data.baseUrl ?? "",
        model: data.model ?? "",
        keyHint: data.keyHint ?? "",
      });
      setApiKey("");
      setView("summary");
      // 清除聊天页的每日限额锁存，配好自有 API 后用户无需刷新即可继续对话
      localStorage.removeItem("askai-quota-limited");
      toast.success("自定义 API 已保存");
    } catch {
      setFormError("网络错误，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  // ── 删除配置：不碰 askai-quota-limited —— 没有 BYOK 后平台限额照常生效
  const deleteByok = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat/byok`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setConfig(null);
      setApiKey("");
      setBaseUrl("");
      setModel("");
      setFormError(null);
      setView("form");
      toast.success("自定义 API 配置已删除");
    } catch {
      toast.error("删除失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  };

  // ── 进入编辑：回填 Base URL 和模型；Key 不回填（后端不返回明文，需重新输入）
  const startEdit = () => {
    setApiKey("");
    setBaseUrl(config?.baseUrl ?? "");
    setModel(config?.model ?? "");
    setFormError(null);
    setView("form");
  };

  const isEdit = view === "form" && config !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">自定义 API</CardTitle>
        <CardDescription className="text-sm">
          每日 25 次平台额度用完后，自动使用你自己的 OpenAI 兼容 API
          继续对话，不限次数。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {view === "loading" && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> 加载中…
          </div>
        )}

        {view === "anonymous" && (
          <p className="py-2 text-sm text-muted-foreground">
            登录后可配置自定义 API
          </p>
        )}

        {view === "error" && (
          <p className="py-2 text-sm text-muted-foreground">
            加载失败，请刷新页面重试
          </p>
        )}

        {view === "form" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="byok-api-key">API Key</Label>
              <Input
                id="byok-api-key"
                type="password"
                autoComplete="off"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEdit ? "重新输入以更换" : "sk-..."}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="byok-base-url">Base URL</Label>
              <Input
                id="byok-base-url"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.deepseek.com"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="byok-model">模型</Label>
              <Input
                id="byok-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="如 deepseek-chat"
                disabled={saving}
              />
            </div>

            {/* PUT 失败（如连接测试未通过）的内联错误，保持表单可编辑 */}
            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="flex gap-2">
              <Button onClick={saveByok} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> 正在测试连接…
                  </>
                ) : (
                  "保存并测试"
                )}
              </Button>
              {isEdit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormError(null);
                    setView("summary");
                  }}
                  disabled={saving}
                >
                  取消
                </Button>
              )}
            </div>
          </div>
        )}

        {view === "summary" && config && (
          <div className="space-y-4">
            <div className="divide-y text-sm">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground shrink-0">API Key</span>
                <span className="font-mono truncate pl-4">{config.keyHint}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground shrink-0">Base URL</span>
                <span className="font-mono truncate pl-4">
                  {config.baseUrl || "默认"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground shrink-0">模型</span>
                <span className="font-mono truncate pl-4">
                  {config.model || "默认"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={startEdit}>
                更换配置
              </Button>
              {/* 删除沿用页面已有的 AlertDialog 确认模式 */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={deleting}
                  >
                    删除配置
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除自定义 API 配置？</AlertDialogTitle>
                    <AlertDialogDescription>
                      删除后，每日平台额度用完时将无法继续对话，直到额度重置或重新配置。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={deleteByok}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "确认删除"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
