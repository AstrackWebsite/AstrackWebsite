/**
 * AsTrack brand.
 * The mark is a navy tile with an "A" whose apex carries a teal tracking node —
 * "As(bestos) Track(ing)". The wordmark pairs a teal "As" with a solid "Track".
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="AsTrack"
    >
      <rect width="40" height="40" rx="10" fill="#1a3a5c" />
      {/* the "A" */}
      <path
        d="M12 28.5 L20 12 L28 28.5"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.5 22 H24.5" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      {/* teal tracking node at the apex */}
      <circle cx="20" cy="12" r="3.4" fill="#14b8a6" />
    </svg>
  );
}

export function AsTrackWordmark({
  onDark = false,
  className = "",
  size = 18,
}: {
  onDark?: boolean;
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={`font-bold tracking-tight ${className}`}
      style={{ fontSize: size }}
    >
      <span className="text-accent-500">As</span>
      <span className={onDark ? "text-white" : "text-ink"}>Track</span>
    </span>
  );
}

export function AsTrackLogo({
  size = 32,
  onDark = false,
  gap = 8,
}: {
  size?: number;
  onDark?: boolean;
  gap?: number;
}) {
  return (
    <div className="flex items-center" style={{ gap }}>
      <BrandMark size={size} />
      <AsTrackWordmark onDark={onDark} size={size * 0.62} />
    </div>
  );
}
