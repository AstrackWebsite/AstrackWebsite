import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getMyContext } from "@/lib/data";
import { isOfficeRole } from "@/lib/types";

/**
 * Write a documented notification to the office/admin for a site log a
 * supervisor has recorded. Best-effort: never throws, so a failure here can't
 * break the underlying log action. Only fires for non-office (site) actors —
 * this is the supervisor-to-admin ping; office actions don't notify the office.
 */
export async function notifyOffice(opts: {
  projectId?: string | null;
  kind: string;
  message: string;
}): Promise<void> {
  try {
    const ctx = await getMyContext();
    if (!ctx.user || !ctx.company) return;
    if (isOfficeRole(ctx.profile?.app_role)) return;

    // Denormalise a display name for the actor so the feed needs no join.
    let actorName: string | null = ctx.user.email ?? null;
    if (ctx.profile?.staff_id) {
      const supabase = createClient();
      const { data } = await supabase
        .from("staff")
        .select("name")
        .eq("id", ctx.profile.staff_id)
        .maybeSingle();
      if (data?.name) actorName = data.name;
    }

    const supabase = createClient();
    await supabase.from("notification").insert({
      project_id: opts.projectId ?? null,
      kind: opts.kind,
      message: opts.message,
      actor_id: ctx.profile?.id ?? null,
      actor_name: actorName,
    });
  } catch {
    /* notifications are best-effort — swallow errors */
  }
}
