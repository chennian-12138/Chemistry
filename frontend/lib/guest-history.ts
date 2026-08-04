// 匿名用户的浏览历史：只写 localStorage，最多 7 条不同记录（按 type+targetId 去重），
// 重复访问只刷新已有记录的时间与排序、不占名额；写第 8 条时拒绝并交由调用方弹注册墙。
import { recordHistory } from "@/lib/api";
import type { HistoryItem } from "@/store/history-store";

const GUEST_HISTORY_KEY = "guest_browsing_history";
const MAX_GUEST_RECORDS = 7;

export function getGuestHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveGuestHistory(records: HistoryItem[]) {
  window.localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(records));
}

export type RecordGuestHistoryResult =
  | { ok: true; record: HistoryItem }
  | { ok: false; reason: "quota" };

export function recordGuestHistory(
  type: string,
  targetId: string,
  title: string,
): RecordGuestHistoryResult {
  const records = getGuestHistory();

  // 命中已有记录：刷新标题与时间并置顶，不占用名额
  const existingIndex = records.findIndex(
    (r) => r.type === type && r.targetId === targetId,
  );
  if (existingIndex !== -1) {
    const [existing] = records.splice(existingIndex, 1);
    const refreshed: HistoryItem = {
      ...existing,
      title,
      createdAt: new Date().toISOString(),
    };
    records.unshift(refreshed);
    saveGuestHistory(records);
    return { ok: true, record: refreshed };
  }

  if (records.length >= MAX_GUEST_RECORDS) {
    return { ok: false, reason: "quota" };
  }

  const record: HistoryItem = {
    id: `guest-${crypto.randomUUID()}`,
    type,
    targetId,
    title,
    createdAt: new Date().toISOString(),
  };
  records.unshift(record);
  saveGuestHistory(records);
  return { ok: true, record };
}

export function deleteGuestHistory(id: string) {
  saveGuestHistory(getGuestHistory().filter((r) => r.id !== id));
}

export function clearGuestHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_HISTORY_KEY);
}

// 登录/注册后由 history 消费方调用：把匿名期的本地历史合并进数据库。
// 模块级单例 Promise：多个消费方（侧边栏/历史页）各自 await 也不会重复请求或竞态；
// 先清本地再逐条上报（服务端按 type+targetId upsert，中途失败重进也幂等）；
// 最旧的先发，使服务端 createdAt 的顺序与本地 recency 一致。
let syncPromise: Promise<void> | null = null;
export function syncGuestHistoryToServer(): Promise<void> {
  if (!syncPromise) {
    syncPromise = (async () => {
      const guest = getGuestHistory();
      if (guest.length === 0) return;
      clearGuestHistory();
      for (const record of [...guest].reverse()) {
        try {
          await recordHistory(record.type, record.targetId, record.title);
        } catch {
          // 单条上报失败不阻塞其余记录
        }
      }
    })();
  }
  return syncPromise;
}
