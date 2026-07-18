# タスク管理ツール 仕様書

## 1. 概要

Firebase + TypeScript で構築するシンプルなタスク（課題）管理ツール。
**プロジェクト（親課題／小課題）の3階層構造**を軸に、**種別（新機能開発／bug対応／調査報告／UI-UX改善／既存機能修正 等）ごとに異なるステータスフロー**を持たせ、進捗管理と担当者・期限管理をダッシュボードによる一覧性で実現する。

- **フロントエンド**: TypeScript（React + Vite を想定）
- **バックエンド**: Firebase（Firestore / Auth / Cloud Functions / FCM）
- **検索**: クライアントサイド全文検索（Fuse.js）→ サーバーレス・無料構成
- **想定規模**: 個人〜小規模チーム（数百〜数千件の課題規模を想定）

---

## 2. 機能要件

### 2.1 プロジェクト・課題管理

| 機能 | 内容 |
|---|---|
| プロジェクト | 課題の最上位グループ。**プロジェクト（親課題／小課題）** の3階層構造の起点となる |
| 種別（ワークフロー種別） | 親課題ごとに「新機能開発」「bug対応」「調査報告」「UI-UX改善」「既存機能修正」等の種別を1つ選択する。**プロセスが異なるため種別ごとに専用のステータスフローを持つ**（詳細は2.2） |
| 課題登録 | タイトル・詳細・期限・担当者・ステータスを持つ課題をそれぞれのプロジェクト配下に作成 |
| 親子構造 | 課題に親課題を指定し、小課題としてぶら下げられる（`parentId` によるフラット構造）。子課題は親課題と同じプロジェクト・同じ種別に属する（**種別は親課題で選択、小課題は自動継承。個別上書きは不可**） |
| メモ | text / Markdown 形式でメモを記録 |
| 資料添付 | ファイル実体は持たず、Google Drive / Box 等の外部URLをリンクとして登録 |
| 期限 | 課題ごとに期限日を設定 |
| 担当者 | 課題ごとに担当者（ユーザー）を1名以上アサイン可能 |

> ダッシュボード（リストビュー）は「担当条件を一目で確認したい」という初期の要件に合わせ、**プロジェクト横断で表示**することを基本とし、プロジェクトはフィルタ条件・バッジ表示の対象とし特定プロジェクトに絞り込んだ表示も可能にする。

### 2.2 ステータス管理

- **ステータスは種別（ワークフロー種別）ごとに独立したフローとして管理する。** プロセスが異なる業務（新機能開発／bug対応／調査報告／UI-UX改善／既存機能修正 等）を1つのステータス一覧で無理に展開せず、種別ごとに専用のステータス集合を持たせる。
- 各ステータスは所属する種別（`workflowTypeId`）を持ち、管理者が種別ごとに自由に登録・編集・並び替え可能
- 各ステータスに **進捗率（0〜100%）** を紐付け、フローに沿った順序で表示。`order`・`progressPercent` は同一種別内でのみ意味を持つ比較軸とする
  - 例：新機能開発の場合）：内容確認(10%) → 課題整理(20%) → 実装計画(30%) → 実装中(40%) → test clear(50%) → レビュー中(60%) → レビュー完了(70%) → 実装済み(80%) → STG-deploy確認済み → リリース待ち(90%) → 完了・リリース(100%)
  - 例：bug対応の場合）：報告受付(10%) → 再現確認(30%) → 原因調査(50%) → 修正実装(70%) → 修正確認(90%) → クローズ(100%) のように、新機能開発とは異なる粒度・順序のフローを個別定義できる。
- 初期実装ではステータス遷移は自由（同一種別内で任意のステータス間を移動可）。将来的に `allowedNextStatuses` でフロー制御を追加可能な設計とする
- 使用中のステータスは削除不可（アーカイブのみ）とし、データ不整合を防ぐ（`statuses.archived` フィールドとして実装済み。詳細は4.4）
- 種別自体も管理者が自由に追加・編集・並び替え可能（初期値として「新機能開発」「bug対応」「調査報告」「UI-UX改善」「既存機能修正」を想定）
- **種別・ステータスマスタの管理画面（作成・編集・並び替え・既定ステータス設定・アーカイブ/復元）を実装済み**（admin限定、`src/features/masterData/MasterDataView.tsx`）

