import { PageHeader } from "@/components/PageStub";
import { ChatPanel } from "@/components/ChatPanel";
import { AI_ENABLED } from "@/lib/ai/client";
import { askAssistantAction } from "./actions";

export const dynamic = "force-dynamic";

const STARTERS = [
  "When is asbestos work notifiable (licensed) vs non-licensed?",
  "What does a 4-stage clearance involve?",
  "Is a needlestick-type cut from sheeting RIDDOR reportable?",
  "How often do face-fit tests and medicals need renewing?",
];

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        title="Compliance Assistant"
        subtitle="Ask about CAR 2012, clearance, RIDDOR and site practice"
      />

      {AI_ENABLED ? (
        <ChatPanel
          ask={askAssistantAction}
          starters={STARTERS}
          disclaimer="General guidance on UK asbestos compliance (CAR 2012, HSG247/248, RIDDOR). Not legal advice — confirm anything consequential with your competent person, risk assessment or the HSE."
          placeholder="Ask a compliance question…"
        />
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
