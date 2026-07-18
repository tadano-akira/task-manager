import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app } from './firebase';

export async function requestNotificationPermission(): Promise<string | null> {
  if (!(await isSupported())) return null;
  if (typeof Notification === 'undefined') return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error('VITE_FIREBASE_VAPID_KEY が設定されていません。');
    return null;
  }

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const messaging = getMessaging(app);
  return getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
}

export function listenForForegroundMessages(onReceive: (title: string, body: string) => void) {
  isSupported().then((supported) => {
    if (!supported) return;
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      onReceive(payload.notification?.title ?? 'タスク管理', payload.notification?.body ?? '');
    });
  });
}
