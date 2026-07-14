import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageStub";
import { CreateSupervisorForm } from "@/components/CreateSupervisorForm";
import { getMyContext, getStaff } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, ADMIN_ENABLED } from "@/lib/supabase/admin";
import { isOfficeRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const ctx = await getMyContext();
  if (!isOfficeRole(ctx.profile?.app_role)) redirect("/projects");

  const staff = await getStaff();
  const nameById = new Map(staff.map((s) => [s.id, s.name]));

  // Existing supervisor logins for this company (management can read profiles).
  const supabase = createClient();
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, staff_id")
    .eq("app_role", "site");

  let supervisors: { id: string; email: string | null; staffName: string | null }[] = [];
  if (profs?.length && ADMIN_ENABLED) {
    try {
      const admin = createAdminClient();
      const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const emailById = new Map((usersData?.users ?? []).map((u) => [u.id, u.email ?? null]));
      supervisors = profs.map((p) => ({
        id: p.id,
        email: emailById.get(p.id) ?? null,
        staffName: p.staff_id ? nameById.get(p.staff_id) ?? null : null,
      }));
    } catch {
      supervisors = profs.map((p) => ({
        id: p.id,
        email: null,
        staffName: p.staff_id ? nameById.get(p.staff_id) ?? null : null,
      }));
    }
  }

  return (
    <>
      <PageHeader
        title="Supervisors"
        subtitle="Create on-site logins — they see only their assigned jobs"
      />

      {!ADMIN_ENABLED && (
        <p className="mb-4 rounded-lg bg-warn-50 px-3 py-2 text-sm font-medium text-warn-700">
          Add SUPABASE_SERVICE_ROLE_KEY to your deployment to create supervisor logins.
        </p>
      )}

      {supervisors.length > 0 && (
        <div className="mb-5 space-y-2">
          {supervisors.map((s) => (
            <div key={s.id} className="card flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{s.staffName ?? "Supervisor"}</p>
                <p className="truncate text-sm text-ink-muted">{s.email ?? "—"}</p>
              </div>
              <span className="pill pill-neutral shrink-0">Site login</span>
            </div>
          ))}
        </div>
      )}

      <CreateSupervisorForm staff={staff.map((s) => ({ id: s.id, name: s.name }))} />
    </>
  );
}
