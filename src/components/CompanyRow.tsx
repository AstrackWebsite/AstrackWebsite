"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCompanyStatus } from "@/app/(app)/admin/actions";
import { gbpCompact, formatDate } from "@/lib/format";
import type { Company } from "@/lib/types";
import type { CompanyOverview } from "@/lib/data";

const STATUS_PILL: Record<Company["status"], string> = {
  pending: "pill-warn",
  active: "pill-ok",
  suspended: "pill-danger",
};

export function CompanyRow({ overview }: { overview: CompanyOverview }) {
  const { company } = overview;
  const router = useRouter();
  const [pending, start] = useTransition();

  const act = (status: Company["status"]) =>
    start(async () => {
      await setCompanyStatus(company.id, status);
      router.refresh();
    });

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{company.name}</p>
          <p className="truncate text-sm text-ink-muted">
            {company.contact_name ?? "—"}
            {company.contact_phone ? ` · ${company.contact_phone}` : ""}
          </p>
          {company.contact_email && (
            <p className="truncate text-xs text-ink-faint">{company.contact_email}</p>
          )}
        </div>
        <span className={`pill ${STATUS_PILL[company.status]} shrink-0`}>
          {company.status}
        </span>
      </div>

      {/* Metrics */}
      <div className="mt-3 grid grid-cols-4 gap-2 rounded-lg bg-surface-muted p-2 text-center">
        <Metric label="Staff" value={overview.staffCount} />
        <Metric label="Projects" value={overview.projectCount} />
        <Metric label="Turnover" value={gbpCompact(overview.turnover)} accent />
        <Metric
          label="Flags"
          value={overview.flags}
          danger={overview.flags > 0}
        />
      </div>

      <p className="mt-2 text-xs text-ink-faint">
        Joined {formatDate(company.created_at)}
        {overview.activeProjectCount > 0 &&
          ` · ${overview.activeProjectCount} active`}
      </p>

      <div className="mt-3 flex gap-2">
        {company.status !== "active" && (
          <button onClick={() => act("active")} disabled={pending} className="btn-primary flex-1 px-3 py-2 text-sm">
            Approve
          </button>
        )}
        {company.status === "active" && (
          <button onClick={() => act("suspended")} disabled={pending} className="btn-secondary flex-1 px-3 py-2 text-sm">
            Suspend
          </button>
        )}
        {company.status === "suspended" && (
          <button onClick={() => act("active")} disabled={pending} className="btn-primary flex-1 px-3 py-2 text-sm">
            Reactivate
          </button>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  danger?: boolean;
}) {
  const color = danger ? "text-danger-600" : accent ? "text-accent-600" : "text-ink";
  return (
    <div>
      <div className={`text-base font-bold leading-none ${color}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </div>
    </div>
  );
}
