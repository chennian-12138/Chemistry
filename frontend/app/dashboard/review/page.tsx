"use client";

import ReviewPage from "@/src/dashboard/review/reviewTable/reviewTable";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Review() {
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

  return (
    <div>
      <ReviewPage />
    </div>
  );
}
