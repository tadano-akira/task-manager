# task-manager

Firebase + TypeScript で構築するタスク（課題）管理ツール。**プロジェクト（親課題／小課題）の3階層構造**を軸に、種別ごとに異なるステータスフローを持たせて進捗管理・担当者管理を行う。詳細な仕様は [docs/task-management-tool-spec.md](docs/task-management-tool-spec.md) を参照。

本番環境: https://task-mgr-tool.web.app

## 技術構成

| 分類 | 技術 |
|---|---|
| フロントエンド | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| バックエンド | Firebase（Firestore / Authentication / Cloud Functions v2 / Cloud Messaging / Hosting） |
| データベース | Cloud Firestore（asia-northeast1、`onSnapshot`によるリアルタイム同期） |
| 認証 | Firebase Authentication（メール/パスワード）+ Google Cloud Identity Platform（Authブロッキング関数用にアップグレード済み） |
| 権限制御 | Firestore Security Rules によるロールベース制御（admin / member） |
| 検索 | クライアントサイド全文検索（Fuse.js）+ Cloud Functions側でのkuromoji.js事前トークン化（分かち書き・読み仮名正規化） |
| 通知 | ブラウザPUSH通知（Firebase Cloud Messaging、Service Worker経由） |
| ホスティング | Firebase Hosting |

## 機能一覧

**認証・権限**
- メール/パスワードでのログイン・ログアウト（新規登録は現在停止中）
- 最初の管理者作成の仕組み（管理者が0人の間だけ自己昇格できるcallable関数）
- ユーザー管理画面（admin限定、ロールの昇格・降格）
- ロールベースFirestore Security Rules（admin / member）

**課題管理**
- プロジェクト（親課題／小課題）の3階層構造、子課題は親のproject/種別を継承
- 課題の作成・編集・削除（タイトル・詳細・開始日/期限・担当者・優先度・カテゴリー/サブカテゴリー・想定成果物・外部リンク）
- プロジェクト内で一意な課題番号の自動採番（`projects.code` + `issues.number` による識別ID、例: `AC-dev-001`）
- 種別ごとに異なるステータスフロー（種別・ステータスマスタはadmin限定で管理）

**ビュー**
- 課題リストビュー（ツリー表示・フィルタ・全文検索・期限アラート・ページネーション）
- カンバンビュー（種別を1つ選択して表示。ドラッグ&ドロップは未実装）

**管理機能**
- プロジェクト管理画面（作成・編集・アーカイブ/復元、プロジェクトコードの登録）
- 種別・ステータスマスタ管理画面（作成・編集・並び替え・既定ステータス設定・アーカイブ/復元、admin限定）

**通知**
- ブラウザPUSH通知（FCM）。担当者アサイン時・ステータス変更時・期限接近（日次バッチ）の3トリガー

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

## 実装状況(2026-07-19時点)

機能の詳細は上記「機能一覧」を参照。以下は補足・現在の運用状態。

- Firestoreからのリアルタイムデータ取得層(`onSnapshot`ベース、`issues`/`projects`/`workflowTypes`/`statuses`/`users`)
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
