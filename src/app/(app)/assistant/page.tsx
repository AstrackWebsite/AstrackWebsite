import { PageHeader } from "@/components/PageStub";
import { ComplianceAssistant } from "@/components/ComplianceAssistant";
import { AI_ENABLED } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        title="Compliance Assistant"
        subtitle="Ask about CAR 2012, clearance, RIDDOR and site practice"
      />

      {AI_ENABLED ? (
        <ComplianceAssistant />
      ) : (
        <div className="card p-6 text-center">
          <p className="text-sm text-ink-muted">
            The AI assistant isn&apos;t switched on yet. Add an{" "}
            <span className="font-medium text-ink">ANTHROPIC_API_KEY</span> in your
            deployment settings to enable it.
          </p>
        </div>
      )}
    </>
  );
}
