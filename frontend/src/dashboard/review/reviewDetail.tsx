"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataupSchema } from "@/types/dataup-shema";
import Viewer from "@/components/kekule-react/viewer";

interface ReviewDetail {
  id: string;
  name: string;
  uploadedBy: string;
  fullData: DataupSchema;
}

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const id = params?.id;

  useEffect(() => {
    if (!id || typeof id !== "string") {
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/review/${params.id}`)
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/review/${id}/approve`,
      { method: "POST" },
    );
    if (res.ok) {
      alert("审核通过！");
      router.push("/dashboard/review");
    }
  };

  const handleReject = async () => {
    const reason = prompt("请输入拒绝原因：");
    if (!reason) return;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/review/${id}/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
    if (res.ok) {
      alert("已拒绝");
      router.push("/dashboard/review");
    }
  };

  if (loading) return <div className="p-6">加载中...</div>;
  if (!data) return <div className="p-6">词条不存在</div>;

  const { meta, smartsPatterns, reactionSections } = data.fullData;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* 顶部信息 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{meta.name}</h1>
          <p className="text-muted-foreground">上传者：{data.uploadedBy}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleApprove} variant="default">
            通过
          </Button>
          <Button onClick={handleReject} variant="destructive">
            拒绝
          </Button>
          <Button
            onClick={() => router.push("/dashboard/review")}
            variant="outline"
          >
            返回
          </Button>
        </div>
      </div>

      {/* 元数据 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-muted-foreground">机理类型：</span>
            {meta.mechanismType}
          </div>
          <div>
            <span className="text-muted-foreground">反应形式：</span>
            {meta.form}
          </div>
          <div>
            <span className="text-muted-foreground">标签：</span>
            {meta.tags || "无"}
          </div>
        </CardContent>
      </Card>

      {/* SMARTS 模式 */}
      <Card>
        <CardHeader>
          <CardTitle>SMARTS 反应模式 ({smartsPatterns.length}个)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {smartsPatterns.map((pattern, idx) => (
            <div key={idx} className="border p-4 rounded">
              <h4 className="font-medium mb-2">{pattern.name}</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">反应物：</span>
                  {pattern.patternReactants.map((r) => r.name).join(", ") ||
                    "无"}
                </div>
                <div>
                  <span className="text-muted-foreground">试剂：</span>
                  {pattern.patternRegents.map((r) => r.name).join(", ") || "无"}
                </div>
                <div>
                  <span className="text-muted-foreground">产物：</span>
                  {pattern.patternProducts.map((r) => r.name).join(", ") ||
                    "无"}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 反应描述小节 */}
      {reactionSections.map((section, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle>{section.sectionType}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 条件 */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">温度：{section.temperature}</Badge>
              <Badge variant="outline">压力：{section.pressure}</Badge>
              <Badge variant="outline">时间：{section.duration}</Badge>
              <Badge variant="outline">浓度：{section.concentration}</Badge>
              <Badge variant="outline">溶剂：{section.solvent}</Badge>
              <Badge variant="outline">酸碱性：{section.acidityBasicity}</Badge>
            </div>

            {section.reactions.map((reaction, rIdx) => (
              <div key={rIdx} className="h-[400px] border rounded p-2">
                <Viewer value={reaction.value} className="w-full h-full" />
              </div>
            ))}

            {/* 描述 */}
            {section.descriptions.map((desc, dIdx) => (
              <div key={dIdx} className="text-sm">
                <p>{desc.description}</p>
                {desc.refPageNo && (
                  <span className="text-muted-foreground">
                    参考：{desc.refPageNo}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* 底部审核按钮（固定在底部） */}
      <div className="sticky bottom-4 flex gap-2 justify-center bg-background p-4 border rounded-lg shadow-lg">
        <Button onClick={handleApprove} variant="default" size="lg">
          ✓ 通过
        </Button>
        <Button onClick={handleReject} variant="destructive" size="lg">
          ✗ 拒绝
        </Button>
      </div>
    </div>
  );
}
