"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 管理后台仅 ADMIN/SUPERADMIN 可见；所有子页面共用此守卫
export default function AdminLayout({
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
    return <div>Loading...</div>;
  }

  const user = session?.user as unknown as { role?: string };
  const role = user?.role?.toLowerCase();
  if (role !== "admin" && role !== "superadmin") {
    return null;
  }

  return <>{children}</>;
}
