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

/** Human labels for the expiry-tracked cert columns. */
const CERT_LABELS: { key: keyof Staff; label: string }[] = [
  { key: "medical_expiry", label: "Medical" },
  { key: "face_fit_expiry", label: "Face fit" },
  { key: "mask_service_expiry", label: "Mask service" },
  { key: "asbestos_training_expiry", label: "Asbestos training" },
  { key: "smsts_expiry", label: "SMSTS" },
  { key: "sssts_expiry", label: "SSSTS" },
  { key: "cm_training_expiry", label: "CM training" },
];

export type CertLevel = "expired" | "expiring" | "valid";

export interface CertStatus {
  level: CertLevel;
  /** Short status line for the staff row, e.g. "Face fit expired". */
  label: string;
  /** The offending cert's date, if any. */
  date: string | null;
}

/**
 * Worst-case cert status for a staff member, for at-a-glance list display.
 * Expired beats expiring beats valid.
 */
export function staffCertStatus(staff: Staff, on: Date = new Date()): CertStatus {
  const present = CERT_LABELS.filter((c) => staff[c.key]);
  const expired = present.find((c) => isExpired(staff[c.key] as string, on));
  if (expired) {
    return { level: "expired", label: `${expired.label} expired`, date: staff[expired.key] as string };
  }
  const expiring = present.find((c) => isExpiringSoon(staff[c.key] as string, 30, on));
  if (expiring) {
    return { level: "expiring", label: `${expiring.label} expiring`, date: staff[expiring.key] as string };
  }
  return { level: "valid", label: "All certs valid", date: null };
}

export interface CertEvidenceItem {
  label: string;
  date: string | null;
  level: CertLevel | "missing";
}

/** The site-critical certs an HSE inspector expects to see, with date + status. */
const SITE_CERTS: { key: keyof Staff; label: string }[] = [
  { key: "medical_expiry", label: "Medical" },
  { key: "face_fit_expiry", label: "Face fit" },
  { key: "mask_service_expiry", label: "Mask service" },
  { key: "asbestos_training_expiry", label: "Asbestos training" },
];

/** Per-cert evidence for a staff member — powers the on-site HSE proof view. */
export function staffCertEvidence(staff: Staff, on: Date = new Date()): CertEvidenceItem[] {
  return SITE_CERTS.map(({ key, label }) => {
    const date = (staff[key] as string | null) ?? null;
    const level: CertLevel | "missing" = !date
      ? "missing"
      : isExpired(date, on)
        ? "expired"
        : isExpiringSoon(date, 30, on)
          ? "expiring"
          : "valid";
    return { label, date, level };
  });
}

// ── 4-hour TWA (Rule 4) ──────────────────────────────────────────────────
export const CONTROL_LIMIT_FML = 0.1; // f/ml, CAR 2012 control limit

// ── Air monitoring pass thresholds ───────────────────────────────────────
/**
 * Clearance air testing (Stage 3 of the 4-stage clearance) passes below the
 * clearance indicator of 0.01 f/ml. Background / leak / reassurance tests are
 * judged against the CAR 2012 control limit of 0.1 f/ml.
 */
export const CLEARANCE_LIMIT_FML = 0.01;

export function airLimitFor(type: string): number {
  return type === "clearance" ? CLEARANCE_LIMIT_FML : CONTROL_LIMIT_FML;
}

/** Suggested pass/fail for an air result, or null when there is no reading. */
export function airPasses(type: string, resultFml: number | null): boolean | null {
  if (resultFml == null) return null;
  return resultFml < airLimitFor(type);
}

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

/** Duration in hours between two HH:MM time strings (same day). */
export function durationHours(
  start: string | null | undefined,
  end: string | null | undefined
): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? mins / 60 : 0;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
