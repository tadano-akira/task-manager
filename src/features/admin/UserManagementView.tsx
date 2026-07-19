import { useState } from 'react';
import type { User } from '../issues/types';
import { setUserRole } from './adminActions';

interface UserManagementViewProps {
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
}

export function UserManagementView({ users, currentUserId, isAdmin }: UserManagementViewProps) {
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return <p className="p-6 text-center text-sm text-slate-500">この画面は管理者のみ利用できます。</p>;
  }

  async function handleRoleChange(userId: string, role: User['role']) {
    setError(null);
    try {
      await setUserRole(userId, role);
    } catch {
      setError('ロールの変更に失敗しました。時間をおいて再度お試しください。');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="-mx-3 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[420px] border-collapse text-left sm:min-w-0">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-2 px-3 font-medium">ユーザー</th>
              <th className="py-2 px-3 font-medium">ロール</th>
              <th className="py-2 px-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-slate-400">
                  ユーザーがいません
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-2 px-3 text-sm text-slate-700">
                      {u.name}
                      {isSelf && <span className="ml-1.5 text-xs text-slate-400">(自分)</span>}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          u.role === 'admin'
                            ? 'border-amber-200 bg-amber-100 text-amber-700'
                            : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.role === 'admin' ? '管理者' : 'メンバー'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        disabled={isSelf}
                        onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'member' : 'admin')}
                        title={isSelf ? '自分自身のロールは変更できません' : undefined}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                      >
                        {u.role === 'admin' ? 'メンバーにする' : '管理者にする'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