### 2.3 ダッシュボード

- 自分が担当する課題の一覧表示
- 期限が近い課題のアラート表示（閾値は設定可能とし、初期値3日）
- ステータス列を用いたカンバンボード表示（進捗率順に列を配置）

#### ビュー実装優先順位

1. **リストビュー（MVP・詳細設計確定）** — 実装済み
2. **カンバンビュー** — 実装済み（`src/features/issues/KanbanView.tsx`）
   - ステータスの `order` / `progressPercent` に沿って列を並べる
   - **ステータス集合が種別ごとに異なるため、カンバンビューは種別を1つ選択した状態で表示する**（プロジェクト横断・種別横断での単一ボード表示は行わない）
   - アーカイブ済みステータスは列ごと非表示にするが、既存の課題が残っている場合はその列のみ末尾に表示する（データを見失わないため）
   - フィルタ・検索・ツリー構築・ソートはリストビュー（`sortAndFilter.ts`/`useIssueSearch.ts`）とロジックを共通化。ただしカンバンのカードはツリーのインデントは行わず、子課題には親タイトルのヒントのみ表示するフラット表示とする
   - 初期実装は表示のみとし、ドラッグ&ドロップでのステータス変更は未実装（後続追加）。カードクリックで既存の編集モーダルを開き、ステータスはそこから手動変更する運用
3. ~~ガントチャート（期限俯瞰ビュー）~~ — **実装しない方針に決定（不要と判断）**

#### リストビュー 詳細仕様

**表示列**

| 列 | 内容 |
|---|---|
| プロジェクト/種別 | プロジェクト名（バッジ）＋種別名を併記（プロジェクト横断ビューでの識別用） |
| タイトル | 親子課題はインデントでツリー表示（`parentId` を辿って深さ分だけ字下げ） |
| ステータス | ラベル（進捗率）をバッジ表示。バッジ色はステータスごとに設定（`statuses.color`）。表示されるステータスはその課題の種別に紐づくもの |
| 優先度 | 高（赤）・中（黄）・低（グレー）のバッジ表示 |
| 担当者 | アイコン（名前併記）複数アサイン可 |
| 期限 | 日付表示。期限超過は赤、期限接近（閾値3日以内）は黄色で行を強調 |

**ソート・フィルタ**

- デフォルトソート：**優先度（高→低） → 期限（近い順）** の複合ソート。**兄弟課題（同じ親を持つ課題）単位でソートし、親子の隣接関係とインデント表示を維持する**
- フィルタ：プロジェクト・種別・担当者・ステータス・優先度（それぞれ複数選択可）
  - ステータスフィルタは**種別ごとにグルーピング表示**する（種別が増えてもどれが表示で選ぶかに迷わないため）
- 「自分の担当のみ」トグル
- 検索（Fuse.js による全文検索。対象：タイトル・メモ・トークン・読み。ひらがな検索対応）

**表示件数**

- ページネーション方式（1ページ25件を初期値とし、無限スクロールへの切替が可能な構造にする）

**コンポーネント構成**

```
<IssueListView>
  ├─ 期限アラートサマリー（期限超過n件・期限接近n件）
  ├─ 検索バー（Fuse.js） + 自分の担当のみトグル
  ├─ フィルタバー（優先度・ステータス）
  ├─ <IssueTable>
  │    ├─ <IssueRow />  // ツリーインデント・バッジ・期限アラート色分け
  ├─ ページネーション
```

データフローは、Firestoreから取得した issues/statuses/users の生データ → ツリー構築（`parentId`） → フィルタ適用 → 優先度→期限ソート → 描画用データ生成、の順で処理される。カンバンビュー実装時もツリー構築・フィルタロジックはそのまま流用する。

### 2.4 検索

- クライアントサイド全文検索（Fuse.js）を採用
- Firestoreから取得済みの課題データをブラウザ内でインデックス化し、あいまい検索（typo tolerance）に対応
- 検索精度向上のため、**kuromoji.js による形態素解析を Cloud Functions 側で事前実行**し、分かち書きトークン集合と読み（ひらがな正規化）をあらかじめ算出してFirestoreに保存する
  - トークン化の実行場所は、書き込み時にCloud Functionsで事前計算する方式を採用（クライアントはkuromoji.jsの辞書をダウンロードしない）
  - 読み（カナ）の正規化を実施し、ひらがな/カタカナの表記ゆれを吸収する
