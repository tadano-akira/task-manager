import * as functionsV1 from 'firebase-functions/v1';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Authenticationでの新規登録時に users/{uid} を role: 'member' で自動作成する。
// 最初の管理者への昇格はFirebase Console等でroleフィールドを手動更新する運用とする。
// Auth向けのイベント駆動トリガーは firebase-functions v2 に直接の同等品がないため v1 を使用する
// （firebase-functionsパッケージはv1/v2を併用可能）。
export const onUserCreate = functionsV1.auth.user().onCreate(async (user) => {
  await getFirestore()
    .collection('users')
    .doc(user.uid)
    .set({
      id: user.uid,
      name: user.displayName ?? user.email ?? '(no name)',
      avatarUrl: user.photoURL ?? null,
      role: 'member',
    });
});
