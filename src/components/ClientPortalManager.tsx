"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProjectPortal } from "@/app/(app)/client-portal/actions";

export interface PortalProject {
  id: string;
  address: string;
  reference: string;
  token: string;
  enabled: boolean;
}

export function ClientPortalManager({ projects }: { projects: PortalProject[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const toggle = (id: string, enabled: boolean) =>
    start(async () => {
      await setProjectPortal(id, enabled);
      router.refresh();
    });

  const copy = async (token: string) => {
    const link = `${origin}/portal/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked — the link is shown for manual copy */
    }
  };

  if (projects.length === 0) {
    return <p className="card p-4 text-sm text-ink-muted">No projects yet.</p>;
  }

  return (
    <div className="space-y-2">
      {projects.map((p) => {
        const link = origin ? `${origin}/portal/${p.token}` : `/portal/${p.token}`;
        return (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{p.address}</p>
                <p className="text-sm text-ink-muted">{p.reference}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(p.id, !p.enabled)}
                disabled={pending}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  p.enabled ? "bg-ok-100 text-ok-700" : "bg-navy-100 text-navy-700"
                }`}
              >
                {p.enabled ? "Shared ✓" : "Off"}
              </button>
            </div>

            {p.enabled && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={link}
                  className="field flex-1 truncate text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={() => copy(p.token)}
                  className="btn-secondary shrink-0 px-3 py-2 text-sm"
                >
                  {copied === p.token ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