- サーバー・外部検索サービスは使用せず、検索実行自体は追加コストなし（Cloud Functionsは書き込み時のみ発火するイベント駆動型で、小規模利用なら無料枠に収まる想定）
- 想定件数が数万件を超える場合は Algolia 等のマネージド検索サービスへの移行を検討（無料枠あり・サーバーレス）

### 2.5 権限・ロール

- 操作権を管理者ロールと一般ユーザーロールを分離
- ステータスマスタの登録・編集・削除は管理者のみ許可
- **Firestore Security Rules でロールベースの書き込み制御を実装済み**（`firestore.rules`）。workflowTypes/statusesの作成・編集はadmin限定、全マスタ（projects/workflowTypes/statuses）の物理削除は常に不可（アーカイブ運用）、issuesは子課題の`projectId`/`workflowTypeId`が親と一致することを`get()`で検証
- 新規ユーザー登録時は Cloud Functions（`functions/src/onUserCreate.ts`、Authユーザー作成トリガー）が `users/{uid}` を `role: 'member'` で自動作成する
- **最初の管理者作成の仕組みを実装済み。** `users`コレクションに`role: 'admin'`のドキュメントが1件も存在しない間だけ、サインイン中のユーザーが「最初の管理者になる」ボタンから自分自身をadminに昇格できる（Cloud Functions callable `claimFirstAdmin`。既に管理者が1人でも存在すれば必ず失敗する）。2人目以降の昇格・降格は、既存の管理者が「ユーザー管理」画面（admin限定）から行う

### 2.6 通知（実装済み）

- **配信方法はブラウザPUSH通知（Firebase Cloud Messaging）のみ。** メール通知は対応しない
- トリガーは3種類:
  1. **担当者アサイン時** — `issues`への書き込みで`assigneeIds`に新規追加されたユーザーへ即時通知（Firestoreトリガー）
  2. **ステータス変更時** — `statusId`が変化した書き込みで、その時点の全担当者へ即時通知（同上）
  3. **期限接近** — 毎日9:00(JST)のスケジュール実行で、期限が3日以内（ダッシュボードの期限接近アラートと同じ閾値）かつ未完了（`progressPercent < 100`）の課題の担当者へ通知。同一課題への再通知は行わない（`issues.dueDateAlertSentAt`で管理し、期限日時が変更された場合のみリセットされる）
- ユーザーは`users.fcmTokens: string[]`にブラウザ/デバイスごとのFCMトークンを保持する（複数端末対応）。トークンが無効化された場合はCloud Functions側で自動的に配列から削除する
- フロントエンドはヘッダーの「🔔 通知を有効にする」ボタンから許可をリクエストする。ブラウザ側で既に許可済みの場合はボタンを出さず自動でトークン登録する。ブラウザ設定で明示的にブロックされている場合は「🔕 通知がブロックされています」の案内を表示する（JSからの再リクエストはブラウザ仕様上不可のため、ユーザー自身にブラウザ設定の変更を促す）
- タブがフォアグラウンドの間はアプリ内トースト（`onMessage`）で表示し、バックグラウンド時はService Worker（`public/firebase-messaging-sw.js`）がOS通知として表示する
- VAPIDキー（Web Push証明書）はFirebase Console側で発行し、`.env`の`VITE_FIREBASE_VAPID_KEY`に設定する

---

## 3. 追加機能（推奨）

初期スコープ外だが、実装優先度を検討したい機能。

| 機能 | 内容 | 優先度目安 |
|---|---|---|
| 変更履歴・アクティビティログ | ステータス変更、担当者変更、期限変更を別コレクションに記録。ステータス滞留日数の分析にも活用可能 | 中 |
| 通知 | 期限接近・ステータス変更・担当者アサイン時に通知 | **採用（実装済み）** |
| 課題間の依存関係 | 親子関係とは別に、ブロック / 被ブロック関係を `blockedBy: [issueId]` 等で表現 | 低〜中 |
| 優先度・緊急度 | 進捗（ステータス）とは独立した優先度軸（高・中・低）を追加し、ダッシュボードの並び替えに利用 | **採用（初期実装に含む）** |
| タグ・ラベル | 横断的な分類のためのタグ機能 | 低 |
| ガントチャート的な期限俯瞰ビュー | 複数課題の期限を時系列で俯瞰 | **対応しない（不要と判断）** |

