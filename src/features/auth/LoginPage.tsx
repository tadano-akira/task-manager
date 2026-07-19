import { useState, type FormEvent } from 'react';
import { authErrorMessage, signIn, signUp } from './authActions';

// 新規登録を一時的に停止中。実際の作成阻止はCloud Functions側のblockNewSignupsで行っているため
// (直接API経由での作成も防げる)、ここはUI導線を隠すためだけのフラグ。
// 再開する場合はtrueに戻し、functions側のblockNewSignupsのexportも外してデプロイし直す。
const SIGNUPS_ENABLED = false;

export function LoginPage() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signIn') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col p-6 pt-20">
      <h1 className="mb-6 text-center text-2xl font-semibold text-slate-800">タスク管理</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-6">
        <h2 className="text-sm font-medium text-slate-700">
          {mode === 'signIn' ? 'ログイン' : '新規登録'}
        </h2>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          メールアドレス
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          パスワード
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
          />
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? '処理中...' : mode === 'signIn' ? 'ログイン' : '登録する'}
        </button>

        {SIGNUPS_ENABLED && (
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'));
              setError(null);
            }}
            className="text-xs text-slate-500 underline underline-offset-2"
          >
            {mode === 'signIn' ? 'アカウントをお持ちでない方はこちら' : 'ログインはこちら'}
          </button>
        )}
      </form>
    </div>
  );
}
