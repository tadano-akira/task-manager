// フロントエンドからは共有モジュール（shared/kanaUtils.ts）を再エクスポートするのみ。
// Cloud Functions 側（functions/src/tokenizeIssue.ts）と実装を一本化するため。
export * from '../../../shared/kanaUtils';
