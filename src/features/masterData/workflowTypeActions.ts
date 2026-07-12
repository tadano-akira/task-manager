import { addDoc, collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { workflowTypeConverter } from '../../lib/firestoreConverters';
import type { WorkflowType } from '../issues/types';

const workflowTypesCollection = collection(db, 'workflowTypes').withConverter(workflowTypeConverter);

export async function createWorkflowType(input: { name: string; color: string }, nextOrder: number) {
  await addDoc(workflowTypesCollection, { id: '', name: input.name, color: input.color, order: nextOrder });
}

export async function updateWorkflowType(id: string, patch: { name: string; color: string }) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'workflowTypes', id), patch);
  await batch.commit();
}

// allOrdered は order昇順に並んだ現在の全種別リスト。隣接する要素とorderを入れ替える。
export async function moveWorkflowType(allOrdered: WorkflowType[], index: number, direction: 'up' | 'down') {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= allOrdered.length) return;

  const a = allOrdered[index];
  const b = allOrdered[targetIndex];
  const batch = writeBatch(db);
  batch.update(doc(db, 'workflowTypes', a.id), { order: b.order });
  batch.update(doc(db, 'workflowTypes', b.id), { order: a.order });
  await batch.commit();
}
