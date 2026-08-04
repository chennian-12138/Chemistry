"use client";

import { useRouter } from "next/navigation";
import { CloudUpload, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import DataUp from "./DataUp";

export default function DataUpGate() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-muted/30 p-8 rounded-full mb-6">
          <CloudUpload className="w-16 h-16 text-muted-foreground opacity-60" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-3">
          登录后使用数据上传
        </h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-md">
          反应数据上传仅面向注册用户，登录后即可上传与维护反应数据。
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push("/signin")}
            size="lg"
            className="px-8 shadow-md"
          >
            登录
          </Button>
          <Button
            onClick={() => router.push("/signup")}
            size="lg"
            variant="outline"
            className="px-8"
          >
            注册
          </Button>
        </div>
      </div>
    );
  }

  const role = (session?.user as unknown as { role?: string } | undefined)
    ?.role?.toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin";

  // 已登录但非管理员：页面本身不对其开放（侧边栏入口已同步隐藏，这里挡直接访问）
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-muted/30 p-8 rounded-full mb-6">
          <ShieldX className="w-16 h-16 text-muted-foreground opacity-60" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-3">
          数据上传仅面向管理员
        </h2>
        <p className="text-muted-foreground text-lg max-w-md">
          当前账号暂无数据上传权限，如需开通请联系管理员。
        </p>
      </div>
    );
  }

  return <DataUp />;
}
