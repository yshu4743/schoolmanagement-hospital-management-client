const COLORS = {
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  slate: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-100 text-violet-700',
  brand: 'bg-brand-100 text-brand-700',
};

const MAP = {
  // clinical statuses
  waiting: 'amber', in_consultation: 'blue', in_progress: 'amber', completed: 'green',
  referred: 'violet', cancelled: 'slate', scheduled: 'blue', confirmed: 'green',
  no_show: 'red', emergency: 'red', opd: 'brand', follow_up: 'violet', teleconsultation: 'blue',
  admitted: 'green', discharged: 'blue', transferred: 'violet',
  // billing
  paid: 'green', partial: 'amber', unpaid: 'red',
  // pharmacy
  pending: 'amber', partially_dispensed: 'amber', dispensed: 'green',
  // beds
  occupied: 'red', available: 'green', maintenance: 'amber', reserved: 'blue',
  // lab flags
  normal: 'green', high: 'red', low: 'blue', abnormal: 'red',
  // patients / users
  active: 'green', inactive: 'slate', deceased: 'slate',
  admin: 'violet', doctor: 'blue', nurse: 'brand', receptionist: 'amber', patient: 'green',
  planned: 'blue',
};

/**
 * Small status pill. Pass an explicit color or let it infer from the value.
 */
export default function Badge({ value, color, className = '' }) {
  const c = COLORS[color || MAP[value] || 'slate'] || COLORS.slate;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${c} ${className}`}>
      {String(value || '').replace(/_/g, ' ')}
    </span>
  );
}
