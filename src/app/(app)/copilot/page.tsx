import { PageHeader } from "@/components/PageStub";
import { ChatPanel } from "@/components/ChatPanel";
import { AI_ENABLED } from "@/lib/ai/client";
import { askCopilotAction } from "./actions";

export const dynamic = "force-dynamic";

const STARTERS = [
  "Which staff have expired certificates?",
  "What projects are live right now?",
  "Is any plant out of certification?",
  "Any open RIDDOR incidents or over-limit exposure?",
];

export default function CopilotPage() {
  return (
    <>
      <PageHeader
        title="Copilot"
        subtitle="Ask questions about your staff, projects, plant and compliance"
      />

      {AI_ENABLED ? (
        <ChatPanel
          ask={askCopilotAction}
          starters={STARTERS}
          disclaimer="Answers come only from your own AsTrack data (this company). Read-only — it can't change anything. Double-check before acting on anything critical."
          placeholder="Ask about your staff, projects or compliance…"
        />
      ) : (
        <div className="card p-6 text-center">
          <p className="text-sm text-ink-muted">
            The copilot isn&apos;t switched on yet. Add an{" "}
            <span className="font-medium text-ink">ANTHROPIC_API_KEY</span> in your
            deployment settings to enable it.
          </p>
        </div>
      )}
    </>
  );
}
