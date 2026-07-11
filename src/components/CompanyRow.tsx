"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCompanyStatus } from "@/app/(app)/admin/actions";
import type { Company } from "@/lib/types";

const STATUS_PILL: Record<Company["status"], string> = {
  pending: "pill-warn",
  active: "pill-ok",
  suspended: "pill-danger",
};

export function CompanyRow({ company }: { company: Company }) {
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
            {company.contact_name ? `${company.contact_name} · ` : ""}
            {company.contact_email ?? ""}
          </p>
        </div>
        <span className={`pill ${STATUS_PILL[company.status]} shrink-0`}>
          {company.status}
        </span>
      </div>

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
