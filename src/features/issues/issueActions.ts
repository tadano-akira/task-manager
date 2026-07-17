import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
  dueDate: Date | null;
  links: IssueLink[];
}

export async function createIssue(input: IssueFormInput) {
  await addDoc(issuesCollection, {
    id: '',
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
  dueDate: Date | null;
  links: IssueLink[];
}

export async function updateIssue(id: string, patch: IssueEditableFields) {
  await updateDoc(doc(db, 'issues', id), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteIssue(id: string) {
  await deleteDoc(doc(db, 'issues', id));
}
