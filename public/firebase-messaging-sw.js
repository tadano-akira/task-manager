// Firebase Cloud Messaging: バックグラウンド(タブ非フォーカス時)の通知表示用Service Worker。
// Service WorkerはVite経由のimport.meta.envを参照できないため、Firebase設定値をここに直接記述する
// (Firebase Web SDKの設定値は公開情報であり、シークレットではない)。
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBiroZBT2Sg12FaWjwet3rw8StFwFL8JrQ',
  authDomain: 'task-manager-app-shishido.firebaseapp.com',
  projectId: 'task-manager-app-shishido',
  storageBucket: 'task-manager-app-shishido.firebasestorage.app',
  messagingSenderId: '986539314626',
  appId: '1:986539314626:web:c2f01f4f8e059772de1a5b',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'タスク管理';
  self.registration.showNotification(title, {
    body: payload.notification?.body ?? '',
    icon: '/favicon.svg',
  });
});
