"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Inbox, Megaphone, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type NotificationType,
} from "@/lib/api";
import { formatRelativeTime } from "@/lib/time";

const PAGE_SIZE = 15;

const TYPE_ICONS: Record<NotificationType, typeof Inbox> = {
  NEW_POST: Inbox,
  REPLY: MessageSquare,
  ANNOUNCEMENT: Megaphone,
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications({ page, pageSize: PAGE_SIZE });
      setNotifications(res.data.notifications);
      setTotal(res.data.total);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取消息失败");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await fetchNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleClickNotification = async (item: NotificationItem) => {
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(item.id);
      } catch {
        void fetchNotifications();
      }
    }
    if (item.postId) {
      router.push(`/dashboard/feedback?post=${item.postId}`);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="w-full px-6 py-16 md:px-10 md:py-20">
      <section className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="mb-4 flex items-center gap-3 text-3xl font-medium tracking-tight text-foreground md:text-4xl">
            系统消息
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} 条未读</Badge>
            )}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            论坛新帖、回复与官方公告的最新动态。
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck />
          全部已读
        </Button>
      </section>

      {error && (
        <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-border bg-card p-5"
            >
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 && !error ? (
        <div className="rounded-lg border border-border bg-card px-8 py-16 text-center">
          <p className="text-lg font-medium text-foreground">暂无消息</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            当论坛有新帖、回复或公告时，会第一时间在这里通知你。
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {notifications.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleClickNotification(item)}
                className={`flex w-full items-start gap-4 rounded-lg border border-border p-5 text-left transition-colors hover:border-muted-foreground/30 ${
                  item.read ? "bg-card" : "bg-muted/60"
                }`}
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex items-center gap-2">
                    {!item.read && (
                      <span className="size-2 shrink-0 rounded-full bg-destructive" />
                    )}
                    <span
                      className={`text-sm leading-relaxed ${
                        item.read
                          ? "text-muted-foreground"
                          : "font-medium text-foreground"
                      }`}
                    >
                      {item.message}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground/80">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      )}

      {!loading && total > PAGE_SIZE && (
        <section className="mt-10 flex items-center justify-between">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </Button>
          <p className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 页 · 共 {total} 条
          </p>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </section>
      )}
    </main>
  );
}
