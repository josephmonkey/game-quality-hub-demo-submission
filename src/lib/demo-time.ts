export const DAY_MS = 86_400_000;

export function demoNow() {
  return new Date();
}

export function demoToday() {
  const now = demoNow();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function formatDemoRelativeTime(iso: string, now = demoNow()) {
  const hours = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function isWithinLastHours(iso: string, hours: number, now = demoNow()) {
  const elapsed = now.getTime() - new Date(iso).getTime();
  return elapsed >= 0 && elapsed <= hours * 3_600_000;
}
