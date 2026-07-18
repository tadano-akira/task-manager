import { useState } from 'react';
import { IssueListView } from './features/issues/IssueListView';
import { KanbanView } from './features/issues/KanbanView';
import { IssueFormModal } from './features/issues/IssueFormModal';
import type { Issue } from './features/issues/types';
import { useAuthUser } from './features/auth/useAuthUser';
import { LoginPage } from './features/auth/LoginPage';
import { signOutUser } from './features/auth/authActions';
import { useIssues, useProjects, useStatuses, useUsers, useWorkflowTypes } from './features/issues/useFirestoreIssueData';
import { ProjectManagementView } from './features/projects/ProjectManagementView';
import { MasterDataView } from './features/masterData/MasterDataView';
import { AdminBootstrapBanner } from './features/admin/AdminBootstrapBanner';
import { UserManagementView } from './features/admin/UserManagementView';
import { useNotifications } from './features/notifications/useNotifications';
import { NotificationToasts } from './features/notifications/NotificationToasts';

type View = 'issues' | 'kanban' | 'projects' | 'masterData' | 'userManagement';
type IssueModalState = { mode: 'create'; parent: Issue | null } | { mode: 'edit'; issue: Issue } | null;

function App() {
  const authState = useAuthUser();
  const [view, setView] = useState<View>('issues');
  const [issueModal, setIssueModal] = useState<IssueModalState>(null);
  const isSignedIn = authState.status === 'signedIn';
  const currentUid = authState.status === 'signedIn' ? authState.authUser.uid : undefined;
  const { permission, toasts, enableNotifications, dismissToast } = useNotifications(currentUid);

  const projects = useProjects(isSignedIn);
  const workflowTypes = useWorkflowTypes(isSignedIn);
  const statuses = useStatuses(isSignedIn);
  const users = useUsers(isSignedIn);
  const issues = useIssues(isSignedIn);

  if (authState.status === 'loading') {
    return <div className="p-6 text-center text-sm text-slate-500">読み込み中...</div>;
  }

  if (authState.status === 'signedOut') {
    return <LoginPage />;
  }

  const { authUser, profile } = authState;
  const isAdmin = profile?.role === 'admin';

  const dataLoading =
    projects.loading || workflowTypes.loading || statuses.loading || users.loading || issues.loading;
  const dataError = projects.error ?? workflowTypes.error ?? statuses.error ?? users.error ?? issues.error;
  const noAdminYet = !users.loading && !users.data.some((u) => u.role === 'admin');

  function openIssue(issueId: string) {
    const issue = issues.data.find((i) => i.id === issueId);
    if (issue) setIssueModal({ mode: 'edit', issue });
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <NotificationToasts toasts={toasts} onDismiss={dismissToast} />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-slate-800">タスク管理</h1>
          <nav className="flex gap-1 text-sm">
            <button
              onClick={() => setView('issues')}
              className={`rounded-md px-3 py-1.5 ${view === 'issues' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              課題一覧
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`rounded-md px-3 py-1.5 ${view === 'kanban' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              カンバン
            </button>
            <button
              onClick={() => setView('projects')}
              className={`rounded-md px-3 py-1.5 ${view === 'projects' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              プロジェクト管理
            </button>
            {isAdmin && (
              <button
                onClick={() => setView('masterData')}
                className={`rounded-md px-3 py-1.5 ${view === 'masterData' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                種別・ステータス管理
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setView('userManagement')}
                className={`rounded-md px-3 py-1.5 ${view === 'userManagement' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                ユーザー管理
              </button>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          {permission === 'default' && (
            <button
              onClick={() => enableNotifications()}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              🔔 通知を有効にする
            </button>
          )}
          {permission === 'denied' && (
            <span
              className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700"
              title="ブラウザの設定でこのサイトの通知がブロックされています。アドレスバー左側のアイコンから「通知」を許可に変更してください。"
            >
              🔕 通知がブロックされています
            </span>
          )}
          {(view === 'issues' || view === 'kanban') && (
            <button
              onClick={() => setIssueModal({ mode: 'create', parent: null })}
              disabled={projects.data.length === 0 || workflowTypes.data.length === 0}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              + 新規課題
            </button>
          )}
          <span>{profile?.name ?? authUser.email}</span>
          <button
            onClick={() => signOutUser()}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            ログアウト
          </button>
        </div>
      </div>

      {noAdminYet && <AdminBootstrapBanner />}

      {dataError && (
        <p className="mb-4 text-sm text-red-600">データの取得に失敗しました: {dataError.message}</p>
      )}

      {dataLoading ? (
        <div className="p-6 text-center text-sm text-slate-500">読み込み中...</div>
      ) : view === 'projects' ? (
        <ProjectManagementView projects={projects.data} />
      ) : view === 'masterData' ? (
        <MasterDataView workflowTypes={workflowTypes.data} statuses={statuses.data} isAdmin={isAdmin} />
      ) : view === 'userManagement' ? (
        <UserManagementView users={users.data} currentUserId={authUser.uid} isAdmin={isAdmin} />
      ) : view === 'kanban' ? (
        <KanbanView
          issues={issues.data}
          projects={projects.data}
          workflowTypes={workflowTypes.data}
          statuses={statuses.data}
          users={users.data}
          currentUserId={authUser.uid}
          onIssueClick={openIssue}
        />
      ) : (
        <IssueListView
          issues={issues.data}
          projects={projects.data}
          workflowTypes={workflowTypes.data}
          statuses={statuses.data}
          users={users.data}
          currentUserId={authUser.uid}
          onIssueClick={openIssue}
        />
      )}

      {issueModal && (
        <IssueFormModal
          {...issueModal}
          projects={projects.data}
          workflowTypes={workflowTypes.data}
          statuses={statuses.data}
          users={users.data}
          onClose={() => setIssueModal(null)}
          onCreateChild={(parent) => setIssueModal({ mode: 'create', parent })}
        />
      )}
    </div>
  );
}

export default App;
