import { redirect } from "next/navigation";
import { getMyContext } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { AI_ENABLED } from "@/lib/ai/client";
import { isOfficeRole } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, company } = await getMyContext();

  if (!user) redirect("/login");
  // No company yet, or awaiting approval → hold at the pending screen.
  if (!company || company.status !== "active") redirect("/pending");

  const office = isOfficeRole(profile?.app_role);

  return (
    <AppShell
      userEmail={user.email ?? ""}
      companyName={company.name}
      isPlatformAdmin={profile?.is_platform_admin ?? false}
      aiEnabled={AI_ENABLED}
      office={office}
    >
      {children}
    </AppShell>
  );
}
