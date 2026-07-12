import type { Issue } from './types';

// 期限接近とみなす日数のしきい値（仕様書2.3の初期値）。呼び出し側で上書き可能。
const DEFAULT_SOON_THRESHOLD_DAYS = 3;

export function getIssueDueAlertLevel(
  issue: Issue,
  isCompleted: boolean,
  now: Date = new Date(),
  soonThresholdDays: number = DEFAULT_SOON_THRESHOLD_DAYS
): 'overdue' | 'soon' | 'none' {
  if (isCompleted || !issue.dueDate) return 'none';
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = (issue.dueDate.getTime() - now.getTime()) / msPerDay;
  if (diffDays < 0) return 'overdue';
  if (diffDays <= soonThresholdDays) return 'soon';
  return 'none';
}
