/**
 * Inline error banner for API failures.
 */
export default function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-4 font-bold text-rose-400 hover:text-rose-600">
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Success toast-style banner.
 */
export function SuccessBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-4 font-bold text-emerald-400 hover:text-emerald-600">
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Empty-state placeholder for tables and lists.
 */
export function EmptyState({ title = 'Nothing here yet', subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 text-4xl opacity-40">📭</div>
      <div className="font-medium text-slate-600">{title}</div>
      {subtitle && <div className="mt-1 text-sm text-slate-400">{subtitle}</div>}
    </div>
  );
}

/**
 * Full-card loading spinner.
 */
export function Loading({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      <div className="text-sm">{label}</div>
    </div>
  );
}
