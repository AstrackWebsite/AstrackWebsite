import type { Staff } from "./types";

/**
 * Shared compliance helpers. These mirror the SQL functions so the UI and the
 * database agree on what "expired" and "blocked" mean.
 */

/** A cert is expired if its date is strictly before today. */
export function isExpired(date: string | null, on: Date = new Date()): boolean {
  if (!date) return false;
  const today = startOfDay(on);
  return startOfDay(new Date(date)) < today;
}

/** Expiring soon = within `days` (default 30) but not yet expired. */
export function isExpiringSoon(
  date: string | null,
  days = 30,
  on: Date = new Date()
): boolean {
  if (!date) return false;
  const today = startOfDay(on);
  const d = startOfDay(new Date(date));
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + days);
  return d >= today && d <= horizon;
}

/**
 * Rule 1 — cert-blocking. A staff member cannot sign into a site register
 * if their medical, face-fit OR mask-service date has expired.
 * Returns the reason string, or null if clear. Mirrors staff_block_reason().
 */
export function staffBlockReason(
  staff: Pick<Staff, "medical_expiry" | "face_fit_expiry" | "mask_service_expiry">,
  on: Date = new Date()
): string | null {
  if (isExpired(staff.medical_expiry, on)) return "Medical expired";
  if (isExpired(staff.face_fit_expiry, on)) return "Face fit expired";
  if (isExpired(staff.mask_service_expiry, on)) return "Mask service expired";
  return null;
}

/** All the expiry-tracked cert fields on a staff record, for status display. */
export function staffCertDates(staff: Staff): (string | null)[] {
  return [
    staff.asbestos_training_expiry,
    staff.medical_expiry,
    staff.face_fit_expiry,
    staff.mask_service_expiry,
    staff.smsts_expiry,
    staff.sssts_expiry,
    staff.cm_training_expiry,
  ];
}

/** True if any of the staff member's certs is expired. */
export function hasExpiredCert(staff: Staff, on: Date = new Date()): boolean {
  return staffCertDates(staff).some((d) => isExpired(d, on));
}

// ── 4-hour TWA (Rule 4) ──────────────────────────────────────────────────
export const CONTROL_LIMIT_FML = 0.1; // f/ml, CAR 2012 control limit

/**
 * Contribution of a single exposure period to the 4-hour reference period:
 * C · t / 4  (hours). Matches the generated `twa_4h` column.
 */
export function twaContribution(fibreLevel: number, hours: number): number {
  return (fibreLevel * hours) / 4;
}

/**
 * Combined 4-hour TWA for an operative-day: sum of each period's contribution.
 * TWA(4h) = Σ(Cᵢ · tᵢ) / 4h.
 */
export function fourHourTWA(
  periods: { fibreLevel: number; hours: number }[]
): number {
  return periods.reduce(
    (acc, p) => acc + twaContribution(p.fibreLevel, p.hours),
    0
  );
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
