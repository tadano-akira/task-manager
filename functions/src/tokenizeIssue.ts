import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import kuromoji, { IpadicFeatures, Tokenizer } from 'kuromoji';
// functions/shared/ は "npm run build" 実行時に functions/scripts/copy-shared.mjs が
// リポジトリ直下の shared/ から同期する生成物（Firebase Functionsは functions/ 配下しか
// デプロイパッケージに含めないため、参照先をこのディレクトリ内に閉じる必要がある）。
import { normalizeReading } from '../shared/kanaUtils';

// 課題の title/memo から検索用トークン集合(searchTokens)と読み(searchReading)を
// 書き込み時に事前計算する（仕様書 5.1〜5.3）。
// トークナイザーは関数インスタンスにキャッシュし、コールドスタート時のみ辞書をビルドする。

const MEANINGFUL_POS = new Set(['名詞', '動詞', '形容詞', '副詞']);

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
        if (err) reject(err);
        else resolve(tokenizer);
      });
    });
  }
  return tokenizerPromise;
}

function extractTokens(tokenizer: Tokenizer<IpadicFeatures>, text: string): string[] {
  const tokens = tokenizer.tokenize(text);
  const meaningful = tokens.filter((t) => MEANINGFUL_POS.has(t.pos));
  const basicForms = meaningful.map((t) => (t.basic_form === '*' ? t.surface_form : t.basic_form));
  return [...new Set(basicForms)];
}

function extractReading(tokenizer: Tokenizer<IpadicFeatures>, text: string): string {
  const tokens = tokenizer.tokenize(text);
  const reading = tokens.map((t) => t.reading ?? t.surface_form).join('');
  return normalizeReading(reading);
}

export const tokenizeIssue = onDocumentWritten(
  { document: 'issues/{issueId}', memory: '512MiB' },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after) return; // 削除時は何もしない

    // title/memo に変化がない書き込みは re-tokenize をスキップ（onWriteの無限ループ防止）
    if (before && before.title === after.title && before.memo === after.memo) return;

    const tokenizer = await getTokenizer();
    const text = `${after.title ?? ''} ${after.memo ?? ''}`;

    const searchTokens = extractTokens(tokenizer, text);
    const searchReading = extractReading(tokenizer, text);

    await getFirestore()
      .collection('issues')
      .doc(event.params.issueId)
      .update({
        searchTokens,
        searchReading,
        searchIndexedAt: new Date(),
      });
  }
);
