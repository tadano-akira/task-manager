import { collection, deleteDoc, doc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { issueConverter } from '../../lib/firestoreConverters';
import type { IssueLink, Priority } from './types';

const issuesCollection = collection(db, 'issues').withConverter(issueConverter);

export interface IssueFormInput {
  projectId: string;
  workflowTypeId: string;
  title: string;
  memo: string;
  memoFormat: 'text' | 'markdown';
  parentId: string | null;
  statusId: string;
  assigneeIds: string[];
  priority: Priority;
  startDate: Date | null;
  dueDate: Date | null;
  category: string;
  subCategory: string;
  expectedDeliverable: string;
  links: IssueLink[];
}

// number はプロジェクト内で一意な連番。projects/{projectId}.issueCounter をトランザクションで
// アトミックにインクリメントして採番する（同時作成時の重複・欠番を防ぐため）。
export async function createIssue(input: IssueFormInput) {
  const projectRef = doc(db, 'projects', input.projectId);
  const issueRef = doc(issuesCollection);

  await runTransaction(db, async (tx) => {
    const projectSnap = await tx.get(projectRef);
    const nextNumber = ((projectSnap.data()?.issueCounter as number | undefined) ?? 0) + 1;

    tx.update(projectRef, { issueCounter: nextNumber });
    tx.set(issueRef, {
      id: '',
      number: nextNumber,
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

// projectId/workflowTypeId/parentId は作成後の変更を許可しない
// (子課題との整合性はRules側でも作成時のみ検証しており、後からの移動は別機能として扱う)。
export interface IssueEditableFields {
  title: string;
  memo: string;
  memoFormat: 'text' | 'markdown';
  statusId: string;
  assigneeIds: string[];
  priority: Priority;
  startDate: Date | null;
  dueDate: Date | null;
  category: string;
  subCategory: string;
  expectedDeliverable: string;
  links: IssueLink[];
}

export async function updateIssue(id: string, patch: IssueEditableFields) {
  await updateDoc(doc(db, 'issues', id), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteIssue(id: string) {
  await deleteDoc(doc(db, 'issues', id));
}
