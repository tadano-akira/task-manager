// ============================================================
// ドメイン型定義
// ============================================================

export interface Project {
  id: string;
  name: string;
  color: string; // プロジェクトバッジの表示色
  archived: boolean;
}

export type Priority = 'high' | 'medium' | 'low';

export interface WorkflowType {
  id: string;
  name: string; // 例: '新機能開発' / 'bug対応' / '調査報告' / 'UI-UX改善' / '既存機能修正'
  color: string; // バッジ表示色
  order: number; // 種別自体の表示順（フィルタ・選択UIでの並び順）
}

export interface Status {
  id: string;
  workflowTypeId: string; // このステータスがどの種別のフローに属するか
  label: string;
  progressPercent: number; // 0-100（同一 workflowTypeId 内でのみ意味を持つ）
  order: number; // 表示順（同一 workflowTypeId 内でのみ意味を持つ）
  color: string; // バッジ色 (例: '#3b82f6')
  isDefault: boolean;
  archived: boolean; // 使用中のステータスは削除不可のため、廃止はアーカイブで表現する（仕様書2.2）
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  role: 'admin' | 'member';
  fcmTokens?: string[]; // ブラウザPUSH通知(FCM)用のトークン。複数デバイス/ブラウザ分を保持
}

export interface IssueLink {
  label: string;
  url: string; // Google Drive / Box 等の外部URL
}

export interface Issue {
  id: string;
  projectId: string; // プロジェクト（親課題・小課題）の最上位。子課題は親と同じprojectIdを持つ
  workflowTypeId: string; // 種別（新機能開発/bug対応/調査報告 等）。親課題で選択し、子課題は親から継承する
  title: string;
  memo: string;
  memoFormat: 'text' | 'markdown';
  parentId: string | null;
  statusId: string; // workflowTypeId に対応する statuses のいずれかを参照
  assigneeIds: string[];
  priority: Priority;
  dueDate: Date | null;
  links: IssueLink[];
  createdAt: Date;
  updatedAt: Date;

  // --- 検索用（Cloud Functionsが title/memo から自動生成。クライアントからは書き込まない） ---
  searchTokens?: string[]; // kuromoji.js による分かち書き・原形正規化済みトークン
  searchReading?: string; // 全角の読みをひらがなに正規化した文字列
}

// リストビュー表示用に、参照解決済みのデータを持たせたビューモデル
export interface IssueRowData extends Issue {
  project: Project;
  workflowType: WorkflowType;
  status: Status;
  assignees: User[];
  depth: number; // ツリー表示のインデント深さ（親=0, 子=1, 孫=2...）
  dueAlertLevel: 'overdue' | 'soon' | 'none';
}

export interface ListViewFilters {
  projectIds: string[];
  workflowTypeIds: string[];
  assigneeIds: string[];
  statusIds: string[];
  priorities: Priority[];
  searchQuery: string;
}

export interface ListViewSort {
  // 優先度 → 期限 の複合ソートを既定とする
  primary: 'priority' | 'dueDate' | 'status' | 'updatedAt';
  secondary: 'priority' | 'dueDate' | 'status' | 'updatedAt' | null;
}
