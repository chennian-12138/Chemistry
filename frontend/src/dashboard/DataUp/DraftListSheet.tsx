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
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Trash2, Cloud } from "lucide-react";
import { getDraftsList, deleteDraftItem } from "@/lib/api";

export interface DraftEntry {
  draftId: string;
  name: string;
  updatedAt: number;
  fullData: DataupSchema;
  isDb?: boolean;
}

export default function DraftListSheet({
  triggerButton,
}: {
  triggerButton: React.ReactNode;
}) {
  const { actions } = useDataUpActions();
  const { data: session } = useSession();
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [open, setOpen] = useState(false);

  const storageKey = session?.user?.id
    ? `dataup_draft_history_${session.user.id}`
    : "dataup_draft_history_default";

  useEffect(() => {
    if (open) {
      let localDrafts: DraftEntry[] = [];
      const draftsStr = localStorage.getItem(storageKey);
      if (draftsStr) {
        try {
          localDrafts = JSON.parse(draftsStr) as DraftEntry[];
        } catch (e) {
          console.error("Failed to load drafts", e);
        }
      }

      getDraftsList()
        .then((dbData) => {
          let dbDrafts: DraftEntry[] = [];
          if (Array.isArray(dbData)) {
            dbDrafts = dbData.map((d: any) => ({
              draftId: d.id,
              name: d.name,
              updatedAt: new Date(d.updatedAt).getTime(),
              fullData: d.data,
              isDb: true,
            }));
          }

          const mergedMap = new Map<string, DraftEntry>();
          for (const d of [...localDrafts, ...dbDrafts]) {
            const existing = mergedMap.get(d.name);
            if (!existing || d.updatedAt > existing.updatedAt) {
              mergedMap.set(d.name, d);
            }
          }
          const merged = Array.from(mergedMap.values());
          merged.sort((a, b) => b.updatedAt - a.updatedAt);
          setEntries(merged);
        })
        .catch((e) => {
          console.error("Failed fetching db drafts", e);
          localDrafts.sort((a, b) => b.updatedAt - a.updatedAt);
          setEntries(localDrafts);
        });
    }
  }, [open, storageKey]);

  const handleCardClick = (entry: DraftEntry) => {
    if (actions.isAvailable) {
      actions.loadData(entry.fullData);
      setOpen(false);
      toast.success(`已加载草稿: ${entry.name}`, {
        position: "top-center",
      });
    } else {
      toast.error("无法加载草稿，功能不可用");
    }
  };

  const handleDeleteDraft = async (entry: DraftEntry, e: React.MouseEvent) => {
    e.stopPropagation();

    if (entry.isDb) {
      try {
        await deleteDraftItem(entry.draftId);
      } catch (e) {
        toast.error("删除云端草稿失败");
      }
    }

    // Always clean from local if it exists
    const draftsStr = localStorage.getItem(storageKey);
    if (draftsStr) {
      let localDrafts = JSON.parse(draftsStr) as DraftEntry[];
      localDrafts = localDrafts.filter((d) => d.name !== entry.name);
      localStorage.setItem(storageKey, JSON.stringify(localDrafts));
    }

    const newDrafts = entries.filter((d) => d.name !== entry.name);
    setEntries(newDrafts);
    toast.success("已删除该草稿");
  };

  const handleClearAll = () => {
    if (confirm("确认清空所有草稿？这无法恢复。")) {
      localStorage.removeItem(storageKey);
      setEntries([]);
      toast.success("已清空所有草稿");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{triggerButton}</SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>草稿箱</SheetTitle>
            {entries.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                onClick={handleClearAll}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                清空
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-4 mr-1 ml-1 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {entries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">草稿箱空空如也</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.draftId || entry.name} className="relative group">
                {entry.isDb && (
                  <div className="absolute top-2 left-2 z-10 bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Cloud className="w-3 h-3" />
                    云端
                  </div>
                )}
                <DataCard
                  key={entry.draftId || entry.name}
                  id={entry.draftId}
                  name={entry.name}
                  reviewstatus={false as any} // Drafts are not reviewed, use type casting inside component
                  uploadBy={`最近保存: ${new Date(entry.updatedAt).toLocaleTimeString()}`}
                  rejectReason=""
                  onClick={() => handleCardClick(entry)}
                />
                <button
                  type="button"
                  onClick={(e) => handleDeleteDraft(entry, e)}
                  title="删除草稿"
                  className="absolute top-2 right-2 bg-red-100 hover:bg-red-200 text-red-500 rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
