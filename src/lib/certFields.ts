// Human labels for the staff certificate expiry columns. Kept out of the
// "use server" actions file so client and server components can import it
// (a "use server" module may only export async functions).
export const CERT_FIELD_LABEL: Record<string, string> = {
  asbestos_training_expiry: "Asbestos training",
  medical_expiry: "Medical",
  face_fit_expiry: "Face fit",
  mask_service_expiry: "Mask service",
  smsts_expiry: "SMSTS",
  sssts_expiry: "SSSTS",
  cm_training_expiry: "CM training",
  face_fit_ff_expiry: "Face fit (full face)",
  wah_expiry: "Work at height (WAH)",
  pasma_expiry: "PASMA",
  ipaf_expiry: "IPAF",
};
