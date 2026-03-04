"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { DataupSchema } from "@/types/dataup-shema";
import Viewer from "@/components/kekule-react/viewer";
import DOMPurify from "dompurify";
import { approveReaction, rejectReaction } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Atom,
  Beaker,
  BookOpen,
  Settings2,
  Thermometer,
  Droplets,
  Clock,
  Activity,
} from "lucide-react";

interface ReviewDetail {
  id: string;
  name: string;
  uploadedBy: string;
  fullData: DataupSchema;
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "待审核", variant: "secondary" },
  APPROVED: { label: "已通过", variant: "default" },
  REJECTED: { label: "已拒绝", variant: "destructive" },
};

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("PENDING");
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const id = params?.id as string;

  useEffect(() => {
    if (!id) return;

    fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/review/${id}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        // 尝试从列表 API 获取当前状态
        fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/review/list`, {
          credentials: "include",
        })
          .then((res) => res.json())
          .then((list) => {
            const item = list.find?.((i: any) => i.id === id);
            if (item) setStatus(item.status);
          })
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const result = await approveReaction(id);
      if (result.success) {
        setStatus("APPROVED");
        toast.success("审核通过！", { position: "top-center" });
      } else {
        toast.error("操作失败", { position: "top-center" });
      }
    } catch {
      toast.error("操作失败，请检查网络", { position: "top-center" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("请输入拒绝原因", { position: "top-center" });
      return;
    }
    setActionLoading(true);
    try {
      const result = await rejectReaction(id, rejectReason.trim());
      if (result.success) {
        setStatus("REJECTED");
        setRejectReason("");
        toast.success("已拒绝", { position: "top-center" });
      } else {
        toast.error("操作失败", { position: "top-center" });
      }
    } catch {
      toast.error("操作失败，请检查网络", { position: "top-center" });
    } finally {
      setActionLoading(false);
    }
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="p-8 md:p-12 space-y-8 max-w-6xl mx-auto animate-pulse">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-14 w-2/3" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  // --- Not Found ---
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-muted/30 p-8 rounded-full mb-6">
          <Beaker className="w-16 h-16 text-muted-foreground opacity-60" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-3">词条不存在</h2>
        <p className="text-muted-foreground text-lg mb-10">
          该词条可能已被删除或您无权查看。
        </p>
        <Button
          onClick={() => router.push("/dashboard/review")}
          size="lg"
          className="px-8 shadow-md"
        >
          <ArrowLeft className="w-5 h-5 mr-3" />
          返回列表
        </Button>
      </div>
    );
  }

  const { meta, smartsPatterns, reactionSections } = data.fullData;
  const statusInfo = statusConfig[status] || statusConfig.PENDING;

  // 条件渲染辅助
  const renderCondition = (
    icon: React.ReactNode,
    label: string,
    value: string | undefined,
  ) => {
    if (!value || value.trim() === "-" || value.trim() === "") return null;
    return (
      <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/30 border border-muted/50 transition-colors hover:bg-muted/50">
        <span className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          {icon} {label}
        </span>
        <span className="font-semibold text-foreground pl-6 text-base">
          {value}
        </span>
      </div>
    );
  };

  return (
    <div className="flex-1 w-full space-y-8 pt-8 pb-32 px-6 md:px-12 max-w-[1200px] mx-auto animate-in fade-in zoom-in-95 duration-700 ease-out">
      {/* Header */}
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/review")}
          className="text-muted-foreground hover:text-foreground pl-0 -ml-2 transition-colors duration-300"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="text-base">返回审核列表</span>
        </Button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                {meta.name}
              </h1>
              <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary uppercase tracking-widest text-xs px-3 py-1 font-semibold"
              >
                {meta.mechanismType || "未知机理"}
              </Badge>
              <Badge variant="outline" className="text-xs px-3 py-1">
                {meta.form || "未知形式"}
              </Badge>
              {meta.tags && (
                <Badge
                  variant="outline"
                  className="text-muted-foreground text-xs px-3 py-1 bg-background"
                >
                  {meta.tags}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/40 px-5 py-2.5 rounded-full border shadow-sm shrink-0">
            <span className="font-medium text-foreground">上传者:</span>
            <span className="font-medium">{data.uploadedBy}</span>
          </div>
        </div>
      </div>

      {/* SMARTS Patterns */}
      <Card className="shadow-md border-muted/60">
        <CardHeader className="bg-muted/10 border-b px-6 py-5">
          <CardTitle className="text-xl flex items-center gap-2">
            <Atom className="w-5 h-5 text-primary" />
            SMARTS 反应模式 ({smartsPatterns.length}个)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {smartsPatterns.map((pattern, idx) => (
            <div key={idx} className="space-y-4">
              <h4 className="text-base font-semibold border-l-4 border-primary pl-3 bg-muted/20 py-1.5 pr-2 rounded-r-md">
                {pattern.name || `Pattern ${idx + 1}`}
              </h4>

              {/* 分子角色列表 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-1">
                {/* 反应物 */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    反应物
                  </p>
                  {pattern.patternReactants.map((mol, mIdx) => (
                    <div
                      key={mIdx}
                      className="flex flex-col gap-1 p-3 rounded-lg border border-muted/50 bg-background shadow-sm"
                    >
                      <span className="font-medium text-foreground">
                        {mol.name || "—"}
                      </span>
                      <code className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-1 rounded break-all">
                        {mol.smarts || "—"}
                      </code>
                    </div>
                  ))}
                </div>

                {/* 试剂 */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    反应试剂
                  </p>
                  {pattern.patternRegents.map((mol, mIdx) => (
                    <div
                      key={mIdx}
                      className="flex flex-col gap-1 p-3 rounded-lg border border-muted/50 bg-background shadow-sm"
                    >
                      <span className="font-medium text-foreground">
                        {mol.name || "—"}
                      </span>
                      <code className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-1 rounded break-all">
                        {mol.smarts || "—"}
                      </code>
                    </div>
                  ))}
                </div>

                {/* 产物 */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    产物
                  </p>
                  {pattern.patternProducts.map((mol, mIdx) => (
                    <div
                      key={mIdx}
                      className="flex flex-col gap-1 p-3 rounded-lg border border-muted/50 bg-background shadow-sm"
                    >
                      <span className="font-medium text-foreground">
                        {mol.name || "—"}
                      </span>
                      <code className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-1 rounded break-all">
                        {mol.smarts || "—"}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reaction Sections */}
      {reactionSections.map((section, idx) => (
        <Card key={idx} className="shadow-md border-muted/60 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b px-6 py-5">
            <CardTitle className="text-xl flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary/80" />
              {section.sectionType || `Section ${idx + 1}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Conditions */}
            {(() => {
              const conditions = [
                renderCondition(
                  <Thermometer className="w-4 h-4 text-orange-500" />,
                  "温度",
                  section.temperature,
                ),
                renderCondition(
                  <Activity className="w-4 h-4 text-purple-500" />,
                  "压力",
                  section.pressure,
                ),
                renderCondition(
                  <Clock className="w-4 h-4 text-green-500" />,
                  "时间",
                  section.duration,
                ),
                renderCondition(
                  <Atom className="w-4 h-4 text-indigo-500" />,
                  "浓度",
                  section.concentration,
                ),
                renderCondition(
                  <Droplets className="w-4 h-4 text-blue-500" />,
                  "溶剂",
                  section.solvent,
                ),
                renderCondition(
                  <Beaker className="w-4 h-4 text-pink-500" />,
                  "酸碱性",
                  section.acidityBasicity,
                ),
              ].filter(Boolean);

              if (conditions.length === 0) return null;

              return (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    反应条件
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {conditions}
                  </div>
                </div>
              );
            })()}

            {/* Reaction Viewer */}
            {section.reactions.map((reaction, rIdx) => (
              <div
                key={rIdx}
                className="rounded-xl border border-muted/50 overflow-hidden bg-dot-pattern dark:bg-zinc-950/80"
              >
                <div className="w-full h-[400px] relative flex items-center justify-center">
                  {reaction.value ? (
                    <Viewer value={reaction.value} className="w-full h-full" />
                  ) : (
                    <div className="text-muted-foreground flex flex-col items-center">
                      <Beaker className="w-12 h-12 opacity-20 mb-4" />
                      <span className="text-lg">无结构示意图</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Descriptions */}
            {section.descriptions.map((desc, dIdx) => (
              <div
                key={dIdx}
                className="text-muted-foreground leading-loose text-base bg-muted/20 p-5 rounded-xl border border-transparent transition-colors hover:border-border/60 hover:bg-muted/30"
              >
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-loose text-base"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(desc.description),
                  }}
                />
                {desc.refPageNo && (
                  <div className="mt-4 text-sm font-mono text-primary/80 bg-primary/5 inline-block px-3 py-1 rounded-md">
                    参考：{desc.refPageNo}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Sticky Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background/95 backdrop-blur-sm p-4 border rounded-2xl shadow-2xl">
        {/* Approve */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="default"
              size="lg"
              disabled={actionLoading}
              className="gap-2 px-6 shadow-md"
            >
              <CheckCircle2 className="w-5 h-5" />
              通过
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认通过审核？</AlertDialogTitle>
              <AlertDialogDescription>
                词条「{meta.name}」将被标记为已通过。
                {status === "APPROVED" && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    ⚠️ 该词条当前状态已经是「已通过」
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleApprove}>
                确认通过
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="lg"
              disabled={actionLoading}
              className="gap-2 px-6 shadow-md"
            >
              <XCircle className="w-5 h-5" />
              拒绝
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>拒绝该词条？</AlertDialogTitle>
              <AlertDialogDescription>
                请输入拒绝原因，该原因将反馈给上传者。
              </AlertDialogDescription>
              <Input
                placeholder="请输入拒绝原因..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-3"
              />
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                variant="outline"
                onClick={() => setRejectReason("")}
              >
                取消
              </AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleReject}>
                确认拒绝
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Back */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.push("/dashboard/review")}
          className="gap-2 px-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </Button>
      </div>
    </div>
  );
}
