import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Status, WorkflowType } from '../issues/types';
import { createWorkflowType, moveWorkflowType, updateWorkflowType } from './workflowTypeActions';
import { createStatus, moveStatus, setDefaultStatus, setStatusArchived, updateStatus } from './statusActions';

const PRESET_COLORS = ['#0ea5e9', '#a855f7', '#ef4444', '#f59e0b', '#22c55e', '#64748b', '#94a3b8', '#3b82f6'];

interface WorkflowTypeFormState {
  id: string | null;
  name: string;
  color: string;
}
const EMPTY_WORKFLOW_TYPE_FORM: WorkflowTypeFormState = { id: null, name: '', color: PRESET_COLORS[0] };

interface StatusFormState {
  id: string | null;
  label: string;
  color: string;
  progressPercent: number;
}
const EMPTY_STATUS_FORM: StatusFormState = { id: null, label: '', color: PRESET_COLORS[0], progressPercent: 50 };

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="h-6 w-6 rounded-full"
          style={{ backgroundColor: color, boxShadow: value === color ? `0 0 0 2px ${color}` : 'none' }}
          aria-label={color}
        />
      ))}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        pattern="^#[0-9a-fA-F]{6}$"
        title="#rrggbb 形式で入力してください"
        className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500"
      />
    </div>
  );
}

interface MasterDataViewProps {
  workflowTypes: WorkflowType[];
  statuses: Status[];
  isAdmin: boolean;
}

