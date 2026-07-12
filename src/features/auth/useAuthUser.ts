import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import type { User as UserProfile } from '../issues/types';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; authUser: FirebaseAuthUser; profile: UserProfile | null };

// Firebase Authのサインイン状態と、対応するFirestore側プロフィール（users/{uid}、role等）を
// あわせて購読する。profileはonUserCreate(Cloud Functions)またはsignUp直後のクライアント自己作成で
// 生成されるまで一時的にnullになりうるが、onSnapshotで反映され次第自動更新される。
export function useAuthUser(): AuthState {
  const [authUser, setAuthUser] = useState<FirebaseAuthUser | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => onAuthStateChanged(auth, setAuthUser), []);

  useEffect(() => {
    if (!authUser) {
      setProfile(null);
      return;
    }
    return onSnapshot(doc(db, 'users', authUser.uid), (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
    });
  }, [authUser]);

  if (authUser === undefined) return { status: 'loading' };
  if (authUser === null) return { status: 'signedOut' };
  return { status: 'signedIn', authUser, profile };
}
