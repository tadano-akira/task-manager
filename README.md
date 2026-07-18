# task-manager

Firebase + TypeScript で構築するタスク（課題）管理ツール。詳細な仕様は [docs/task-management-tool-spec.md](docs/task-management-tool-spec.md) を参照。

- **フロントエンド**: React + Vite + TypeScript + Tailwind CSS v4
- **バックエンド**: Firebase（Firestore / Authentication / Cloud Functions）
- **検索**: クライアントサイド全文検索（Fuse.js）+ Cloud Functions側でのkuromoji.js事前トークン化

## セットアップ

```bash
npm install
cp .env.example .env   # Firebaseプロジェクトの設定値を入力
npm run dev
```

`.env` には Firebase コンソール（プロジェクト設定 > 全般 > マイアプリ）で取得できるWebアプリの設定値を入れる。

PUSH通知（FCM）を使う場合は、Firebase Console > Project Settings > Cloud Messaging > Web configuration で「鍵ペアを生成」し、`VITE_FIREBASE_VAPID_KEY` に設定する。

### ローカルでEmulatorに接続する

本番データに触れずに動作確認したい場合:

```bash
firebase emulators:start --only firestore,auth,functions
```

別ターミナルで `.env.local` に `VITE_USE_FIREBASE_EMULATOR=true` を設定して `npm run dev` を起動すると、`src/lib/firebase.ts` が自動的にFirestore/Authエミュレータへ接続する。

## ディレクトリ構成

```
src/
  features/
    admin/          # 最初の管理者作成(claimFirstAdmin callable呼び出し)・ユーザー管理画面(admin限定)
    auth/          # Firebase Authログイン・サインアップ・useAuthUser(認証状態+Firestoreプロフィール購読)
    issues/         # 課題ドメイン: 型定義・ツリー構築/フィルタ/ソート・全文検索・リストビュー/カンバンビューUI・作成/編集モーダル
    masterData/     # 種別(workflowTypes)・ステータス(statuses)マスタ管理画面(admin限定)
    notifications/  # 通知許可・FCMトークン登録・フォアグラウンドトースト表示
    projects/       # プロジェクト管理画面(作成・編集・アーカイブ)
  lib/
    firebase.ts             # Firebase初期化(+ Emulator接続opt-in)
    firebaseMessaging.ts    # FCM許可リクエスト・トークン取得・フォアグラウンドリスナー
    firestoreConverters.ts  # Firestore⇔ドメイン型の変換(Timestamp⇔Date等)
  App.tsx           # 認証ゲート・ナビ・各ビューの統合

public/
  firebase-messaging-sw.js  # バックグラウンドPUSH通知表示用Service Worker

functions/          # Cloud Functions(Firebase Functions標準構成)
  src/
    index.ts            # エクスポート一覧
    onUserCreate.ts      # Authユーザー作成時にusers/{uid}をrole:'member'で自動作成
    claimFirstAdmin.ts   # 管理者が1人も存在しない場合のみ呼び出しユーザーをadminに昇格するcallable
    tokenizeIssue.ts     # issue書き込み時にkuromoji.jsで検索用トークン化(searchTokens/searchReading)
    notifications.ts     # 担当者アサイン/ステータス変更時のPUSH通知 + 期限接近の日次バッチ通知
    messagingUtils.ts    # FCM送信共通処理・無効トークンのクリーンアップ
    blockNewSignups.ts   # 新規登録を一時停止するAuthブロッキング関数(要GCIP、詳細は下記)
  scripts/copy-shared.mjs # ビルド前にリポジトリ直下のshared/をfunctions/shared/へ同期(Functionsは自ディレクトリしかデプロイされないため)

shared/
  kanaUtils.ts      # カタカナ→ひらがな正規化(フロントエンドとCloud Functions双方から参照される共有実装)

docs/
  task-management-tool-spec.md  # 仕様書

firestore.rules / firestore.indexes.json / firebase.json  # Firestore・Functions・Hostingの設定
```

## 実装状況(2026-07-12時点)

実装済み:

- Firebase Authによるメール/パスワード ログイン・サインアップ・ログアウト
- Firestoreからのリアルタイムデータ取得層(`onSnapshot`ベース、`issues`/`projects`/`workflowTypes`/`statuses`/`users`)
- 課題リストビュー(ツリー表示・フィルタ・全文検索・期限アラート・ページネーション)
- 課題の作成・編集モーダル(子課題は親のproject/種別を継承・固定、削除も可)
- カンバンビュー(種別を1つ選択して表示。表示のみ、ドラッグ&ドロップは未実装)
- プロジェクト管理画面(作成・編集・アーカイブ/復元)
- 種別・ステータスマスタ管理画面(admin限定。作成・編集・並び替え・既定ステータス設定・アーカイブ/復元)
- 最初の管理者作成の仕組み(管理者0人の間だけ自己昇格可能な`claimFirstAdmin`)+ ユーザー管理画面(admin限定、ロールの昇格・降格)
- ロールベースFirestore Security Rules(admin/member、種別・ステータスマスタはadmin限定、子課題のprojectId/workflowTypeId整合性チェック等)
- ブラウザPUSH通知(FCM)。担当者アサイン時・ステータス変更時・期限接近(日次バッチ)の3トリガー。メール通知は対応しない
- **新規登録を一時停止中**(`blockNewSignups`、Authブロッキング関数)。検証用アカウント作成後に閉じた。フロントエンドの「新規登録」導線も非表示(`LoginPage.tsx`の`SIGNUPS_ENABLED = false`)。再開手順は仕様書2.5参照
- Cloud Functions 6本を本番デプロイ済み(`tokenizeIssue`・`onUserCreate`・`claimFirstAdmin`・`onIssueWrittenNotify`・`notifyDueDateApproaching`・`blockNewSignups`)

未実装(次のステップ候補):

- カンバンビューでのドラッグ&ドロップによるステータス変更

対応しない方針:

- ガントチャート(不要と判断)
- メール通知(PUSH通知のみで運用)

**既知の制約**: ブラウザPUSH通知はヘッドレス/自動化ブラウザやシークレットウィンドウでは配信されない(Chrome自体の仕様)。配信確認は通常ウィンドウでの手動テストが必要。

## Firebaseプロジェクト

- プロジェクトID: `task-manager-app-shishido`(Blazeプラン、Firestoreリージョン: asia-northeast1、Google Cloud Identity Platformへアップグレード済み)
- Firebase Console: https://console.firebase.google.com/project/task-manager-app-shishido/overview
- **Hosting URL**: https://task-mgr-tool.web.app（`firebase deploy --only hosting` でデプロイ。デフォルトの `task-manager-app-shishido.web.app` は未使用）

## 主なnpmスクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 型チェック + 本番ビルド |
| `npm --prefix functions run build` | Cloud Functionsのビルド(shared/の同期を含む) |
| `npm --prefix functions run deploy` | Cloud Functionsのビルド + デプロイ |