> 通知は **ブラウザPUSH通知（FCM）のみ採用**（メール通知は対応しない）。トリガーは担当者アサイン時・ステータス変更時・期限接近（日次バッチ判定）の3種類。詳細は2.6。
> ステータス遷移制御（`allowedNextStatuses` によるフロー制限）は初期スコープ外とし、当面は任意のステータス間を自由に遷移可能とする。

---

## 4. データモデル（概略）

### 4.1 `projects`（プロジェクト）

```
{
  id: string
  name: string
  color: string       // バッジ表示色（例: '#0ea5e9'）
  archived: boolean
  createdAt: Timestamp  // 未実装（現行の projectConverter では未使用。将来追加）
  updatedAt: Timestamp  // 未実装（同上）
}
```

### 4.2 `issues`（課題）

```
{
  id: string
  projectId: string      // プロジェクト（親課題／小課題）の最上位。子課題は親と同じprojectIdを持つ
  workflowTypeId: string // 種別（新機能開発/bug対応/調査報告 等）。親課題で選択し、子課題は親から継承する
  title: string
  memo: string          // text または markdown
  memoFormat: 'text' | 'markdown'
  parentId: string | null
  statusId: string       // workflowTypeId に対応する statuses コレクションのいずれかを参照
  assigneeIds: string[]
  dueDate: Timestamp | null
  priority: 'high' | 'medium' | 'low'
  links: { label: string; url: string }[]      // 外部資料URL
  blockedBy: string[]    // 依存関係（追加機能想定・初期スコープ外）
  createdAt: Timestamp
  updatedAt: Timestamp

  // 検索用（Cloud Functionsが title/memo から自動生成。クライアントからは書き込まれない）
  searchTokens: string[]   // kuromoji.js による分かち書き・原形正規化済みトークン
  searchReading: string    // 全角の読みをひらがなに正規化した文字列
  searchIndexedAt: Timestamp | null

  // 通知用（Cloud Functionsが管理。クライアントからは書き込まれない）
  dueDateAlertSentAt: Timestamp | null  // 期限接近通知の送信済みフラグ。dueDate変更時にリセットされる
}
```

### 4.3 `workflowTypes`（種別マスタ）

```
{
  id: string
  name: string    // '新機能開発' / 'bug対応' / '調査報告' / 'UI-UX改善' / '既存機能修正' 等
  color: string   // バッジ表示色
  order: number   // 種別自体の表示順（フィルタ・選択UIでの並び順）
}
```

### 4.4 `statuses`（ステータスマスタ）

```
{
  id: string
  workflowTypeId: string     // このステータスが属する種別
  label: string
  progressPercent: number    // 0-100（同一 workflowTypeId 内でのみ意味を持つ）
  order: number               // 表示順（同一 workflowTypeId 内でのみ意味を持つ）
  color: string                // バッジ表示色（例: '#3b82f6'）
  isDefault: boolean           // 同一workflowTypeId内で1つのみを想定（MasterDataViewで排他制御）
  archived: boolean            // 使用中ステータスは物理削除不可のため、廃止はこのフラグで表現する（実装済み）
  allowedNextStatuses: string[] | null  // 将来のフロー制御用（未実装）
}
```

### 4.5 `users`（ユーザー）

```
{
  id: string
  name: string
  avatarUrl?: string
  role: 'admin' | 'member'
  fcmTokens?: string[]  // ブラウザPUSH通知(FCM)用トークン。複数デバイス/ブラウザ分を保持
}
```

### 4.6 `activityLogs`（変更履歴・追加機能想定）

```
{
  id: string
  issueId: string
  type: 'statusChange' | 'assigneeChange' | 'dueDateChange'
  before: unknown
  after: unknown
  changedBy: string
  changedAt: Timestamp
}
```

### 4.7 設計上の注意点

