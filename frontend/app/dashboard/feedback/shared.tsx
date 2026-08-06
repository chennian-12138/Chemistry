import { Lock, Megaphone, Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
  FeedbackPostStatus,
  FeedbackPostSummary,
  FeedbackPostType,
} from "@/lib/api";

export const FEEDBACK_TYPE_LABELS: Record<FeedbackPostType, string> = {
  suggestion: "建议",
  bug: "Bug 报错",
  feature: "功能需求",
  other: "其他",
};

export function FeedbackTypeBadge({ type }: { type: FeedbackPostType }) {
  return <Badge variant="secondary">{FEEDBACK_TYPE_LABELS[type]}</Badge>;
}

export function FeedbackStatusBadge({ status }: { status: FeedbackPostStatus }) {
  if (status === "RESOLVED") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
      >
        已解决
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400"
    >
      待回复
    </Badge>
  );
}

type PostFlagFields = Pick<
  FeedbackPostSummary,
  "isAnnouncement" | "isPinned" | "isPrivate"
>;

export function FeedbackFlagBadges({ post }: { post: PostFlagFields }) {
  return (
    <>
      {post.isAnnouncement && (
        <Badge variant="default">
          <Megaphone />
          公告
        </Badge>
      )}
      {post.isPinned && (
        <Badge variant="outline">
          <Pin />
          置顶
        </Badge>
      )}
      {post.isPrivate && (
        <Badge variant="outline">
          <Lock />
          私密
        </Badge>
      )}
    </>
  );
}
