import type { IssueRowData, Priority } from './types';

const PRIORITY_STYLE: Record<Priority, { label: string; className: string }> = {
  high: { label: '高', className: 'bg-red-100 text-red-700 border-red-200' },
  medium: { label: '中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: '低', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const DUE_ALERT_ROW_STYLE: Record<IssueRowData['dueAlertLevel'], string> = {
  overdue: 'bg-red-50',
  soon: 'bg-amber-50',
  none: '',
};

function formatDate(date: Date | null): string {
  if (!date) return '−';
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

interface IssueRowProps {
  row: IssueRowData;
  onClick?: (issueId: string) => void;
}

export function IssueRow({ row, onClick }: IssueRowProps) {
  const priorityStyle = PRIORITY_STYLE[row.priority];
  const rowAlertClassName = DUE_ALERT_ROW_STYLE[row.dueAlertLevel];

  return (
    <tr
      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${rowAlertClassName}`}
      onClick={() => onClick?.(row.id)}
    >
      {/* プロジェクト／種別 */}
      <td className="py-2 px-3">
        <div className="flex flex-col gap-1">
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
            style={{ color: row.project.color, backgroundColor: `${row.project.color}14` }}
          >
            {row.project.name}
          </span>
          <span className="text-[10px] text-slate-400">{row.workflowType.name}</span>
        </div>
      </td>

      {/* タイトル（ツリーインデント） */}
      <td className="py-2 px-3">
        <div style={{ paddingLeft: `${row.depth * 20}px` }} className="flex items-center gap-2">
          {row.depth > 0 && <span className="text-slate-300 select-none">└</span>}
          <span className="text-sm font-medium text-slate-800">{row.title}</span>
        </div>
      </td>

      {/* ステータス */}
      <td className="py-2 px-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
          style={{ borderColor: row.status.color, color: row.status.color, backgroundColor: `${row.status.color}14` }}
        >
          {row.status.label}
          <span className="text-[10px] opacity-70">{row.status.progressPercent}%</span>
        </span>
      </td>

      {/* 優先度 */}
      <td className="py-2 px-3">
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${priorityStyle.className}`}>
          {priorityStyle.label}
        </span>
      </td>

      {/* 担当者（アイコン+名前） */}
      <td className="py-2 px-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {row.assignees.length === 0 && <span className="text-xs text-slate-400">未割当</span>}
          {row.assignees.map((user) => (
            <span key={user.id} className="inline-flex items-center gap-1 text-xs text-slate-700">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-600">
                  {user.name.charAt(0)}
                </span>
              )}
              {user.name}
            </span>
          ))}
        </div>
      </td>

      {/* 期限 */}
      <td className="py-2 px-3">
        <span
          className={`text-xs ${
            row.dueAlertLevel === 'overdue'
              ? 'font-semibold text-red-600'
              : row.dueAlertLevel === 'soon'
                ? 'font-semibold text-amber-600'
                : 'text-slate-500'
          }`}
        >
          {formatDate(row.dueDate)}
          {row.dueAlertLevel === 'overdue' && ' ⚠️ 期限超過'}
          {row.dueAlertLevel === 'soon' && ' ・期限接近'}
        </span>
      </td>
    </tr>
  );
}
