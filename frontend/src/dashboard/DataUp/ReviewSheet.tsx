"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import DataCard from "@/components/commonUI/DataCard";
import { DataupSchema } from "@/types/dataup-shema";
import { useDataUpActions } from "@/hooks/use-dataup-action";

interface Entry {
  id: string;
  name: string;
  reviewed: boolean;
  uploadedBy: string;
  rejectReason?: string;
  // 完整数据，点击后注入到 DataUp
  fullData: DataupSchema;
}

export default function ReviewSheet({
  triggerButton,
}: {
  triggerButton: React.ReactNode;
}) {
  const { actions } = useDataUpActions();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 加载未审查词条
  useEffect(() => {
    if (!open) return;
    fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/review/rejected`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  const handleCardClick = (entry: Entry) => {
    if (actions.isAvailable) {
      actions.loadData({
        ...entry.fullData,
        id: entry.id,
        reviewInfo: {
          ...entry.fullData.reviewInfo,
          rejectionReason: entry.rejectReason,
        },
      });
      setOpen(false);
      toast.info("已加载待修改反应", {
        position: "top-center",
      });
    } else {
      alert("无法加载");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{triggerButton}</SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>待修改词条</SheetTitle>
        </SheetHeader>

        <div className="mt-4 mr-1 ml-1 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {entries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">没有待修改的词条</p>
          ) : (
            entries.map((entry) => (
              <DataCard
                key={entry.id}
                id={entry.id}
                name={entry.name}
                reviewstatus={entry.reviewed}
                uploadBy={entry.uploadedBy}
                rejectReason={entry.rejectReason}
                onClick={() => handleCardClick(entry)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
