import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

interface NotificationPayload {
  title: string;
  body: string;
}

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

// 指定ユーザーのfcmTokens(複数デバイス/ブラウザ分)にPUSH通知を送る。
// 無効化されたトークン(ブラウザ通知の許可取り消し等)はレスポンスを見て自動でクリーンアップする。
export async function sendNotificationToUsers(userIds: string[], payload: NotificationPayload) {
  if (userIds.length === 0) return;

  const db = getFirestore();
  const userDocs = await Promise.all(userIds.map((id) => db.collection('users').doc(id).get()));

  const tokenToUser = new Map<string, string>();
  for (const doc of userDocs) {
    const tokens: string[] = doc.data()?.fcmTokens ?? [];
    for (const token of tokens) tokenToUser.set(token, doc.id);
  }
  const tokens = [...tokenToUser.keys()];
  if (tokens.length === 0) return;

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    webpush: { fcmOptions: { link: '/' } },
  });

  const invalidTokensByUser = new Map<string, string[]>();
  response.responses.forEach((res, i) => {
    if (!res.success && res.error && INVALID_TOKEN_ERROR_CODES.has(res.error.code)) {
      const token = tokens[i];
      const userId = tokenToUser.get(token)!;
      if (!invalidTokensByUser.has(userId)) invalidTokensByUser.set(userId, []);
      invalidTokensByUser.get(userId)!.push(token);
    }
  });

  await Promise.all(
    [...invalidTokensByUser.entries()].map(([userId, invalidTokens]) =>
      db
        .collection('users')
        .doc(userId)
        .update({ fcmTokens: FieldValue.arrayRemove(...invalidTokens) })
    )
  );
}
