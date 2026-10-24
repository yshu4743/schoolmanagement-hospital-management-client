const ACCENTS = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  violet: 'bg-violet-50 text-violet-600 border-violet-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  brand: 'bg-brand-50 text-brand-600 border-brand-100',
};

/**
 * Dashboard statistic card.
 */
export default function StatCard({ label, value, sub, icon, accent = 'blue' }) {
  return (
    <div className="card p-5">
      <div
        className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border text-lg font-bold ${
          ACCENTS[accent] || ACCENTS.blue
        }`}
      >
        {icon || (typeof value === 'number' ? value?.toString()[0] : '★')}
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-500">{label}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