- 進捗率は `statuses` 側のみに保持し、`issues` には `statusId` のみを持たせて二重管理を避ける
- 親子構造はサブコレクションでなく `parentId` によるフラット構造とし、一覧・集計はやりやすくする
- **子課題の `projectId` と `workflowTypeId` は必ず親課題と同一とする。** Firestore Security Rules側で `get()` により親ドキュメントを参照・比較して整合性を強制する（実装済み。`get()`のドキュメント参照コストは書き込み1回あたり追加1回で許容範囲と判断）
- `statuses.order` / `statuses.progressPercent` は**同一 `workflowTypeId` 内でのみ意味を持つ**比較軸であり、種別をまたいだステータス比較（例：カンバンビュー横断表示や全体ソートでの「全ステータス順」）を行う場合は、種別間依存の展開尺度である `progressPercent` にフォールバックするなど、比較方法を明示的に決めておく必要がある
- ダッシュボード用クエリ（担当者別・期限近接）を想定し、`assigneeIds` と `dueDate` に複合インデックスを用意。プロジェクト・種別絡み表示のため `projectId`・`workflowTypeId` の単体インデックスを用意する

---

## 5. 検索実装方針（詳細）

### 5.1 全体フロー

1. 課題の作成・更新時（Firestore `onWrite` トリガー）に Cloud Functions が発火
2. kuromoji.js（IPADIC辞書）で `title` + `memo` を形態素解析
3. 結果を2種類のフィールドとしてドキュメントに書き戻す
   - `searchTokens: string[]` → 意味を持つ品詞（名詞・動詞・形容詞・副詞）のみに絞り込んだ原形（活用の基本形）正規化済みトークン集合
   - `searchReading: string` → 全角の読みをひらがなに正規化した文字列（表記ゆれ吸収用）
4. クライアントは Firestore から取得した issues に対しFuse.js で2種類のインデックスを構築して検索
   - 生テキスト用：`title`（重み0.5）・`memo`（重み0.2）・`searchTokens`（重み0.3）
   - 読み用：`searchReading`（重み1.0）。検索クエリはカタカナ→ひらがな変換・空白除去した上で照合
   - 両インデックスの検索結果をスコアでマージして最終結果とする

### 5.2 無限ループ防止

Cloud Functions のトリガーは `onWrite` のため、Function自身による書き戻し（`searchTokens`/`searchReading` の更新）が再度トリガーされないよう、**`title` と `memo` に変化がない書き込みは re-tokenize をスキップ**する。

### 5.3 デプロイ・運用上の注意

- kuromoji.js の辞書ファイル（IPADIC）は Cloud Functions のデプロイパッケージに同梱される（`node_modules/kuromoji/dict` を参照）
- 辞書のビルド（`kuromoji.builder().build()`）は数百msから数秒かかるため、関数インスタンス化でトークナイザーをキャッシュし、コールドスタート時のみ再構築する
- コールドスタート時の処理時間を考慮し、Cloud Functionsのメモリ割り当ては標準よりやや余裕を持たせる（`memory: '512MiB'` を設定済み。実測ベースでの最終チューニングは未実施）
- サーバー・外部APIは検索実行時には不要。事前計算のみ Cloud Functions を利用するため、完全なサーバーレス構成を維持できる
- 件数増加によりパフォーマンス問題が生じる場合、Algolia（無料枠あり）等のマネージド検索への移行を検討する
- Firebase Functions は `functions/` ディレクトリ単体のみがデプロイパッケージに含まれるため、リポジトリ直下の `shared/kanaUtils.ts` を参照できない。`functions/scripts/copy-shared.mjs` が `npm run build` の prebuild で `shared/` を `functions/shared/`（生成物・gitignore対象）へ同期してからコンパイルする方式で解決済み
- `tokenizeIssue`（asia-northeast1、2nd gen）・`onUserCreate`（us-central1、1st gen、Auth onCreateトリガーで `users/{uid}` を自動作成）はいずれも本番デプロイ済み。Cloud Functions 2nd gen の利用には Firebase プロジェクトの Blaze（従量課金）プランへのアップグレードが必須

---

## 6. 決定事項サマリー

