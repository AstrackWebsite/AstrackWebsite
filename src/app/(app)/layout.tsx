import { redirect } from "next/navigation";
import { getMyContext } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { AI_ENABLED } from "@/lib/ai/client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, company } = await getMyContext();

  if (!user) redirect("/login");
  // No company yet, or awaiting approval → hold at the pending screen.
  if (!company || company.status !== "active") redirect("/pending");

  return (
    <AppShell
      userEmail={user.email ?? ""}
      companyName={company.name}
      isPlatformAdmin={profile?.is_platform_admin ?? false}
      aiEnabled={AI_ENABLED}
    >
      {children}
    </AppShell>
  );
}
