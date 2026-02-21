// 从后端获取到的时间数据为ISO格式，需要进行一定的处理，在这里用在frontend/src/dashboard/review/reviewTable.tsx
export function formatTime(timeString: string) {
  const date = new Date(timeString);
  return date.toLocaleString('zh-CN',{
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}