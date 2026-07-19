import { useMemo, useState } from 'react';
import type { Issue, IssueRowData, ListViewFilters, Priority, Project, Status, User, WorkflowType } from './types';
import { formatIssueIdentifier } from './IssueRow';
import { buildIssueRowData } from './sortAndFilter';
import { useIssueSearch } from './useIssueSearch';

const DEFAULT_SORT = { primary: 'priority' as const, secondary: 'dueDate' as const };

const PRIORITY_STYLE: Record<Priority, { label: string; className: string }> = {
  high: { label: '高', className: 'bg-red-100 text-red-700 border-red-200' },
  medium: { label: '中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: '低', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const DUE_ALERT_CARD_STYLE: Record<IssueRowData['dueAlertLevel'], string> = {
  overdue: 'border-l-4 border-l-red-400',
  soon: 'border-l-4 border-l-amber-400',
  none: 'border-l-4 border-l-transparent',
};

interface KanbanCardProps {
  row: IssueRowData;
  parentTitle?: string;
  onClick?: (issueId: string) => void;
}

function KanbanCard({ row, parentTitle, onClick }: KanbanCardProps) {
  const priorityStyle = PRIORITY_STYLE[row.priority];
  return (
    <button
      onClick={() => onClick?.(row.id)}
      className={`flex w-full flex-col gap-1.5 rounded-md border border-slate-200 bg-white p-2.5 text-left shadow-sm hover:bg-slate-50 ${DUE_ALERT_CARD_STYLE[row.dueAlertLevel]}`}
    >
      <span
        className="inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-medium"
        style={{ color: row.project.color, backgroundColor: `${row.project.color}14` }}
      >
        {formatIssueIdentifier(row)}
      </span>
      {parentTitle && <span className="text-[10px] text-slate-400">↳ {parentTitle}</span>}
      <span className="text-sm font-medium text-slate-800">{row.title}</span>
      <div className="flex items-center justify-between">
        <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${priorityStyle.className}`}>
          {priorityStyle.label}
        </span>
        <div className="flex -space-x-1.5">
          {row.assignees.map((user) => (
            <span
              key={user.id}
              title={user.name}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-slate-200 text-[10px] text-slate-600"
            >
              {user.name.charAt(0)}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

interface KanbanViewProps {
  issues: Issue[];
  projects: Project[];
  workflowTypes: WorkflowType[]; // orderで昇順ソート済みであることを期待
  statuses: Status[];
  users: User[];
  currentUserId?: string;
  onIssueClick?: (issueId: string) => void;
}

export function KanbanView({ issues, projects, workflowTypes, statuses, users, currentUserId, onIssueClick }: KanbanViewProps) {
  const orderedWorkflowTypes = useMemo(() => [...workflowTypes].sort((a, b) => a.order - b.order), [workflowTypes]);
  const [selectedWorkflowTypeId, setSelectedWorkflowTypeId] = useState<string | null>(orderedWorkflowTypes[0]?.id ?? null);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchedIssues = useIssueSearch(issues, searchQuery);

  // 仕様書2.3: ステータス集合が種別ごとに異なるため、カンバンビューは種別を1つ選択した状態で表示する。
  const filters: ListViewFilters = useMemo(
    () => ({
      projectIds,
      workflowTypeIds: selectedWorkflowTypeId ? [selectedWorkflowTypeId] : [],
      assigneeIds: onlyMine && currentUserId ? [currentUserId] : [],
      statusIds: [],
      priorities,
      searchQuery: '',
    }),
    [projectIds, selectedWorkflowTypeId, onlyMine, currentUserId, priorities]
  );

  // フィルタ適用・ツリー構築はリストビューと共通のロジックを流用する（仕様書2.3）。
  const rows = useMemo(
    () => buildIssueRowData(searchedIssues, statuses, users, projects, workflowTypes, filters, DEFAULT_SORT),
    [searchedIssues, statuses, users, projects, workflowTypes, filters]
  );

  const titleById = useMemo(() => new Map(issues.map((i) => [i.id, i.title])), [issues]);

  const columns = useMemo(() => {
    if (!selectedWorkflowTypeId) return [];
    const typeStatuses = statuses.filter((s) => s.workflowTypeId === selectedWorkflowTypeId);
    const rowsByStatus = new Map<string, IssueRowData[]>();
    for (const row of rows) {
      if (!rowsByStatus.has(row.statusId)) rowsByStatus.set(row.statusId, []);
      rowsByStatus.get(row.statusId)!.push(row);
    }
    const active = typeStatuses.filter((s) => !s.archived);
    // アーカイブ済みでも既存の課題が残っている場合は列ごと消さず、末尾に表示する。
    const archivedWithIssues = typeStatuses.filter((s) => s.archived && (rowsByStatus.get(s.id)?.length ?? 0) > 0);
    return [...active, ...archivedWithIssues]
      .sort((a, b) => (a.archived === b.archived ? a.order - b.order : a.archived ? 1 : -1))
      .map((status) => ({ status, rows: rowsByStatus.get(status.id) ?? [] }));
  }, [selectedWorkflowTypeId, statuses, rows]);

  if (orderedWorkflowTypes.length === 0) {
    return <p className="p-6 text-center text-sm text-slate-400">種別が登録されていません。先に種別・ステータスを作成してください。</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 種別タブ（1つ選択） */}
      <div className="flex flex-wrap items-center gap-1.5">
        {orderedWorkflowTypes.map((w) => (
          <button
            key={w.id}
            onClick={() => setSelectedWorkflowTypeId(w.id)}
            className="rounded px-2.5 py-1 text-xs font-medium"
            style={
              selectedWorkflowTypeId === w.id
                ? { backgroundColor: w.color, color: '#fff' }
                : { backgroundColor: `${w.color}14`, color: w.color }
            }
          >
            {w.name}
          </button>
        ))}
      </div>

      {/* 検索・フィルタバー */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="タイトル・メモを検索"
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 sm:w-56"
        />
        {currentUserId && (
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            自分の担当のみ
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-500">プロジェクト:</span>
        {projects
          .filter((p) => !p.archived)
          .map((p) => (
            <button
              key={p.id}
              onClick={() =>
                setProjectIds((prev) => (prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]))
              }
              className="rounded px-2.5 py-0.5 text-xs font-medium"
              style={
                projectIds.includes(p.id)
                  ? { backgroundColor: p.color, color: '#fff' }
                  : { backgroundColor: `${p.color}14`, color: p.color }
              }
            >
              {p.name}
            </button>
          ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-500">優先度:</span>
        {(['high', 'medium', 'low'] as Priority[]).map((p) => (
          <button
            key={p}
            onClick={() => setPriorities((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              priorities.includes(p) ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-300 text-slate-600'
            }`}
          >
            {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
          </button>
        ))}
      </div>

      {/* カンバンボード（表示のみ。ドラッグ&ドロップでのステータス変更は後続追加、仕様書2.3） */}
      <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
        {columns.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">この種別にはステータスが登録されていません。</p>
        ) : (
          columns.map(({ status, rows: columnRows }) => (
            <div key={status.id} className="flex w-64 shrink-0 flex-col gap-2 rounded-lg bg-slate-50 p-2.5">
              <div className="flex items-center justify-between px-1">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
                  style={{ borderColor: status.color, color: status.color, backgroundColor: `${status.color}14` }}
                >
                  {status.label}
                  <span className="text-[10px] opacity-70">{status.progressPercent}%</span>
                </span>
                <span className="text-xs text-slate-400">{columnRows.length}件</span>
              </div>
              {status.archived && <span className="px-1 text-[10px] text-slate-400">(アーカイブ済みステータス)</span>}
              <div className="flex flex-col gap-2">
                {columnRows.length === 0 ? (
                  <p className="px-1 text-xs text-slate-300">課題なし</p>
                ) : (
                  columnRows.map((row) => (
                    <KanbanCard
                      key={row.id}
                      row={row}
                      parentTitle={row.parentId ? titleById.get(row.parentId) : undefined}
                      onClick={onIssueClick}
                    />
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
