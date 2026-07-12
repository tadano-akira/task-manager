// PLACEHOLDER: 本実装は後日提供予定。カタカナ→ひらがな正規化の最小実装。
// フロントエンド（src/features/issues/kanaUtils.ts）と
// Cloud Functions（functions/src/tokenizeIssue.ts）の双方から参照される共有モジュール。

export function katakanaToHiragana(input: string): string {
  return input.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

export function normalizeReading(input: string): string {
  return katakanaToHiragana(input).trim();
}
