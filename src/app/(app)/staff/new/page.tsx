import { BackLink } from "@/components/BackLink";
import { AddStaffForm } from "@/components/AddStaffForm";
import { AI_ENABLED } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export default function AddStaffPage() {
  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <BackLink href="/staff" label="Back to staff" />
        <h1 className="text-xl font-bold text-ink">Add Staff</h1>
      </div>

      <p className="mb-4 text-sm text-ink-muted">
        Fields adapt to the selected position — only what&apos;s legally required
        to deploy them to site.
      </p>

      <AddStaffForm aiEnabled={AI_ENABLED} />
    </>
  );
}
