import { IssueListView } from './features/issues/IssueListView';
import type { Issue, Project, Status, User, WorkflowType } from './features/issues/types';
import { useAuthUser } from './features/auth/useAuthUser';
import { LoginPage } from './features/auth/LoginPage';
import { signOutUser } from './features/auth/authActions';

const projects: Project[] = [
  { id: 'proj-1', name: 'mopeo HP', color: '#0ea5e9', archived: false },
  { id: 'proj-2', name: 'kaikei-app', color: '#a855f7', archived: false },
];

const workflowTypes: WorkflowType[] = [
  { id: 'wf-feature', name: '新機能開発', color: '#0ea5e9', order: 0 },
  { id: 'wf-bug', name: 'bug対応', color: '#ef4444', order: 1 },
];

const statuses: Status[] = [
  { id: 'st-f-1', workflowTypeId: 'wf-feature', label: '内容確認', progressPercent: 10, order: 0, color: '#94a3b8', isDefault: true },
  { id: 'st-f-2', workflowTypeId: 'wf-feature', label: '実装中', progressPercent: 40, order: 1, color: '#3b82f6', isDefault: false },
  { id: 'st-f-3', workflowTypeId: 'wf-feature', label: '完了・リリース', progressPercent: 100, order: 2, color: '#22c55e', isDefault: false },
  { id: 'st-b-1', workflowTypeId: 'wf-bug', label: '報告受付', progressPercent: 10, order: 0, color: '#94a3b8', isDefault: true },
  { id: 'st-b-2', workflowTypeId: 'wf-bug', label: '原因調査', progressPercent: 50, order: 1, color: '#f59e0b', isDefault: false },
  { id: 'st-b-3', workflowTypeId: 'wf-bug', label: 'クローズ', progressPercent: 100, order: 2, color: '#22c55e', isDefault: false },
];

const users: User[] = [
  { id: 'user-1', name: '宍戸', role: 'admin' },
  { id: 'user-2', name: '田中', role: 'member' },
];

const now = new Date();
const inDays = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

const issues: Issue[] = [
  {
    id: 'issue-1',
    projectId: 'proj-1',
    workflowTypeId: 'wf-feature',
    title: 'ダークテーマ対応',
    memo: 'サイト全体にダークテーマを適用する',
    memoFormat: 'text',
    parentId: null,
    statusId: 'st-f-2',
    assigneeIds: ['user-1'],
    priority: 'high',
    dueDate: inDays(-1),
    links: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'issue-1-1',
    projectId: 'proj-1',
    workflowTypeId: 'wf-feature',
    title: 'ヘッダーの配色調整',
    memo: '',
    memoFormat: 'text',
    parentId: 'issue-1',
    statusId: 'st-f-1',
    assigneeIds: ['user-2'],
    priority: 'medium',
    dueDate: inDays(2),
    links: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'issue-2',
    projectId: 'proj-2',
    workflowTypeId: 'wf-bug',
    title: 'ゲストモードでログインが失敗する',
    memo: 'Firebase Authのエラーを再現できず調査中',
    memoFormat: 'text',
    parentId: null,
    statusId: 'st-b-2',
    assigneeIds: [],
    priority: 'high',
    dueDate: inDays(10),
    links: [],
    createdAt: now,
    updatedAt: now,
  },
];

function App() {
  const authState = useAuthUser();

  if (authState.status === 'loading') {
    return <div className="p-6 text-center text-sm text-slate-500">読み込み中...</div>;
  }

  if (authState.status === 'signedOut') {
    return <LoginPage />;
  }

  const { authUser, profile } = authState;
  // issues/projects/statuses等はまだFirestoreからの実データ取得層が未実装のためモックのまま。
  // 担当者一覧にはサインイン中の実ユーザーを反映し、ヘッダーの表示・ログアウトを機能させる。
  const usersWithCurrent = profile && !users.some((u) => u.id === profile.id) ? [...users, profile] : users;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">タスク管理</h1>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>{profile?.name ?? authUser.email}</span>
          <button
            onClick={() => signOutUser()}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            ログアウト
          </button>
        </div>
      </div>
      <IssueListView
        issues={issues}
        projects={projects}
        workflowTypes={workflowTypes}
        statuses={statuses}
        users={usersWithCurrent}
        currentUserId={authUser.uid}
      />
    </div>
  );
}

export default App;
