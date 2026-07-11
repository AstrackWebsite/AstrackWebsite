"use client";

import { useMemo, useState } from "react";
import type { Staff } from "@/lib/types";
import { StaffRow } from "./StaffRow";
import { STAFF_ROLE_ORDER, STAFF_ROLE_GROUP } from "@/lib/roles";
import { hasExpiredCert } from "@/lib/compliance";

export function StaffList({
  staff,
  initialExpiredOnly = false,
}: {
  staff: Staff[];
  initialExpiredOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [expiredOnly, setExpiredOnly] = useState(initialExpiredOnly);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter((s) => {
      if (expiredOnly && !hasExpiredCert(s)) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [staff, query, expiredOnly]);

  const groups = STAFF_ROLE_ORDER.map((role) => ({
    role,
    members: filtered.filter((s) => s.role === role),
  })).filter((g) => g.members.length > 0);

  return (
    <>
      <div className="mb-4 space-y-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search staff by name…"
          className="field"
          aria-label="Search staff"
        />
        <label className="flex min-h-tap items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={expiredOnly}
            onChange={(e) => setExpiredOnly(e.target.checked)}
            className="h-5 w-5 rounded border-surface-border text-danger-600 focus:ring-danger-500"
          />
          Show only staff with expired certs
        </label>
      </div>

      {groups.length === 0 && (
        <p className="card p-4 text-sm text-ink-muted">No staff match.</p>
      )}

      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.role}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {STAFF_ROLE_GROUP[g.role]}
              <span className="ml-1 font-normal text-ink-faint">
                ({g.members.length})
              </span>
            </h2>
            <div className="space-y-2">
              {g.members.map((s) => (
                <StaffRow key={s.id} staff={s} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
