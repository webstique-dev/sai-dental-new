export default function StatCard({ label, value, icon: Icon, tone = 'brand', hint }) {
  const TONE = {
    brand: 'bg-brand-light text-brand-dark',
    success: 'bg-state-successSoft text-state-success',
    warning: 'bg-state-warningSoft text-state-warning',
    danger: 'bg-state-dangerSoft text-state-danger',
    info: 'bg-state-infoSoft text-state-info',
  };

  return (
    <div className="card flex items-start justify-between p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
        <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      </div>
      {Icon && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE[tone]}`}>
          <Icon size={20} strokeWidth={2} />
        </span>
      )}
    </div>
  );
}
