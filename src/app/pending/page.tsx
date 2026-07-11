import { redirect } from "next/navigation";
import { getMyContext } from "@/lib/data";
import { signOut } from "@/app/login/actions";
import { BrandMark } from "@/components/Brand";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const { user, profile, company } = await getMyContext();
  if (!user) redirect("/login");
  if (company?.status === "active") redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-600 px-6 text-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <BrandMark size={56} />
          <h1 className="text-2xl font-bold text-white">Awaiting approval</h1>
        </div>
        <div className="card p-6">
          <span className="pill pill-warn mb-3">Pending</span>
          <p className="text-sm text-ink-muted">
            {company?.name ? (
              <>
                <span className="font-semibold text-ink">{company.name}</span> is
                awaiting approval.{" "}
              </>
            ) : null}
            You&apos;ll get full access as soon as an administrator approves your
            company. Please check back shortly.
          </p>

          {profile?.is_platform_admin && (
            <a href="/admin" className="btn-primary mt-4 w-full">
              Go to platform admin
            </a>
          )}

          <form action={signOut} className="mt-3">
            <button type="submit" className="btn-secondary w-full">Sign out</button>
          </form>
        </div>
      </div>
    </main>
  );
}
