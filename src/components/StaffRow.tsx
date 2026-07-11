import Link from "next/link";
import type { Staff } from "@/lib/types";
import { staffCertStatus } from "@/lib/compliance";
import { STAFF_ROLE_SHORT } from "@/lib/roles";
import { formatDate } from "@/lib/format";

/** A single staff row: identity + at-a-glance cert status with colour flag. */
export function StaffRow({ staff }: { staff: Staff }) {
  const status = staffCertStatus(staff);

  const border =
    status.level === "expired"
      ? "border-l-4 border-l-danger-500"
      : status.level === "expiring"
        ? "border-l-4 border-l-warn-500"
        : "border-l-4 border-l-transparent";

  const statusText =
    status.level === "expired"
      ? "text-danger-600"
      : status.level === "expiring"
        ? "text-warn-700"
        : "text-ink-muted";

  return (
    <Link
      href={`/staff/${staff.id}`}
      className={`card block p-4 active:bg-surface-muted ${border}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-ink">{staff.name}</span>
        <span className="pill pill-neutral">{STAFF_ROLE_SHORT[staff.role]}</span>
      </div>
      <p className={`mt-1 text-sm ${statusText}`}>
        {status.label}
        {status.date && status.level !== "valid" && ` · ${formatDate(status.date)}`}
      </p>
    </Link>
  );
}
