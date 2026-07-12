import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type AuthError,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'メールアドレスの形式が正しくありません。',
  'auth/user-disabled': 'このアカウントは無効化されています。',
  'auth/user-not-found': 'メールアドレスまたはパスワードが正しくありません。',
  'auth/wrong-password': 'メールアドレスまたはパスワードが正しくありません。',
  'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません。',
  'auth/email-already-in-use': 'このメールアドレスは既に登録されています。',
  'auth/weak-password': 'パスワードは6文字以上で設定してください。',
  'auth/too-many-requests': '試行回数が多すぎます。しばらく待ってから再度お試しください。',
};

export function authErrorMessage(error: unknown): string {
  const code = (error as AuthError)?.code;
  return (code && ERROR_MESSAGES[code]) || 'エラーが発生しました。時間をおいて再度お試しください。';
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  // onUserCreate(Cloud Functions)がAuthトリガーで非同期にusers/{uid}を作成するが、
  // 反映までのタイムラグをなくすためクライアント側でも即時作成しておく
  // （Firestore Rulesはrole:'member'固定でのセルフプロビジョニングのみ許可）。
  await setDoc(doc(db, 'users', credential.user.uid), {
    id: credential.user.uid,
    name: email,
    avatarUrl: null,
    role: 'member',
  });
}

export async function signOutUser() {
  await signOut(auth);
}
