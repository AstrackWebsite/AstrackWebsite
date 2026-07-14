"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Mark a single notification read. Office/management only (RLS-enforced). */
export async function markNotificationRead(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("notification")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) return { error: "Could not update the notification." };
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true };
}

/** Mark every unread notification read. */
export async function markAllNotificationsRead() {
  const supabase = createClient();
  const { error } = await supabase
    .from("notification")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) return { error: "Could not update notifications." };
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true };
}
