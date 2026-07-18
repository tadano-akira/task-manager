import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

// 管理者が1人も存在しない場合に限り、呼び出したユーザー自身をadminに昇格する
// 「最初の管理者」ブートストラップ用の関数。管理者が既に1人でもいれば以降は必ず失敗する
// （2人目以降の昇格は既存の管理者がユーザー管理画面から行う運用）。
export const claimFirstAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'サインインが必要です。');
  }

  const db = getFirestore();
  const existingAdmins = await db.collection('users').where('role', '==', 'admin').limit(1).get();
  if (!existingAdmins.empty) {
    throw new HttpsError('failed-precondition', '管理者は既に存在します。');
  }

  await db.collection('users').doc(request.auth.uid).update({ role: 'admin' });
  return { promoted: true };
});
