// Formatting helpers — UK locale.

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** Full currency, e.g. £32,000. */
export function gbp(value: number | null | undefined): string {
  return GBP.format(value ?? 0);
}

/** Compact currency for KPI tiles, e.g. £98k, £1.2m. */
export function gbpCompact(value: number | null | undefined): string {
  const n = value ?? 0;
  if (Math.abs(n) >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1_000) return `£${Math.round(n / 1_000)}k`;
  return `£${n}`;
}

/** Short date, e.g. 12 May 2026. Accepts an ISO date string. */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Day + month only, e.g. 12 May. */
export function formatDay(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

/** Time of day from a timestamp, e.g. 07:42. */
export function formatTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
