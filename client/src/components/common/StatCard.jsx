export default function StatCard({ label, title, value, icon: Icon, tone = 'brand', hint, sub, subtitle: subProp, onClick }) {
  const TONE = {
    brand: 'bg-brand-light text-brand-dark',
    success: 'bg-state-successSoft text-state-success',
    warning: 'bg-state-warningSoft text-state-warning',
    danger: 'bg-state-dangerSoft text-state-danger',
    info: 'bg-state-infoSoft text-state-info',
  };

  const cardLabel = label || title;
  const cardSubtitle = hint || sub || subProp;

  return (
    <div
      onClick={onClick}
      className={`card flex items-start justify-between p-4 sm:p-5 w-full max-w-full overflow-hidden ${
        onClick ? 'cursor-pointer hover:border-brand/40 hover:shadow-md transition-all active:scale-[0.99]' : ''
      }`}
    >
      <div className="min-w-0 flex-1 pr-2">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-ink-soft truncate">{cardLabel}</p>
        <p className="mt-1.5 sm:mt-2 font-display text-xl sm:text-2xl font-bold text-ink truncate">{value}</p>
        {cardSubtitle && <p className="mt-1 text-[11px] sm:text-xs text-ink-soft leading-tight truncate">{cardSubtitle}</p>}
      </div>
      {Icon && (
        <span className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${TONE[tone]}`}>
          <Icon size={18} strokeWidth={2} />
        </span>
      )}
    </div>
  );
}
