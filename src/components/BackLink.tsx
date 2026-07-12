import Link from "next/link";

/** A clearly-tappable back button (44px target, bold chevron). */
export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-navy-600 active:bg-surface-muted"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M15 18l-6-6 6-6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
