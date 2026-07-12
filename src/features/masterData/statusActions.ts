import { addDoc, collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { statusConverter } from '../../lib/firestoreConverters';
import type { Status } from '../issues/types';

const statusesCollection = collection(db, 'statuses').withConverter(statusConverter);

export async function createStatus(
  input: { workflowTypeId: string; label: string; color: string; progressPercent: number },
  nextOrder: number
) {
  await addDoc(statusesCollection, {
    id: '',
    workflowTypeId: input.workflowTypeId,
    label: input.label,
    color: input.color,
    progressPercent: input.progressPercent,
    order: nextOrder,
    isDefault: false,
    archived: false,
  });
}

export async function updateStatus(
  id: string,
  patch: { label: string; color: string; progressPercent: number }
) {
  await writeBatch(db).update(doc(db, 'statuses', id), patch).commit();
}

export async function setStatusArchived(id: string, archived: boolean) {
  await writeBatch(db).update(doc(db, 'statuses', id), { archived }).commit();
}

// 仕様書2.2: 進捗フローの起点となる既定ステータスは同一workflowType内で1つのみとする。
// トランザクションではなく2フェーズの書き込みのため完全な排他性は保証しないが、
// 同時に複数管理者が編集しない前提のMVP運用としては十分とする。
export async function setDefaultStatus(workflowTypeId: string, statusId: string, siblingStatuses: Status[]) {
  const batch = writeBatch(db);
  for (const status of siblingStatuses) {
    if (status.workflowTypeId !== workflowTypeId) continue;
    if (status.isDefault && status.id !== statusId) {
      batch.update(doc(db, 'statuses', status.id), { isDefault: false });
    }
  }
  batch.update(doc(db, 'statuses', statusId), { isDefault: true });
  await batch.commit();
}

// siblingOrdered は同一workflowType内でorder昇順に並んだステータスリスト。
export async function moveStatus(siblingOrdered: Status[], index: number, direction: 'up' | 'down') {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= siblingOrdered.length) return;

  const a = siblingOrdered[index];
  const b = siblingOrdered[targetIndex];
  const batch = writeBatch(db);
  batch.update(doc(db, 'statuses', a.id), { order: b.order });
  batch.update(doc(db, 'statuses', b.id), { order: a.order });
  await batch.commit();
}
