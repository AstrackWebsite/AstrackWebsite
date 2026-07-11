/** ART wordmark badge. Square navy tile with the initials. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-navy-600 font-bold tracking-tight text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      ART
    </div>
  );
}
