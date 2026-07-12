import { useState } from 'react';
import { IssueListView } from './features/issues/IssueListView';
import { useAuthUser } from './features/auth/useAuthUser';
import { LoginPage } from './features/auth/LoginPage';
import { signOutUser } from './features/auth/authActions';
import { useIssues, useProjects, useStatuses, useUsers, useWorkflowTypes } from './features/issues/useFirestoreIssueData';
import { ProjectManagementView } from './features/projects/ProjectManagementView';
import { MasterDataView } from './features/masterData/MasterDataView';

type View = 'issues' | 'projects' | 'masterData';

function App() {
  const authState = useAuthUser();
  const [view, setView] = useState<View>('issues');
  const isSignedIn = authState.status === 'signedIn';

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

  return (
    <div className="mx-auto max-w-6xl p-6">
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
          </nav>
        </div>
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
      ) : view === 'projects' ? (
        <ProjectManagementView projects={projects.data} />
      ) : view === 'masterData' ? (
        <MasterDataView workflowTypes={workflowTypes.data} statuses={statuses.data} isAdmin={isAdmin} />
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
