export function Spinner({ size = 32, label }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <span
        className="inline-block animate-spin rounded-full border-navy-200 border-t-navy-600"
        style={{ width: size, height: size, borderWidth: Math.max(3, size / 10) }}
      />
      {label ? (
        <span className="text-sm text-ink-muted">{label}</span>
      ) : (
        <span className="sr-only">Loading…</span>
      )}
    </div>
  );
}
