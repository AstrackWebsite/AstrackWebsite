import { Spinner } from "@/components/Spinner";

// Shown instantly on navigation while the next page's data loads.
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size={36} label="Loading…" />
    </div>
  );
}
