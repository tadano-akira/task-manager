// フロントエンド（src/features/issues/kanaUtils.ts）と
// Cloud Functions（functions/src/tokenizeIssue.ts）の双方から参照される共有モジュール。
// ひらがな/カタカナの表記ゆれと空白差異を吸収し、読み同士を比較可能な形に正規化する。

export function katakanaToHiragana(input: string): string {
  return input.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

export function normalizeReading(input: string): string {
  return katakanaToHiragana(input).replace(/\s+/g, '');
}