- **階層構造は「プロジェクト（親課題／小課題）の3階層」を採用**。子課題のプロジェクトは親課題と必ず一致させる。
- **ステータスは種別（新機能開発／bug対応／調査報告／UI-UX改善／既存機能修正 等）ごとに独立したフローとして管理する**。種別は親課題で選択、小課題は自動継承（個別上書き不可）
- カンバンビューは種別を1つ選択した状態で表示する（ステータス集合が種別ごとに異なるため）
- ダッシュボードはプロジェクト横断で表示する。プロジェクト・種別はフィルタ・バッジ表示の対象とする
- 検索（クライアントサイド全文検索）はFuse.jsを採用。タイトル重み0.5・メモ重み0.2・トークン重み0.3
- 検索精度向上（kuromoji.js による形態素解析を **Cloud Functions側で書き込み時に事前計算**）（クライアントは辞書ダウンロードしない）
- 読み（カナ）の正規化（採用）。ひらがな/カタカナの表記ゆれを吸収
- 優先度・緊急度（初期実装に含める）：高・中・低の3段階
- 通知（初期スコープ外・後続 Cloud Functions + FCM／メールで追加）
- ステータス遷移制御（初期スコープ外・当面は同一種別内で自由遷移）
- ダッシュボードのビュー実装順：リストビュー → カンバンビュー（両方実装済み）。ガントチャートは対応しない方針に決定
- リストビュー：担当者はアイコン＋名前併記。親子課題はインデントでツリー表示。表示件数はページネーション（1ページ25件）
- リストビューのソートは、親子の隣接関係を維持したまま兄弟課題単位で「優先度→期限」を適用する（フラットな全体ソートによるツリー崩れを防止）
- ステータスの `order`/`progressPercent` は同一種別内でのみ意味を持つ比較軸とし、種別をまたぐ比較は `progressPercent` にフォールバックする
- 期限アラート閾値（初期値3日）設定変更可能な構造）
- Firestoreデータ取得層は **`onSnapshot` によるリアルタイム同期を採用**（都度フェッチではなく）。認証完了前に購読を開始するとルール上のpermission-deniedでリスナーが終了し復帰しないため、サインイン状態が確定してから購読を開始する設計とする
- Firestore Security Rulesはロールベース制御を実装済み。admin限定操作はUI側（ナビ非表示等）でも補助的にガードするが、実際の強制はRules側のみに委ねる
- プロジェクト管理画面・種別/ステータスマスタ管理画面は実装済み。いずれも削除操作は用意せず、アーカイブ/復元のみで運用する
- 課題（issue）自体の作成・編集UIは実装済み。子課題は親のproject/種別を継承・固定し、作成後のproject/種別/親の変更は不可とする（整合性を壊すリスクを避けるための意図的な制約）
- カンバンビューは実装済み。ガントチャートは実装しない方針に決定（不要と判断）
- 最初の管理者作成の仕組みは実装済み（`claimFirstAdmin`。管理者0人の間だけ自己昇格可能）。2人目以降のロール変更はユーザー管理画面（admin限定）から行う

## 7. 実装済みコード（2026-07-12時点）

以下のTypeScript/React・Cloud Functionsコードとして実装済み（本仕様書と対の設計成果物）。ディレクトリ構成の詳細は [README.md](../README.md) を参照。

**フロントエンド（`src/`）**

