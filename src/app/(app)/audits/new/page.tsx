import Link from "next/link";
import { getStaff, getProjects } from "@/lib/data";
import { AuditForm } from "@/components/AuditForm";

export const dynamic = "force-dynamic";

export default async function NewAuditPage() {
  const [staff, projects] = await Promise.all([getStaff(), getProjects()]);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Link href="/audits" className="text-navy-500" aria-label="Back to audits">
          ‹
        </Link>
        <h1 className="text-xl font-bold text-ink">New site audit</h1>
      </div>
      <AuditForm staff={staff} projects={projects} />
    </>
  );
}
