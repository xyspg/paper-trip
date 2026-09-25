import { t } from "@lingui/core/macro";

// Coarse "x ago" label for a suggestion timestamp, shared by the public composer
// and the admin review queue. Buckets only — no exact clock times.
export const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t`刚刚`;
  if (min < 60) return t`${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return t`${hr} 小时前`;
  const days = Math.floor(hr / 24);
  return t`${days} 天前`;
};
