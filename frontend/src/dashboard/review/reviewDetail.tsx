"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useReviewStore } from "@/store/review-store";
import { REVIEW_STATUS_CONFIG } from "./reviewTable/reviewConfig";
import { format } from "date-fns";
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
  Droplet,
  Clock,
  Activity,
  Loader2,
  FlaskConical,
  Zap,
  CalendarDays,
} from "lucide-react";
import ReactionPredictDialog from "@/src/dashboard/DataUp/ReactionPredictDialog";

interface ReviewDetail {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
  uploadedBy: string;
  fullData: DataupSchema;
}

// 与 DataUp 表单 conditionFieldsConfig 保持一致的条件字段
const CONDITION_FIELDS = [
  { field: "temperature", label: "温度", icon: Thermometer },
  { field: "solvent", label: "溶剂类型", icon: Droplets },
  { field: "duration", label: "时间", icon: Clock },
  { field: "pressure", label: "压力", icon: Activity },
  { field: "concentration", label: "浓度", icon: Atom },
  { field: "microwave", label: "微波", icon: Zap },
  { field: "acidityBasicity", label: "酸碱性", icon: FlaskConical },
  { field: "hydro", label: "水含量", icon: Droplet },
] as const;

function isValidValue(value: string | undefined | null): value is string {
  return (
    !!value &&
    value.trim() !== "" &&
    value.trim() !== "-" &&
    value.trim() !== "N/A"
  );
}

/** 单个 section 的反应条件 chips（只展示有效值），与 ReactDic 详情页风格统一 */
function ConditionChips({ section }: { section: Record<string, any> }) {
  const chips = CONDITION_FIELDS.filter((c) => isValidValue(section[c.field]));

  if (chips.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Settings2 className="w-4 h-4" />
        反应条件
      </h4>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map(({ field, label, icon: Icon }) => (
          <span
            key={field}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-xs"
          >
            <Icon className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">
              {section[field].trim()}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** 分子角色列（反应物 / 试剂 / 产物） */
function MoleculeColumn({
  title,
  molecules,
}: {
  title: string;
  molecules: { name?: string; smarts?: string }[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {molecules.length === 0 && (
        <p className="text-xs text-muted-foreground/50 italic">无</p>
      )}
      {molecules.map((mol, mIdx) => (
        <div
          key={mIdx}
          className="flex flex-col gap-1 p-3 rounded-lg border border-muted/50 bg-background shadow-sm"
        >
          <span className="font-medium text-foreground">{mol.name || "—"}</span>
          <code className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-1 rounded break-all">
            {mol.smarts || "—"}
          </code>
        </div>
      ))}
    </div>
  );
}

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("PENDING");
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [predictDialogState, setPredictDialogState] = useState<{
    open: boolean;
    patternIdx: number;
  }>({ open: false, patternIdx: 0 });
  const id = params?.id as string;

  useEffect(() => {
    if (!id) return;

    fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/review/${id}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((result) => {
        if (result && result.id) {
          setData(result);
          if (result.status) setStatus(result.status);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const result = await approveReaction(id);
      if (result.success) {
        setStatus("APPROVED");
        useReviewStore.getState().updateItem(id, { status: "APPROVED" });
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
        useReviewStore.getState().updateItem(id, { status: "REJECTED" });
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
        </div>
        <p className="text-lg font-medium text-muted-foreground animate-pulse tracking-wide">
          正在加载审核详情...
        </p>
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
  const statusInfo =
    REVIEW_STATUS_CONFIG[status] ?? REVIEW_STATUS_CONFIG.PENDING;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex-1 w-full space-y-6 pt-6 pb-32 px-6 md:px-10 lg:px-14 animate-in fade-in zoom-in-95 duration-700 ease-out">
      {/* Header */}
      <div className="space-y-5 mb-2">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/review")}
          className="text-muted-foreground hover:text-foreground pl-0 -ml-2 transition-colors duration-300"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="text-base">返回审核列表</span>
        </Button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                {meta.name}
              </h1>
              <Badge
                variant="outline"
                className={`gap-1.5 px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary uppercase tracking-widest text-xs px-2.5 py-0.5 font-semibold"
              >
                {meta.mechanismType || "未知机理"}
              </Badge>
              <Badge variant="outline" className="text-xs px-2.5 py-0.5">
                {meta.form || "未知形式"}
              </Badge>
              {meta.tags &&
                meta.tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((tag, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-muted-foreground text-xs px-2.5 py-0.5 bg-background"
                    >
                      {tag}
                    </Badge>
                  ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-4 py-2 rounded-full border shadow-sm shrink-0">
            <span className="font-medium text-foreground">上传者:</span>
            <span className="font-medium">{data.uploadedBy}</span>
            {data.createdAt && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {format(new Date(data.createdAt), "yyyy-MM-dd")}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SMARTS Patterns */}
      <Card className="shadow-md border-muted/60">
        <CardHeader className="bg-muted/20 border-b px-6 py-5">
          <CardTitle className="text-lg flex items-center gap-2 font-bold">
            <Atom className="w-5 h-5 text-primary" />
            SMARTS 反应模式 ({smartsPatterns.length}个)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {smartsPatterns.map((pattern, idx) => (
            <div key={idx} className="space-y-4">
              <div className="flex items-center justify-between gap-3 border-l-4 border-primary pl-3 bg-muted/20 py-1.5 pr-2 rounded-r-md">
                <h4 className="text-base font-semibold">
                  {pattern.name || `Pattern ${idx + 1}`}
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() =>
                    setPredictDialogState({ open: true, patternIdx: idx })
                  }
                >
                  <FlaskConical className="w-4 h-4" />
                  反应预测校验
                </Button>
              </div>

              {/* 分子角色列表 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-1">
                <MoleculeColumn
                  title="反应物"
                  molecules={pattern.patternReactants}
                />
                <MoleculeColumn
                  title="反应试剂"
                  molecules={pattern.patternRegents}
                />
                <MoleculeColumn
                  title="产物"
                  molecules={pattern.patternProducts}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reaction Predict Dialog */}
      {data && smartsPatterns.length > 0 && (
        <ReactionPredictDialog
          open={predictDialogState.open}
          onOpenChange={(open) =>
            setPredictDialogState((prev) => ({ ...prev, open }))
          }
          pattern={smartsPatterns[predictDialogState.patternIdx]}
          onValidate={() => {
            // In review mode, validation is informational only
          }}
        />
      )}

      {/* Reaction Sections */}
      {reactionSections.map((section, idx) => (
        <Card key={idx} className="shadow-md border-muted/60 overflow-hidden">
          <CardHeader className="bg-muted/20 border-b px-6 py-5">
            <CardTitle className="text-lg flex items-center gap-2 font-bold">
              <BookOpen className="w-5 h-5 text-primary/80" />
              {section.sectionType || `Section ${idx + 1}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Conditions */}
            <ConditionChips section={section} />

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
                  className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-loose text-base break-words"
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
        <AlertDialog
          onOpenChange={(open) => {
            if (!open) setRejectReason("");
          }}
        >
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
            </AlertDialogHeader>
            <Input
              placeholder="请输入拒绝原因..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-3"
            />
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
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
