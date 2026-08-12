export default function PlaceholderPage({ title, description, icon: Icon }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand-dark">
          <Icon size={22} strokeWidth={2} />
        </span>
      )}
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="max-w-sm text-sm text-ink-soft">{description}</p>
    </div>
  );
}