export function MasterDataView({ workflowTypes, statuses, isAdmin }: MasterDataViewProps) {
  const orderedWorkflowTypes = useMemo(() => [...workflowTypes].sort((a, b) => a.order - b.order), [workflowTypes]);
  const [selectedId, setSelectedId] = useState<string | null>(orderedWorkflowTypes[0]?.id ?? null);
  const [workflowTypeForm, setWorkflowTypeForm] = useState<WorkflowTypeFormState>(EMPTY_WORKFLOW_TYPE_FORM);
  const [statusForm, setStatusForm] = useState<StatusFormState>(EMPTY_STATUS_FORM);
  const [showArchivedStatuses, setShowArchivedStatuses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedId && orderedWorkflowTypes.length > 0) setSelectedId(orderedWorkflowTypes[0].id);
  }, [orderedWorkflowTypes, selectedId]);

  const selectedWorkflowType = orderedWorkflowTypes.find((w) => w.id === selectedId) ?? null;
  const siblingStatuses = useMemo(
    () =>
      statuses
        .filter((s) => s.workflowTypeId === selectedId)
        .filter((s) => showArchivedStatuses || !s.archived)
        .sort((a, b) => a.order - b.order),
    [statuses, selectedId, showArchivedStatuses]
  );

  if (!isAdmin) {
    return <p className="p-6 text-center text-sm text-slate-500">この画面は管理者のみ利用できます。</p>;
  }

  async function handleWorkflowTypeSubmit(e: FormEvent) {
    e.preventDefault();
    if (!workflowTypeForm.name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      if (workflowTypeForm.id) {
        await updateWorkflowType(workflowTypeForm.id, {
          name: workflowTypeForm.name.trim(),
          color: workflowTypeForm.color,
        });
      } else {
        const nextOrder = orderedWorkflowTypes.length > 0 ? orderedWorkflowTypes[orderedWorkflowTypes.length - 1].order + 1 : 0;
        await createWorkflowType({ name: workflowTypeForm.name.trim(), color: workflowTypeForm.color }, nextOrder);
      }
      setWorkflowTypeForm(EMPTY_WORKFLOW_TYPE_FORM);
    } catch {
      setError('種別の保存に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusSubmit(e: FormEvent) {
    e.preventDefault();
    if (!statusForm.label.trim() || !selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      if (statusForm.id) {
        await updateStatus(statusForm.id, {
          label: statusForm.label.trim(),
          color: statusForm.color,
          progressPercent: statusForm.progressPercent,
        });
      } else {
        const nextOrder = siblingStatuses.length > 0 ? siblingStatuses[siblingStatuses.length - 1].order + 1 : 0;
        await createStatus(
          {
            workflowTypeId: selectedId,
            label: statusForm.label.trim(),
            color: statusForm.color,
            progressPercent: statusForm.progressPercent,
          },
          nextOrder
        );
      }
      setStatusForm(EMPTY_STATUS_FORM);
    } catch {
      setError('ステータスの保存に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 種別タブ */}
      <div className="flex flex-wrap items-center gap-1.5">
        {orderedWorkflowTypes.map((w) => (
          <button
            key={w.id}
            onClick={() => setSelectedId(w.id)}
            className="rounded px-2.5 py-1 text-xs font-medium"
            style={
              selectedId === w.id
                ? { backgroundColor: w.color, color: '#fff' }
                : { backgroundColor: `${w.color}14`, color: w.color }
            }
          >
            {w.name}
          </button>
        ))}
      </div>

      {/* 種別の作成・編集 */}
      <form onSubmit={handleWorkflowTypeSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-medium text-slate-700">
          {workflowTypeForm.id ? '種別を編集' : '新しい種別を作成'}
        </h2>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          種別名
          <input
            type="text"
            required
            value={workflowTypeForm.name}
            onChange={(e) => setWorkflowTypeForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
          />
        </label>
        <div className="flex flex-col gap-1 text-sm text-slate-600">
          バッジ色
          <ColorPicker value={workflowTypeForm.color} onChange={(color) => setWorkflowTypeForm((f) => ({ ...f, color }))} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {workflowTypeForm.id ? '更新する' : '作成する'}
          </button>
          {workflowTypeForm.id && (
            <button
              type="button"
              onClick={() => setWorkflowTypeForm(EMPTY_WORKFLOW_TYPE_FORM)}
              className="text-xs text-slate-500 underline underline-offset-2"
            >
              キャンセル
            </button>
          )}
        </div>
      </form>

      {/* 種別一覧(並び替え・編集) */}
      <div className="-mx-3 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[420px] border-collapse text-left sm:min-w-0">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-2 px-3 font-medium">種別</th>
              <th className="py-2 px-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {orderedWorkflowTypes.map((w, index) => (
              <tr key={w.id} className="border-b border-slate-100">
                <td className="py-2 px-3">
                  <span
                    className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                    style={{ color: w.color, backgroundColor: `${w.color}14` }}
                  >
                    {w.name}
                  </span>
                </td>
                <td className="py-2 px-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      disabled={index === 0}
                      onClick={() => moveWorkflowType(orderedWorkflowTypes, index, 'up')}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      disabled={index === orderedWorkflowTypes.length - 1}
                      onClick={() => moveWorkflowType(orderedWorkflowTypes, index, 'down')}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => setWorkflowTypeForm({ id: w.id, name: w.name, color: w.color })}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      編集
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ステータス管理(選択中の種別のみ) */}
      {selectedWorkflowType && (
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-medium text-slate-700">
            「{selectedWorkflowType.name}」のステータス
          </h2>

          <form onSubmit={handleStatusSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4">
            <h3 className="text-xs font-medium text-slate-600">
              {statusForm.id ? 'ステータスを編集' : '新しいステータスを作成'}
            </h3>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              ラベル
              <input
                type="text"
                required
                value={statusForm.label}
                onChange={(e) => setStatusForm((f) => ({ ...f, label: e.target.value }))}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              進捗率 ({statusForm.progressPercent}%)
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={statusForm.progressPercent}
                onChange={(e) => setStatusForm((f) => ({ ...f, progressPercent: Number(e.target.value) }))}
              />
            </label>
            <div className="flex flex-col gap-1 text-sm text-slate-600">
              バッジ色
              <ColorPicker value={statusForm.color} onChange={(color) => setStatusForm((f) => ({ ...f, color }))} />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {statusForm.id ? '更新する' : '作成する'}
              </button>
              {statusForm.id && (
                <button
                  type="button"
                  onClick={() => setStatusForm(EMPTY_STATUS_FORM)}
                  className="text-xs text-slate-500 underline underline-offset-2"
                >
                  キャンセル
                </button>
              )}
            </div>
          </form>

          <label className="flex items-center gap-1.5 self-end text-xs text-slate-500">
            <input
              type="checkbox"
              checked={showArchivedStatuses}
              onChange={(e) => setShowArchivedStatuses(e.target.checked)}
            />
            アーカイブ済みも表示
          </label>

          <div className="-mx-3 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[560px] border-collapse text-left sm:min-w-0">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 px-3 font-medium">ステータス</th>
                  <th className="py-2 px-3 font-medium">既定</th>
                  <th className="py-2 px-3 font-medium">状態</th>
                  <th className="py-2 px-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {siblingStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                      ステータスがありません
                    </td>
                  </tr>
                ) : (
                  siblingStatuses.map((s, index) => (
                    <tr key={s.id} className="border-b border-slate-100">
                      <td className="py-2 px-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={{ borderColor: s.color, color: s.color, backgroundColor: `${s.color}14` }}
                        >
                          {s.label}
                          <span className="text-[10px] opacity-70">{s.progressPercent}%</span>
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="radio"
                          name="defaultStatus"
                          checked={s.isDefault}
                          onChange={() => setDefaultStatus(selectedId!, s.id, statuses)}
                        />
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-500">
                        {s.archived ? 'アーカイブ済み' : '稼働中'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            disabled={index === 0}
                            onClick={() => moveStatus(siblingStatuses, index, 'up')}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            disabled={index === siblingStatuses.length - 1}
                            onClick={() => moveStatus(siblingStatuses, index, 'down')}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => setStatusForm({ id: s.id, label: s.label, color: s.color, progressPercent: s.progressPercent })}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => setStatusArchived(s.id, !s.archived)}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            {s.archived ? '復元' : 'アーカイブ'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
