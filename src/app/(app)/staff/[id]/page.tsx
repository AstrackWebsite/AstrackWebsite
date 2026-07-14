import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { getStaffMember, getStaffCertificates, signAttachmentUrl } from "@/lib/data";
import { STAFF_ROLE_LABEL } from "@/lib/roles";
import { staffBlockReason, isExpired, isExpiringSoon } from "@/lib/compliance";
import { formatDate } from "@/lib/format";
import { CERT_FIELD_LABEL } from "@/lib/certFields";
import type { Staff } from "@/lib/types";

export const dynamic = "force-dynamic";

const CERTS: { key: keyof Staff; label: string }[] = [
  { key: "asbestos_training_expiry", label: "Asbestos training" },
  { key: "medical_expiry", label: "Medical" },
  { key: "face_fit_expiry", label: "Face fit" },
  { key: "mask_service_expiry", label: "Mask service" },
  { key: "smsts_expiry", label: "SMSTS" },
  { key: "sssts_expiry", label: "SSSTS" },
  { key: "cm_training_expiry", label: "CM training" },
];

function CertStatusPill({ date }: { date: string }) {
  if (isExpired(date)) return <span className="pill pill-danger">Expired</span>;
  if (isExpiringSoon(date)) return <span className="pill pill-warn">Expiring</span>;
  return <span className="pill pill-ok">Valid</span>;
}

export default async function StaffProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const staff = await getStaffMember(params.id);
  if (!staff) notFound();

  const blockReason = staffBlockReason(staff);
  const certs = CERTS.filter((c) => staff[c.key]);

  const certDocs = await getStaffCertificates(params.id);
  const certDocsWithUrls = await Promise.all(
    certDocs.map(async (d) => ({ ...d, url: await signAttachmentUrl(d.file_path) }))
  );

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <BackLink href="/staff" label="Back to staff" />
        <div>
          <h1 className="text-xl font-bold text-ink">{staff.name}</h1>
          <p className="text-sm text-ink-muted">{STAFF_ROLE_LABEL[staff.role]}</p>
        </div>
      </div>

      {blockReason && (
        <div className="mb-4 rounded-card border border-danger-200 bg-danger-50 p-4">
          <p className="font-semibold text-danger-700">
            Blocked from site sign-in
          </p>
          <p className="text-sm text-danger-600">{blockReason}</p>
        </div>
      )}

      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Contact
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Phone</dt>
            <dd className="text-ink">{staff.contact ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Email</dt>
            <dd className="text-ink">{staff.email ?? "—"}</dd>
          </div>
          {staff.years_in_trade != null && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Years in trade</dt>
              <dd className="text-ink">{staff.years_in_trade}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Certifications
        </h2>
        {certs.length === 0 && (
          <p className="text-sm text-ink-muted">No certifications recorded.</p>
        )}
        <ul className="divide-y divide-surface-border">
          {certs.map((c) => {
            const date = staff[c.key] as string;
            return (
              <li key={c.key} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-ink">{c.label}</p>
                  <p className="text-sm text-ink-muted">{formatDate(date)}</p>
                </div>
                <CertStatusPill date={date} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Certificate documents
        </h2>
        {certDocsWithUrls.length === 0 && (
          <p className="text-sm text-ink-muted">
            No documents on file yet. Use “Scan &amp; file a certificate” on the Staff page.
          </p>
        )}
        <ul className="divide-y divide-surface-border">
          {certDocsWithUrls.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {d.cert_field ? CERT_FIELD_LABEL[d.cert_field] ?? d.title : d.title || "Certificate"}
                </p>
                <p className="text-xs text-ink-muted">
                  {d.expiry_date ? `Expires ${formatDate(d.expiry_date)}` : "No expiry recorded"}
                </p>
              </div>
              {d.url && (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener"
                  className="btn-secondary shrink-0 px-3 py-2 text-sm"
                >
                  View
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
