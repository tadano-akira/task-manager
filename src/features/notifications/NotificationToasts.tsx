import type { NotificationToast } from './useNotifications';

interface NotificationToastsProps {
  toasts: NotificationToast[];
  onDismiss: (id: number) => void;
}

export function NotificationToasts({ toasts, onDismiss }: NotificationToastsProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-4 top-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4">
      {toasts.map((t) => (
        <div key={t.id} className="w-full rounded-md border border-slate-200 bg-white p-3 shadow-lg sm:w-72">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-800">{t.title}</p>
              {t.body && <p className="text-xs text-slate-500">{t.body}</p>}
            </div>
            <button onClick={() => onDismiss(t.id)} className="text-xs text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
