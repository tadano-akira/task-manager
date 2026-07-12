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
function useCollectionData<T>(q: Query<T>): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({ data: [], loading: true, error: null });

  useEffect(() => {
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => d.data()), loading: false, error: null }),
      (error) => setState((s) => ({ ...s, loading: false, error }))
    );
  }, [q]);

  return state;
}

const projectsQuery = query(collection(db, 'projects').withConverter(projectConverter));
const workflowTypesQuery = query(collection(db, 'workflowTypes').withConverter(workflowTypeConverter), orderBy('order'));
const statusesQuery = query(collection(db, 'statuses').withConverter(statusConverter), orderBy('order'));
const usersQuery = query(collection(db, 'users').withConverter(userConverter));
const issuesQuery = query(collection(db, 'issues').withConverter(issueConverter));

export const useProjects = (): CollectionState<Project> => useCollectionData(projectsQuery);
export const useWorkflowTypes = (): CollectionState<WorkflowType> => useCollectionData(workflowTypesQuery);
export const useStatuses = (): CollectionState<Status> => useCollectionData(statusesQuery);
export const useUsers = (): CollectionState<User> => useCollectionData(usersQuery);
export const useIssues = (): CollectionState<Issue> => useCollectionData(issuesQuery);
