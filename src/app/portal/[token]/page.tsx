import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/Brand";
import {
  PROJECT_STATUS_LABEL,
  CLASSIFICATION_LABEL,
  AIR_MONITORING_TYPE_LABEL,
} from "@/lib/roles";
import { formatDate } from "@/lib/format";
import type {
  ProjectStatus,
  ProjectClassification,
  AirMonitoringType,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface Portal {
  company: string;
  reference: string;
  address: string;
  status: ProjectStatus;
  classification: ProjectClassification;
  start_date: string | null;
  end_date: string | null;
  supervisor: string | null;
  client: string | null;
  air: {
    type: AirMonitoringType;
    result: number | null;
    pass: boolean | null;
    date: string | null;
  }[];
}

export default async function PortalPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createClient();
  const { data } = await supabase.rpc("get_portal", { p_token: params.token });
  const portal = data as Portal | null;
  if (!portal) notFound();

  const STATUS_PILL: Record<ProjectStatus, string> = {
    pending: "pill-neutral",
    setup: "pill-warn",
    live: "pill-ok",
    completed: "pill-neutral",
  };

  return (
    <main className="min-h-screen bg-surface-muted">
      <header className="bg-navy-600 px-5 py-5 text-white">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <BrandMark size={30} />
          <span className="font-semibold">{portal.company}</span>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Project status
          </p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">{portal.address}</h1>
            <span className={`pill ${STATUS_PILL[portal.status]} shrink-0`}>
              {PROJECT_STATUS_LABEL[portal.status]}
            </span>
          </div>
          <p className="text-sm text-ink-muted">
            {portal.reference} · {CLASSIFICATION_LABEL[portal.classification]}
          </p>
        </div>

        <section className="card p-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Meta label="Start" value={formatDate(portal.start_date)} />
            <Meta label="Expected completion" value={formatDate(portal.end_date)} />
            <Meta label="Site supervisor" value={portal.supervisor} />
            <Meta label="Prepared for" value={portal.client} />
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Air monitoring
          </h2>
          {portal.air.length === 0 ? (
            <p className="text-sm text-ink-muted">No results published yet.</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {portal.air.map((a, i) => {
                const pill =
                  a.pass === true ? "pill-ok" : a.pass === false ? "pill-danger" : "pill-warn";
                const label =
                  a.pass === true ? "Pass" : a.pass === false ? "Fail" : "Pending";
                return (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {AIR_MONITORING_TYPE_LABEL[a.type]}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {a.result != null && `${a.result} f/ml · `}
                        {formatDate(a.date)}
                      </p>
                    </div>
                    <span className={`pill ${pill} shrink-0`}>{label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="pb-6 pt-2 text-center text-xs text-ink-faint">
          Live project status provided by {portal.company} · Powered by AsTrack
        </p>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="text-ink">{value || "—"}</dd>
    </div>
  );
}
