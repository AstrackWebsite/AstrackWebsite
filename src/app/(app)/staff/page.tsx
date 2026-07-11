import Link from "next/link";
import { PageHeader } from "@/components/PageStub";
import { StaffList } from "@/components/StaffList";
import { getStaff } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const staff = await getStaff();
  const expiredOnly = searchParams.filter === "expired";

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <PageHeader title="Staff" />
        <Link href="/staff/new" className="btn-primary px-4 py-2 text-sm">
          + Add
        </Link>
      </div>

      <StaffList staff={staff} initialExpiredOnly={expiredOnly} />
    </>
  );
}
