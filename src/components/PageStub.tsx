export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
    </div>
  );
}

/** Placeholder for screens delivered in a later phase. */
export function PhaseStub({
  title,
  phase,
  note,
}: {
  title: string;
  phase: string;
  note?: string;
}) {
  return (
    <>
      <PageHeader title={title} />
      <div className="card p-6 text-center">
        <span className="pill pill-neutral mb-3">{phase}</span>
        <p className="text-sm text-ink-muted">
          {note ?? `The ${title} screen is delivered in ${phase}.`}
        </p>
      </div>
    </>
  );
}
