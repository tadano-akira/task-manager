import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, type Query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  issueConverter,
  projectConverter,
  statusConverter,
  userConverter,
  workflowTypeConverter,
} from '../../lib/firestoreConverters';
import type { Issue, Project, Status, User, WorkflowType } from './types';

interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

// 各コレクションをonSnapshotでリアルタイム購読する共通フック。
// クエリはモジュール読み込み時に一度だけ構築するため参照は安定しており、
// フィルタ・検索・ツリー構築は既存のクライアントサイドロジック（sortAndFilter.ts/useIssueSearch.ts）に委ねる。
//
// enabled はサインイン完了後にのみ購読を開始するためのフラグ。
// onSnapshotはエラー（permission-deniedなど）が発生するとリスナーが終了し自動再購読しないため、
// サインイン前に購読を始めてしまうと、サインイン後もエラー状態のまま復帰できなくなる。
// そのため enabled が false の間は購読自体を行わない。
function useCollectionData<T>(q: Query<T>, enabled: boolean): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!enabled) {
      setState({ data: [], loading: true, error: null });
      return;
    }
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => d.data()), loading: false, error: null }),
      (error) => setState((s) => ({ ...s, loading: false, error }))
    );
  }, [q, enabled]);

  return state;
}

const projectsQuery = query(collection(db, 'projects').withConverter(projectConverter));
const workflowTypesQuery = query(collection(db, 'workflowTypes').withConverter(workflowTypeConverter), orderBy('order'));
const statusesQuery = query(collection(db, 'statuses').withConverter(statusConverter), orderBy('order'));
const usersQuery = query(collection(db, 'users').withConverter(userConverter));
const issuesQuery = query(collection(db, 'issues').withConverter(issueConverter));

export const useProjects = (enabled: boolean): CollectionState<Project> => useCollectionData(projectsQuery, enabled);
export const useWorkflowTypes = (enabled: boolean): CollectionState<WorkflowType> =>
  useCollectionData(workflowTypesQuery, enabled);
export const useStatuses = (enabled: boolean): CollectionState<Status> => useCollectionData(statusesQuery, enabled);
export const useUsers = (enabled: boolean): CollectionState<User> => useCollectionData(usersQuery, enabled);
export const useIssues = (enabled: boolean): CollectionState<Issue> => useCollectionData(issuesQuery, enabled);
