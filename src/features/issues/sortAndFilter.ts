import type {
  Issue,
  IssueRowData,
  ListViewFilters,
  ListViewSort,
  Priority,
  Project,
  Status,
  User,
  WorkflowType,
} from './types';
import { getIssueDueAlertLevel } from './dueDateAlert';

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** 課題1件がフィルタ条件に合致するかを判定する（ツリー構造を考慮しない単純な述語） */
export function matchesFilters(issue: Issue, filters: ListViewFilters): boolean {
  if (filters.projectIds.length > 0 && !filters.projectIds.includes(issue.projectId)) {
    return false;
  }
  if (filters.workflowTypeIds.length > 0 && !filters.workflowTypeIds.includes(issue.workflowTypeId)) {
    return false;
  }
  if (filters.assigneeIds.length > 0) {
    const hasMatch = issue.assigneeIds.some((id) => filters.assigneeIds.includes(id));
    if (!hasMatch) return false;
  }
  if (filters.statusIds.length > 0 && !filters.statusIds.includes(issue.statusId)) {
    return false;
  }
  if (filters.priorities.length > 0 && !filters.priorities.includes(issue.priority)) {
    return false;
  }
  return true;
}

/**
 * ステータスの order は、同一 workflowTypeId 内でのみ意味を持つ比較軸のため、
 * 種別をまたぐ比較では progressPercent（0-100、種別間依存の展開尺度）にフォールバックする。
 * 同一種別同士なら order を使い、フローに沿った並びを優先する。
 */
function compareStatus(a: Issue, b: Issue, statusById: Map<string, Status>): number {
  const statusA = statusById.get(a.statusId);
  const statusB = statusById.get(b.statusId);
  if (!statusA || !statusB) return 0;
  if (statusA.workflowTypeId === statusB.workflowTypeId) {
    return statusA.order - statusB.order;
  }
  return statusA.progressPercent - statusB.progressPercent;
}

function compareBy(
  key: ListViewSort['primary'],
  a: Issue,
  b: Issue,
  statusById: Map<string, Status>
): number {
  switch (key) {
    case 'priority':
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    case 'dueDate': {
      // 期限なしは末尾に回す
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    case 'status':
      return compareStatus(a, b, statusById);
    case 'updatedAt':
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    default:
      return 0;
  }
}

function compareIssues(sort: ListViewSort, a: Issue, b: Issue, statusById: Map<string, Status>): number {
  const primaryResult = compareBy(sort.primary, a, b, statusById);
  if (primaryResult !== 0) return primaryResult;
  if (sort.secondary) return compareBy(sort.secondary, a, b, statusById);
  return 0;
}

/**
 * フィルタ済みの issues から、親子関係（プロジェクト・親課題・小課題）を維持したまま
 * 兄弟間のみを sort 条件で並び替えたツリーを構築する。
 *
 * ポイント: 単純にフラットな配列を sort() すると親子の隣接関係が崩れ
 * インデント表示が意味をなさなくなる（子が親から離れた位置に飛んでしまう）。
 * そのため兄弟グループ内ソート → 深さ優先で連結、という手順を踏む。
 *
 * フィルタで親だけが除外された場合、その子は自動的にルート扱いに格上げする
 * （データが存在しない親を参照する不整合ケースと同じ扱いでフォールバックする）。
 */
export function buildSortedIssueTree(
  filteredIssues: Issue[],
  sort: ListViewSort,
  statusById: Map<string, Status>
): Array<{ issue: Issue; depth: number }> {
  const childrenByParent = new Map<string | null, Issue[]>();
  for (const issue of filteredIssues) {
    const key = issue.parentId ?? null;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(issue);
  }

  function sortedChildrenOf(parentId: string | null): Issue[] {
    const list = childrenByParent.get(parentId) ?? [];
    return [...list].sort((a, b) => compareIssues(sort, a, b, statusById));
  }

  const result: Array<{ issue: Issue; depth: number }> = [];
  const visited = new Set<string>();

  function visit(parentId: string | null, depth: number) {
    for (const child of sortedChildrenOf(parentId)) {
      if (visited.has(child.id)) continue; // 循環参照ガード
      visited.add(child.id);
      result.push({ issue: child, depth });
      visit(child.id, depth + 1);
    }
  }

  visit(null, 0);

  // parentId が filteredIssues 内に存在しない課題（親が除外された、またはデータ不整合）は
  // ルート扱いで放り、ルート自体を sort 条件で並べたので、まとめてソートして追加する。
  const orphans = filteredIssues.filter((i) => !visited.has(i.id));
  const sortedOrphans = [...orphans].sort((a, b) => compareIssues(sort, a, b, statusById));
  for (const orphan of sortedOrphans) {
    if (visited.has(orphan.id)) continue;
    visited.add(orphan.id);
    result.push({ issue: orphan, depth: 0 });
    visit(orphan.id, 1);
  }

  return result;
}

/**
 * issues + statuses + users + projects + workflowTypes の生データから、
 * リストビュー描画用の IssueRowData[] を組み立てる。
 * フィルタ適用 → ツリー構築（兄弟間ソート込み） の順で処理する。
 */
export function buildIssueRowData(
  issues: Issue[],
  statuses: Status[],
  users: User[],
  projects: Project[],
  workflowTypes: WorkflowType[],
  filters: ListViewFilters,
  sort: ListViewSort,
  now: Date = new Date()
): IssueRowData[] {
  const statusById = new Map(statuses.map((s) => [s.id, s]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const workflowTypeById = new Map(workflowTypes.map((w) => [w.id, w]));

  const filteredIssues = issues.filter((issue) => matchesFilters(issue, filters));
  const tree = buildSortedIssueTree(filteredIssues, sort, statusById);

  return tree.map(({ issue, depth }) => {
    const status = statusById.get(issue.statusId);
    if (!status) {
      throw new Error(`Unknown statusId "${issue.statusId}" on issue "${issue.id}"`);
    }
    const project = projectById.get(issue.projectId);
    if (!project) {
      throw new Error(`Unknown projectId "${issue.projectId}" on issue "${issue.id}"`);
    }
    const workflowType = workflowTypeById.get(issue.workflowTypeId);
    if (!workflowType) {
      throw new Error(`Unknown workflowTypeId "${issue.workflowTypeId}" on issue "${issue.id}"`);
    }
    const isCompleted = status.progressPercent >= 100;
    return {
      ...issue,
      project,
      workflowType,
      status,
      assignees: issue.assigneeIds.map((id) => userById.get(id)).filter((u): u is User => !!u),
      depth,
      dueAlertLevel: getIssueDueAlertLevel(issue, isCompleted, now),
    };
  });
}
