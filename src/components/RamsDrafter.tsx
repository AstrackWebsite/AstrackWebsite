"use client";

import { useRef, useState } from "react";

// Streams an AI RAMS draft from /api/rams into an editable box, with copy and
// download. RAMS are safety-critical, so the UI keeps a standing reminder that
// the output is a draft for a competent person to complete and approve.

export function RamsDrafter({
  projectId,
  reference,
}: {
  projectId: string;
  reference: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setText("");
    try {
      const res = await fetch("/api/rams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error ?? "Could not start the draft.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((t) => t + decoder.decode(value, { stream: true }));
        boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the text manually.");
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RAMS-draft-${reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary w-full"
      >
        Draft RAMS with AI
      </button>
    );
  }

  return (
    <section className="card space-y-3 border-accent-200 bg-accent-50/50 p-5">
      <div className="flex items-start gap-2">
        <SparkIcon />
        <div>
          <h2 className="font-semibold text-ink">Draft RAMS</h2>
          <p className="text-sm text-ink-muted">
            A first-draft Risk Assessment &amp; Method Statement from this
            project&apos;s details.
          </p>
        </div>
      </div>

      <p className="rounded-lg bg-warn-50 px-3 py-2 text-xs font-medium text-warn-700">
        Draft only. It uses placeholders for survey-specific detail and must be
        completed, checked and approved by a competent person before use — it is
        not a site-specific risk assessment on its own.
      </p>

      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="btn-secondary w-full"
      >
        {busy ? "Drafting…" : text ? "Regenerate" : "Generate draft"}
      </button>

      {error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}

      {text && (
        <>
          <textarea
            ref={boxRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            className="field font-mono text-xs leading-relaxed"
          />
          <div className="flex gap-2">
            <button type="button" onClick={copy} className="btn-secondary flex-1">
              {copied ? "Copied ✓" : "Copy"}
            </button>
            <button type="button" onClick={download} className="btn-secondary flex-1">
              Download
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-5 w-5 shrink-0 text-accent-600"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l1.6 4.8L18 8l-4.4 1.2L12 14l-1.6-4.8L6 8l4.4-1.2L12 2zM19 13l.9 2.6L22 16l-2.1.4L19 19l-.9-2.6L16 16l2.1-.4L19 13zM5 14l.9 2.6L8 17l-2.1.4L5 20l-.9-2.6L2 17l2.1-.4L5 14z" />
    </svg>
  );
}
