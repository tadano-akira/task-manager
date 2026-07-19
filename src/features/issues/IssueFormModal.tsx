import { useMemo, useState, type FormEvent } from 'react';
import type { Issue, IssueLink, Priority, Project, Status, User, WorkflowType } from './types';
import { createIssue, deleteIssue, updateIssue } from './issueActions';

interface NewIssueContext {
  mode: 'create';
  parent: Issue | null; // 子課題として作成する場合は親課題を渡す(project/種別を継承・固定)
}
interface EditIssueContext {
  mode: 'edit';
  issue: Issue;
}

type IssueFormModalProps = (NewIssueContext | EditIssueContext) & {
  projects: Project[];
  workflowTypes: WorkflowType[];
  statuses: Status[];
  users: User[];
  onClose: () => void;
  onCreateChild?: (parent: Issue) => void;
};

function dateToInputValue(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function IssueFormModal(props: IssueFormModalProps) {
  const { projects, workflowTypes, statuses, users, onClose } = props;
  const isEdit = props.mode === 'edit';
  const existing = isEdit ? props.issue : null;
  const lockedParent = props.mode === 'create' ? props.parent : null;

  const [projectId, setProjectId] = useState(existing?.projectId ?? lockedParent?.projectId ?? projects[0]?.id ?? '');
  const [workflowTypeId, setWorkflowTypeId] = useState(
    existing?.workflowTypeId ?? lockedParent?.workflowTypeId ?? workflowTypes[0]?.id ?? ''
  );
  const workflowStatuses = useMemo(
    () => statuses.filter((s) => s.workflowTypeId === workflowTypeId && (!s.archived || s.id === existing?.statusId)).sort((a, b) => a.order - b.order),
    [statuses, workflowTypeId, existing?.statusId]
  );
  const defaultStatusId = workflowStatuses.find((s) => s.isDefault)?.id ?? workflowStatuses[0]?.id ?? '';

  const [title, setTitle] = useState(existing?.title ?? '');
  const [memo, setMemo] = useState(existing?.memo ?? '');
  const [memoFormat, setMemoFormat] = useState<'text' | 'markdown'>(existing?.memoFormat ?? 'text');
  const [statusId, setStatusId] = useState(existing?.statusId ?? defaultStatusId);
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'medium');
  const [startDate, setStartDate] = useState(dateToInputValue(existing?.startDate ?? null));
  const [dueDate, setDueDate] = useState(dateToInputValue(existing?.dueDate ?? null));
  const [category, setCategory] = useState(existing?.category ?? '');
  const [subCategory, setSubCategory] = useState(existing?.subCategory ?? '');
  const [expectedDeliverable, setExpectedDeliverable] = useState(existing?.expectedDeliverable ?? '');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(existing?.assigneeIds ?? []);
  const [links, setLinks] = useState<IssueLink[]>(existing?.links ?? []);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectLocked = isEdit || !!lockedParent;
  const workflowTypeLocked = isEdit || !!lockedParent;

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  function updateLink(index: number, patch: Partial<IssueLink>) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId || !workflowTypeId || !statusId) return;
    setSubmitting(true);
    setError(null);
    try {
      const parsedStartDate = startDate ? new Date(`${startDate}T00:00:00`) : null;
      const parsedDueDate = dueDate ? new Date(`${dueDate}T00:00:00`) : null;
      const cleanedLinks = links.filter((l) => l.label.trim() && l.url.trim());

      if (isEdit) {
        await updateIssue(existing!.id, {
          title: title.trim(),
          memo,
          memoFormat,
          statusId,
          priority,
          startDate: parsedStartDate,
          dueDate: parsedDueDate,
          category,
          subCategory,
          expectedDeliverable,
          assigneeIds,
          links: cleanedLinks,
        });
      } else {
        await createIssue({
          projectId,
          workflowTypeId,
          title: title.trim(),
          memo,
          memoFormat,
          parentId: lockedParent?.id ?? null,
          statusId,
          priority,
          startDate: parsedStartDate,
          dueDate: parsedDueDate,
          category,
          subCategory,
          expectedDeliverable,
          assigneeIds,
          links: cleanedLinks,
        });
      }
      onClose();
    } catch {
      setError('保存に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    if (!window.confirm('この課題を削除します。よろしいですか？')) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteIssue(existing.id);
      onClose();
    } catch {
      setError('削除に失敗しました。時間をおいて再度お試しください。');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-lg bg-white p-4 shadow-lg sm:p-6"
      >
        <h2 className="text-sm font-medium text-slate-700">
          {isEdit ? '課題を編集' : lockedParent ? `「${lockedParent.title}」の子課題を作成` : '新しい課題を作成'}
        </h2>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          タイトル
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            プロジェクト
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={projectLocked}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            種別
            <select
              value={workflowTypeId}
              onChange={(e) => {
                const nextId = e.target.value;
                setWorkflowTypeId(nextId);
                const next = statuses.filter((s) => s.workflowTypeId === nextId && !s.archived).sort((a, b) => a.order - b.order);
                setStatusId(next.find((s) => s.isDefault)?.id ?? next[0]?.id ?? '');
              }}
              disabled={workflowTypeLocked}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              {workflowTypes.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            ステータス
            <select
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              {workflowStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                  {s.archived ? '（アーカイブ済み）' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            優先度
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            開始日
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            期限
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            カテゴリー
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            サブカテゴリー
            <input
              type="text"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          想定成果物
          <input
            type="text"
            value={expectedDeliverable}
            onChange={(e) => setExpectedDeliverable(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm text-slate-600">
          担当者
          <div className="flex flex-wrap gap-2">
            {users.length === 0 && <span className="text-xs text-slate-400">ユーザーがいません</span>}
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-1 text-xs text-slate-600">
                <input type="checkbox" checked={assigneeIds.includes(u.id)} onChange={() => toggleAssignee(u.id)} />
                {u.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm text-slate-600">
          メモ
          <div className="flex gap-3 text-xs text-slate-500">
            <label className="flex items-center gap-1">
              <input type="radio" checked={memoFormat === 'text'} onChange={() => setMemoFormat('text')} />
              text
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={memoFormat === 'markdown'} onChange={() => setMemoFormat('markdown')} />
              markdown
            </label>
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>資料リンク</span>
            <button
              type="button"
              onClick={() => setLinks((prev) => [...prev, { label: '', url: '' }])}
              className="text-xs text-slate-500 underline underline-offset-2"
            >
              + リンクを追加
            </button>
          </div>
          {links.map((link, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                type="text"
                placeholder="ラベル"
                value={link.label}
                onChange={(e) => updateLink(i, { label: e.target.value })}
                className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500"
              />
              <input
                type="url"
                placeholder="https://..."
                value={link.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500"
              />
              <button
                type="button"
                onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                削除
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="mt-2 flex items-center justify-between">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                削除
              </button>
            )}
            {isEdit && props.onCreateChild && (
              <button
                type="button"
                onClick={() => props.onCreateChild!(existing!)}
                className="ml-2 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                + 子課題を追加
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="text-xs text-slate-500 underline underline-offset-2">
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting || !projectId || !workflowTypeId}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? '保存中...' : isEdit ? '更新する' : '作成する'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
