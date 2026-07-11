import { PageHeader } from "@/components/PageStub";
import { getAllPlant } from "@/lib/data";
import { PLANT_TYPE_LABEL } from "@/lib/roles";
import { isExpired, isExpiringSoon } from "@/lib/compliance";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PlantPage() {
  const plant = await getAllPlant();
  const expired = plant.filter((p) => isExpired(p.cert_expiry)).length;
  const expiring = plant.filter((p) => isExpiringSoon(p.cert_expiry)).length;

  return (
    <>
      <PageHeader title="Plant & Equipment" subtitle="Company asset register" />

      <div className="mb-5 grid grid-cols-3 gap-2">
        <Stat n={plant.length} label="Assets" />
        <Stat n={expiring} label="Expiring" tone={expiring ? "warn" : undefined} />
        <Stat n={expired} label="Expired" tone={expired ? "danger" : undefined} />
      </div>

      <div className="space-y-2">
        {plant.map((p) => {
          const isExp = isExpired(p.cert_expiry);
          const isExpg = isExpiringSoon(p.cert_expiry);
          return (
            <div
              key={p.id}
              className={`card p-4 ${isExp ? "border-danger-200 bg-danger-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-ink">{p.asset_id}</span>
                <span
                  className={`pill ${
                    isExp ? "pill-danger" : isExpg ? "pill-warn" : "pill-ok"
                  }`}
                >
                  {isExp ? "Cert expired" : isExpg ? "Cert expiring" : "Cert valid"}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {p.name ?? PLANT_TYPE_LABEL[p.type]}
                {p.cert_expiry && ` · ${formatDate(p.cert_expiry)}`}
                {p.test_reading != null && ` · ${p.test_reading} m³/h`}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Stat({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone?: "danger" | "warn";
}) {
  const color =
    tone === "danger" ? "text-danger-600" : tone === "warn" ? "text-warn-700" : "text-ink";
  return (
    <div className="card p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{n}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </div>
    </div>
  );
}
