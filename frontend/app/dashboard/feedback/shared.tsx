"use client";

import { Lock, Megaphone, Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/src/i18n/language-provider";
import type {
  FeedbackPostStatus,
  FeedbackPostSummary,
  FeedbackPostType,
} from "@/lib/api";

export function FeedbackTypeBadge({ type }: { type: FeedbackPostType }) {
  const { t } = useI18n();
  const labels: Record<FeedbackPostType, string> = {
    suggestion: t("fb.suggestion"),
    bug: t("fb.bug"),
    feature: t("fb.feature"),
    other: t("fb.other"),
  };
  return <Badge variant="secondary">{labels[type]}</Badge>;
}

export function FeedbackStatusBadge({ status }: { status: FeedbackPostStatus }) {
  const { t } = useI18n();
  if (status === "RESOLVED") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
      >
        {t("fb.resolved")}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400"
    >
      {t("fb.pending")}
    </Badge>
  );
}

type PostFlagFields = Pick<
  FeedbackPostSummary,
  "isAnnouncement" | "isPinned" | "isPrivate"
>;

export function FeedbackFlagBadges({ post }: { post: PostFlagFields }) {
  const { t } = useI18n();
  return (
    <>
      {post.isAnnouncement && (
        <Badge variant="default">
          <Megaphone />
          {t("fb.announcement")}
        </Badge>
      )}
      {post.isPinned && (
        <Badge variant="outline">
          <Pin />
          {t("fb.pinned")}
        </Badge>
      )}
      {post.isPrivate && (
        <Badge variant="outline">
          <Lock />
          {t("fb.private")}
        </Badge>
      )}
    </>
  );
}
