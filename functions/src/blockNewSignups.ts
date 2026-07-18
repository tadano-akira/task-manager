import { beforeUserCreated, HttpsError } from 'firebase-functions/v2/identity';

// 現在、新規登録を一時的に停止している。テスト用に必要なアカウントは作成済みのため、
// これ以上の第三者による自己登録を防ぐ。フロントエンドのサインアップ導線を隠すだけでは
// クライアントAPIを直接叩けば作成できてしまうため、Auth側でブロックする（実質的な制御はこちら）。
// 再開する場合はこの関数のexportを外してデプロイし直す。
export const blockNewSignups = beforeUserCreated(async () => {
  throw new HttpsError('permission-denied', '現在、新規登録は停止しています。');
});