| ファイル | 内容 |
|---|---|
| `features/issues/types.ts` | `Project` / `WorkflowType` / `Issue` / `Status`（`archived`含む）/ `User` / `Priority` 等のドメイン型 |
| `features/issues/dueDateAlert.ts` | 期限超過・期限接近の判定ロジック |
| `features/issues/sortAndFilter.ts` | プロジェクト/種別/担当者/ステータス/優先度フィルタ、親子ツリー構築 |
| `features/issues/kanaUtils.ts` | `shared/kanaUtils.ts` の再エクスポート |
| `features/issues/useIssueSearch.ts` | Fuse.js による全文検索フック |
| `features/issues/useFirestoreIssueData.ts` | Firestore `onSnapshot` によるリアルタイム購読フック群（サインイン完了までは購読しない`enabled`ゲート付き） |
| `features/issues/IssueRow.tsx` / `IssueListView.tsx` | リストビューのコンポーネント一式 |
| `features/issues/KanbanView.tsx` | カンバンビュー（種別を1つ選択して表示。フィルタ・検索・ツリー構築ロジックはリストビューと共通、カードはフラット表示。ドラッグ&ドロップは未実装） |
| `features/issues/issueActions.ts` | 課題のFirestore書き込み（作成・編集・削除） |
| `features/issues/IssueFormModal.tsx` | 課題の作成・編集モーダル（子課題は親のproject/種別を継承・固定、作成後のproject/種別/親の変更は不可） |
| `features/auth/` | Firebase Authログイン・サインアップ・ログアウト、認証状態+Firestoreプロフィール購読フック |
| `features/projects/` | プロジェクト管理画面（作成・編集・アーカイブ/復元） |
| `features/masterData/` | 種別・ステータスマスタ管理画面（admin限定。作成・編集・並び替え・既定ステータス設定・アーカイブ/復元） |
| `features/admin/AdminBootstrapBanner.tsx` | 管理者不在時のみ表示する「最初の管理者になる」バナー |
| `features/admin/UserManagementView.tsx` | ユーザー管理画面（admin限定。ロールの昇格・降格。自分自身の変更は誤操作防止のため無効化） |
| `features/admin/adminActions.ts` | `claimFirstAdmin` callableの呼び出し、ユーザーロール変更のFirestore書き込み |
| `features/notifications/useNotifications.ts` | 通知許可の状態管理・FCMトークン登録・フォアグラウンドメッセージ受信 |
| `features/notifications/NotificationToasts.tsx` | フォアグラウンド受信時のアプリ内トースト表示 |
| `lib/firebase.ts` | Firebase初期化、Emulator接続のopt-inスイッチ（Firestore/Auth/Functions） |
| `lib/firebaseMessaging.ts` | FCM許可リクエスト・トークン取得・フォアグラウンドリスナー |
| `lib/firestoreConverters.ts` | 各コレクションのFirestore⇔ドメイン型変換（`Timestamp`⇔`Date`等） |
| `App.tsx` | 認証ゲート・ナビ・各ビューの統合 |
| `public/firebase-messaging-sw.js` | バックグラウンドPUSH通知表示用Service Worker |

**Cloud Functions（`functions/src/`）**

| ファイル | 内容 |
|---|---|
| `tokenizeIssue.ts` | 課題書き込み時にkuromoji.jsでトークン化・読み正規化（本番デプロイ済み、asia-northeast1） |
| `onUserCreate.ts` | Authユーザー作成時に `users/{uid}` を `role: 'member'` で自動作成（本番デプロイ済み、us-central1） |
| `claimFirstAdmin.ts` | 管理者が1人も存在しない場合のみ、呼び出したユーザーをadminに昇格するcallable（本番デプロイ済み、us-central1） |
| `notifications.ts` | `onIssueWrittenNotify`（担当者アサイン・ステータス変更時にPUSH、本番デプロイ済み、asia-northeast1）、`notifyDueDateApproaching`（期限接近の日次バッチ、本番デプロイ済み、us-central1、毎日9:00 JST） |
| `messagingUtils.ts` | FCM送信共通処理（複数トークンへの一括送信、無効トークンの自動クリーンアップ） |

**共有・設定**

| ファイル | 内容 |
|---|---|
| `shared/kanaUtils.ts` | カタカナ→ひらがな正規化（フロントエンド・Cloud Functions共用の実体） |
| `firestore.rules` | ロールベースSecurity Rules（admin/member、`get()`による親子整合性チェック等） |
| `firestore.indexes.json` / `firebase.json` | Firestoreインデックス・Functions/Hosting/Emulator設定 |

## 8. 未確定事項（次のステップで詰める）

- カンバンビューでのドラッグ&ドロップによるステータス変更をいつのタイミングで追加するか（現状はカードクリックで編集モーダルを開き手動変更）

> ガントチャート（期限俯瞰ビュー）は実装しない方針に決定（不要と判断）。
> 通知はブラウザPUSH（FCM）のみ実装済み。メール通知は対応しない方針。

## 9. 既知の制約

- **ブラウザPUSH通知（Push API）はヘッドレス/自動化ブラウザコンテキスト（Playwright等）や通常のシークレットウィンドウでは動作しない**（Chrome自身の仕様上の制限）。そのため配信の最終確認は実ブラウザの通常ウィンドウでのみ可能。Cloud Functions側のトリガー発火・ロジックはFirestore Emulator/本番ログで自動検証できるが、実際のPUSH配信は手動確認が必要
- 通知許可が一度「ブロック」された場合、JavaScriptから再度許可を求めることはできない（ブラウザ仕様）。UIはブロック状態を検知して案内メッセージを表示するのみで、解除はユーザーがブラウザのサイト設定から行う必要がある
- Cloud Functionsのメモリ・タイムアウト設定の最終値（実測ベースでのチューニング。現状は暫定値の512MiB）
