import type { Issue } from './types';

// PLACEHOLDER: 本実装は後日提供予定。しきい値ロジックの入出力契約を満たす最小実装。
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
