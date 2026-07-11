import Link from "next/link";

export function KpiTile({
  value,
  label,
  href,
  tone = "default",
}: {
  value: string | number;
  label: string;
  href?: string;
  tone?: "default" | "danger" | "value";
}) {
  const toneClasses =
    tone === "danger"
      ? "border-danger-200 bg-danger-50"
      : "border-surface-border bg-surface";
  const valueClasses =
    tone === "danger"
      ? "text-danger-600"
      : tone === "value"
        ? "text-accent-600"
        : "text-ink";

  const inner = (
    <div
      className={`card flex min-h-[92px] flex-col justify-between p-4 ${toneClasses}`}
    >
      <span className={`text-3xl font-bold leading-none ${valueClasses}`}>
        {value}
      </span>
      <span className="mt-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block active:opacity-80">
        {inner}
      </Link>
    );
  }
  return inner;
}
