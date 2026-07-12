import { useMemo, useState } from 'react';
import type {
  Issue,
  ListViewFilters,
  ListViewSort,
  Priority,
  Project,
  Status,
  User,
  WorkflowType,
} from './types';
import { buildIssueRowData } from './sortAndFilter';
import { useIssueSearch } from './useIssueSearch';
import { IssueRow } from './IssueRow';

const PAGE_SIZE = 25;

const DEFAULT_SORT: ListViewSort = { primary: 'priority', secondary: 'dueDate' };
const DEFAULT_FILTERS: ListViewFilters = {
  projectIds: [],
  workflowTypeIds: [],
  assigneeIds: [],
  statusIds: [],
  priorities: [],
  searchQuery: '',
};

interface IssueListViewProps {
  issues: Issue[];
  projects: Project[];
  workflowTypes: WorkflowType[]; // order で昇順ソート済みであることを期待
  statuses: Status[]; // workflowTypeId ごとに order で昇順ソート済みであることを期待
  users: User[];
  currentUserId?: string; // 指定時は「自分の担当のみ」トグルを表示
  onIssueClick?: (issueId: string) => void;
}

export function IssueListView({
  issues,
  projects,
  workflowTypes,
  statuses,
  users,
  currentUserId,
  onIssueClick,
}: IssueListViewProps) {
  const [filters, setFilters] = useState<ListViewFilters>(DEFAULT_FILTERS);
  const [onlyMine, setOnlyMine] = useState(false);
  const [page, setPage] = useState(1);

  // 1. クライアントサイド全文検索（タイトル・メモ・トークン・読み）で issues を絞り込む
  const searchedIssues = useIssueSearch(issues, filters.searchQuery);

  // 2. 「自分の担当のみ」トグルの適用
  const scopedIssues = useMemo(() => {
    if (!onlyMine || !currentUserId) return searchedIssues;
    return searchedIssues.filter((issue) => issue.assigneeIds.includes(currentUserId));
  }, [searchedIssues, onlyMine, currentUserId]);

  // 3. プロジェクト/種別/担当者/ステータス/優先度フィルタ適用 → ツリー構築
  const rows = useMemo(
    () => buildIssueRowData(scopedIssues, statuses, users, projects, workflowTypes, filters, DEFAULT_SORT),
    [scopedIssues, statuses, users, projects, workflowTypes, filters]
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const overdueCount = useMemo(() => rows.filter((r) => r.dueAlertLevel === 'overdue').length, [rows]);
  const soonCount = useMemo(() => rows.filter((r) => r.dueAlertLevel === 'soon').length, [rows]);

  // ステータスフィルタは種別ごとにグルーピングして表示する
  // （種別が増えてもどれが表示で選ぶかに迷わないため）
  const statusesByWorkflowType = useMemo(() => {
    const map = new Map<string, Status[]>();
    for (const status of statuses) {
      if (!map.has(status.workflowTypeId)) map.set(status.workflowTypeId, []);
      map.get(status.workflowTypeId)!.push(status);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [statuses]);

  function updateFilters(patch: Partial<ListViewFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1); // フィルタ変更時はページを先頭に戻す
  }

  function toggleProjectFilter(projectId: string) {
    const has = filters.projectIds.includes(projectId);
    updateFilters({
      projectIds: has ? filters.projectIds.filter((id) => id !== projectId) : [...filters.projectIds, projectId],
    });
  }

  function toggleWorkflowTypeFilter(workflowTypeId: string) {
    const has = filters.workflowTypeIds.includes(workflowTypeId);
    updateFilters({
      workflowTypeIds: has
        ? filters.workflowTypeIds.filter((id) => id !== workflowTypeId)
        : [...filters.workflowTypeIds, workflowTypeId],
    });
  }

  function togglePriorityFilter(priority: Priority) {
    const has = filters.priorities.includes(priority);
    updateFilters({
      priorities: has ? filters.priorities.filter((p) => p !== priority) : [...filters.priorities, priority],
    });
  }

  function toggleStatusFilter(statusId: string) {
    const has = filters.statusIds.includes(statusId);
    updateFilters({
      statusIds: has ? filters.statusIds.filter((id) => id !== statusId) : [...filters.statusIds, statusId],
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 期限アラートサマリー */}
      {(overdueCount > 0 || soonCount > 0) && (
        <div className="flex gap-2 text-xs">
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700">
              期限超過 {overdueCount}件
            </span>
          )}
          {soonCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
              期限接近 {soonCount}件
            </span>
          )}
        </div>
      )}

      {/* 検索バー */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => updateFilters({ searchQuery: e.target.value })}
          placeholder="タイトル・メモを検索"
          className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
        />

        {currentUserId && (
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            自分の担当のみ
          </label>
        )}
      </div>

      {/* フィルタバー: プロジェクト */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-500">プロジェクト:</span>
        {projects
          .filter((p) => !p.archived)
          .map((p) => (
            <button
              key={p.id}
              onClick={() => toggleProjectFilter(p.id)}
              className="rounded px-2.5 py-0.5 text-xs font-medium"
              style={
                filters.projectIds.includes(p.id)
                  ? { backgroundColor: p.color, color: '#fff' }
                  : { backgroundColor: `${p.color}14`, color: p.color }
              }
            >
              {p.name}
            </button>
          ))}
      </div>

      {/* フィルタバー: 種別（新機能開発/bug対応/調査報告/UI-UX改善/既存機能修正 等） */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-500">種別:</span>
        {workflowTypes.map((w) => (
          <button
            key={w.id}
            onClick={() => toggleWorkflowTypeFilter(w.id)}
            className="rounded px-2.5 py-0.5 text-xs font-medium"
            style={
              filters.workflowTypeIds.includes(w.id)
                ? { backgroundColor: w.color, color: '#fff' }
                : { backgroundColor: `${w.color}14`, color: w.color }
            }
          >
            {w.name}
          </button>
        ))}
      </div>

      {/* フィルタバー: 優先度 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-500">優先度:</span>
        {(['high', 'medium', 'low'] as Priority[]).map((p) => (
          <button
            key={p}
            onClick={() => togglePriorityFilter(p)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              filters.priorities.includes(p)
                ? 'border-slate-700 bg-slate-700 text-white'
                : 'border-slate-300 text-slate-600'
            }`}
          >
            {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
          </button>
        ))}
      </div>

      {/* フィルタバー: ステータス（種別ごとにグルーピング表示） */}
      <div className="flex flex-col gap-1">
        {workflowTypes.map((w) => {
          const typeStatuses = statusesByWorkflowType.get(w.id) ?? [];
          if (typeStatuses.length === 0) return null;
          return (
            <div key={w.id} className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 w-24 shrink-0">{w.name}:</span>
              {typeStatuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleStatusFilter(s.id)}
                  className="rounded-full border px-2.5 py-0.5 text-xs"
                  style={
                    filters.statusIds.includes(s.id)
                      ? { borderColor: s.color, backgroundColor: s.color, color: '#fff' }
                      : { borderColor: s.color, color: s.color }
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* テーブル本体 */}
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            <th className="py-2 px-3 font-medium">プロジェクト/種別</th>
            <th className="py-2 px-3 font-medium">タイトル</th>
            <th className="py-2 px-3 font-medium">ステータス</th>
            <th className="py-2 px-3 font-medium">優先度</th>
            <th className="py-2 px-3 font-medium">担当者</th>
            <th className="py-2 px-3 font-medium">期限</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                該当する課題がありません
              </td>
            </tr>
          ) : (
            pageRows.map((row) => <IssueRow key={row.id} row={row} onClick={onIssueClick} />)
          )}
        </tbody>
      </table>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-slate-600">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-slate-300 px-2.5 py-1 disabled:opacity-40"
          >
            前へ
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md border border-slate-300 px-2.5 py-1 disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
