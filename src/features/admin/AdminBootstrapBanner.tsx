import { useState } from 'react';
import { claimFirstAdmin } from './adminActions';

interface AdminBootstrapBannerProps {
  onClaimed?: () => void;
}

// 管理者が1人も存在しない間だけ表示する「最初の管理者になる」バナー。
// 実際の一意性はCloud Functions側(claimFirstAdmin)で保証する。
export function AdminBootstrapBanner({ onClaimed }: AdminBootstrapBannerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleClaim() {
    setSubmitting(true);
    setError(null);
    try {
      await claimFirstAdmin();
      setDone(true);
      onClaimed?.();
    } catch {
      setError('既に管理者が存在するか、処理に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
      <span>このプロジェクトにはまだ管理者がいません。最初の管理者になりますか？</span>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <button
          onClick={handleClaim}
          disabled={submitting}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {submitting ? '処理中...' : '最初の管理者になる'}
        </button>
      </div>
    </div>
  );
}
