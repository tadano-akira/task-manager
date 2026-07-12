import { IssueListView } from './features/issues/IssueListView';
import { useAuthUser } from './features/auth/useAuthUser';
import { LoginPage } from './features/auth/LoginPage';
import { signOutUser } from './features/auth/authActions';
import { useIssues, useProjects, useStatuses, useUsers, useWorkflowTypes } from './features/issues/useFirestoreIssueData';

function App() {
  const authState = useAuthUser();

  const projects = useProjects();
  const workflowTypes = useWorkflowTypes();
  const statuses = useStatuses();
  const users = useUsers();
  const issues = useIssues();

  if (authState.status === 'loading') {
    return <div className="p-6 text-center text-sm text-slate-500">読み込み中...</div>;
  }

  if (authState.status === 'signedOut') {
    return <LoginPage />;
  }

  const { authUser, profile } = authState;

  const dataLoading =
    projects.loading || workflowTypes.loading || statuses.loading || users.loading || issues.loading;
  const dataError = projects.error ?? workflowTypes.error ?? statuses.error ?? users.error ?? issues.error;

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

      {dataError && (
        <p className="mb-4 text-sm text-red-600">データの取得に失敗しました: {dataError.message}</p>
      )}

      {dataLoading ? (
        <div className="p-6 text-center text-sm text-slate-500">読み込み中...</div>
      ) : (
        <IssueListView
          issues={issues.data}
          projects={projects.data}
          workflowTypes={workflowTypes.data}
          statuses={statuses.data}
          users={users.data}
          currentUserId={authUser.uid}
        />
      )}
    </div>
  );
}

export default App;
