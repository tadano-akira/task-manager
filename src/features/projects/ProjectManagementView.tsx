import { useState, type FormEvent } from 'react';
import type { Project } from '../issues/types';
import { createProject, setProjectArchived, updateProject } from './projectActions';

const PRESET_COLORS = ['#0ea5e9', '#a855f7', '#ef4444', '#f59e0b', '#22c55e', '#64748b'];

interface ProjectFormState {
  id: string | null; // null = 新規作成
  name: string;
  color: string;
}

const EMPTY_FORM: ProjectFormState = { id: null, name: '', color: PRESET_COLORS[0] };

interface ProjectManagementViewProps {
  projects: Project[];
}

export function ProjectManagementView({ projects }: ProjectManagementViewProps) {
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [showArchived, setShowArchived] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleProjects = projects.filter((p) => showArchived || !p.archived);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      if (form.id) {
        await updateProject(form.id, { name: form.name.trim(), color: form.color });
      } else {
        await createProject({ name: form.name.trim(), color: form.color });
      }
      setForm(EMPTY_FORM);
    } catch {
      setError('保存に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(project: Project) {
    setForm({ id: project.id, name: project.name, color: project.color });
    setError(null);
  }

  async function toggleArchived(project: Project) {
    setError(null);
    try {
      await setProjectArchived(project.id, !project.archived);
    } catch {
      setError('更新に失敗しました。時間をおいて再度お試しください。');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-medium text-slate-700">
          {form.id ? 'プロジェクトを編集' : '新しいプロジェクトを作成'}
        </h2>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          プロジェクト名
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm text-slate-600">
          バッジ色
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color }))}
                className="h-6 w-6 rounded-full ring-offset-2"
                style={{ backgroundColor: color, boxShadow: form.color === color ? `0 0 0 2px ${color}` : 'none' }}
                aria-label={color}
              />
            ))}
            <input
              type="text"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              pattern="^#[0-9a-fA-F]{6}$"
              title="#rrggbb 形式で入力してください"
              className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? '保存中...' : form.id ? '更新する' : '作成する'}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(EMPTY_FORM)}
              className="text-xs text-slate-500 underline underline-offset-2"
            >
              キャンセル
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-1.5 self-end text-xs text-slate-500">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          アーカイブ済みも表示
        </label>

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-2 px-3 font-medium">プロジェクト</th>
              <th className="py-2 px-3 font-medium">状態</th>
              <th className="py-2 px-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visibleProjects.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-slate-400">
                  プロジェクトがありません
                </td>
              </tr>
            ) : (
              visibleProjects.map((project) => (
                <tr key={project.id} className="border-b border-slate-100">
                  <td className="py-2 px-3">
                    <span
                      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                      style={{ color: project.color, backgroundColor: `${project.color}14` }}
                    >
                      {project.name}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs text-slate-500">
                    {project.archived ? 'アーカイブ済み' : '稼働中'}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(project)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => toggleArchived(project)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        {project.archived ? '復元' : 'アーカイブ'}
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
  );
}
