// Firebase Functions のデプロイパッケージは functions/ ディレクトリ単体のみが対象となるため、
// リポジトリ直下の shared/ をビルド前に functions/shared/ へ同期する。
// functions/shared/ は生成物であり、コミット対象外（.gitignore参照）。
import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const functionsDir = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(functionsDir, '..', 'shared');
const dest = join(functionsDir, 'shared');

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
