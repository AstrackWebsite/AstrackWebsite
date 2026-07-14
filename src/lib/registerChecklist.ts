// Mandatory pre-sign-in checks a supervisor confirms before a worker goes on
// site. These are the checks HSE expect to see evidenced, not just asserted.
// (Company-configurable / custom items are a planned follow-on.)

export const SIGNIN_CHECKS = [
  "Asbestos medical in date",
  "Face-fit test in date for the RPE worn",
  "RPE inspected and serviceable",
  "Site induction completed",
  "Fit to work — no impairment or fatigue",
] as const;

export type ChecklistItem = { label: string; checked: boolean };

/** A fresh, all-unchecked checklist for a new sign-in. */
export function blankChecklist(): ChecklistItem[] {
  return SIGNIN_CHECKS.map((label) => ({ label, checked: false }));
}

export function allChecked(items: ChecklistItem[]): boolean {
  return items.length > 0 && items.every((i) => i.checked);
}
