"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 数据审查仅 ADMIN/SUPERADMIN 可见；列表页与详情页共用此守卫
export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending) {
      const user = session?.user as unknown as { role?: string };
      const role = user?.role?.toLowerCase();
      if (!session || (role !== "admin" && role !== "superadmin")) {
        router.push("/dashboard");
      }
    }
  }, [session, isPending, router]);

  if (isPending || !session) {
    return <div>Loading...</div>; // Or a better loading state
  }

  const user = session?.user as unknown as { role?: string };
  const role = user?.role?.toLowerCase();
  if (role !== "admin" && role !== "superadmin") {
    return null;
  }

  return <>{children}</>;
}
