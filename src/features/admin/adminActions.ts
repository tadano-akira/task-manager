import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc } from 'firebase/firestore';
import { db, functions } from '../../lib/firebase';
import type { User } from '../issues/types';

export async function claimFirstAdmin(): Promise<void> {
  const call = httpsCallable(functions, 'claimFirstAdmin');
  await call();
}

export async function setUserRole(userId: string, role: User['role']) {
  await updateDoc(doc(db, 'users', userId), { role });
}
