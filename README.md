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

### ローカルでEmulatorに接続する

本番データに触れずに動作確認したい場合:

```bash
firebase emulators:start --only firestore,auth
```

別ターミナルで `.env.local` に `VITE_USE_FIREBASE_EMULATOR=true` を設定して `npm run dev` を起動すると、`src/lib/firebase.ts` が自動的にFirestore/Authエミュレータへ接続する。

## ディレクトリ構成

```
src/
  features/
    auth/          # Firebase Authログイン・サインアップ・useAuthUser(認証状態+Firestoreプロフィール購読)
    issues/         # 課題ドメイン: 型定義・ツリー構築/フィルタ/ソート・全文検索・リストビュー/カンバンビューUI・作成/編集モーダル
    masterData/     # 種別(workflowTypes)・ステータス(statuses)マスタ管理画面(admin限定)
    projects/       # プロジェクト管理画面(作成・編集・アーカイブ)
  lib/
    firebase.ts             # Firebase初期化(+ Emulator接続opt-in)
    firestoreConverters.ts  # Firestore⇔ドメイン型の変換(Timestamp⇔Date等)
  App.tsx           # 認証ゲート・ナビ・各ビューの統合

functions/          # Cloud Functions(Firebase Functions標準構成)
  src/
    index.ts            # エクスポート一覧
    onUserCreate.ts      # Authユーザー作成時にusers/{uid}をrole:'member'で自動作成
    tokenizeIssue.ts     # issue書き込み時にkuromoji.jsで検索用トークン化(searchTokens/searchReading)
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
- ロールベースFirestore Security Rules(admin/member、種別・ステータスマスタはadmin限定、子課題のprojectId/workflowTypeId整合性チェック等)
- Cloud Functions 2本を本番デプロイ済み(`tokenizeIssue`・`onUserCreate`)

未実装(次のステップ候補):

- ガントチャート
- カンバンビューでのドラッグ&ドロップによるステータス変更
- 最初の管理者アカウントを作る仕組み(現状Firebase Consoleでの手動編集のみ)
- 通知機能(期限接近・ステータス変更等、仕様書3章で初期スコープ外と明記)

## Firebaseプロジェクト

- プロジェクトID: `task-manager-app-shishido`(Blazeプラン、Firestoreリージョン: asia-northeast1)
- Firebase Console: https://console.firebase.google.com/project/task-manager-app-shishido/overview

## 主なnpmスクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 型チェック + 本番ビルド |
| `npm --prefix functions run build` | Cloud Functionsのビルド(shared/の同期を含む) |
| `npm --prefix functions run deploy` | Cloud Functionsのビルド + デプロイ |
