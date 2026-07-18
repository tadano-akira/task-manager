import { useEffect, useState } from 'react';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { listenForForegroundMessages, requestNotificationPermission } from '../../lib/firebaseMessaging';

export interface NotificationToast {
  id: number;
  title: string;
  body: string;
}

type PermissionState = NotificationPermission | 'unsupported';

function currentPermission(): PermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export function useNotifications(userId: string | undefined) {
  const [permission, setPermission] = useState<PermissionState>(currentPermission());
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  useEffect(() => {
    if (permission === 'unsupported') return;
    listenForForegroundMessages((title, body) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, title, body }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 8000);
    });
  }, [permission]);

  async function registerToken() {
    if (!userId) return;
    const token = await requestNotificationPermission();
    setPermission(currentPermission());
    if (token) {
      await updateDoc(doc(db, 'users', userId), { fcmTokens: arrayUnion(token) });
    }
  }

  // 許可が既に付与済み(過去にこのブラウザで許可した/権限が事前付与されている等)の場合、
  // ボタンは表示されないため、その場合は明示的な操作なしにトークン登録を行う。
  useEffect(() => {
    if (userId && permission === 'granted') {
      registerToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, permission]);

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { permission, toasts, enableNotifications: registerToken, dismissToast };
}
