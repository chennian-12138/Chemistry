// 从后端获取到的时间数据为ISO格式，需要进行一定的处理，在这里用在frontend/src/dashboard/review/reviewTable.tsx
export function formatTime(timeString: string) {
  const date = new Date(timeString);
  return date.toLocaleString('zh-CN',{
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatRelativeTime(timeString: string) {
  const date = new Date(timeString);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatTime(timeString);
}
