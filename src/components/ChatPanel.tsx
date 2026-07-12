"use client";

import { useRef, useState, useTransition } from "react";
import { VoiceInput } from "@/components/VoiceInput";
import type { ChatMsg, ChatReply } from "@/lib/ai/chatTypes";

/**
 * Reusable chat surface. Takes an `ask` server action that receives the full
 * conversation and returns the next reply. Used by the compliance assistant and
 * the data copilot.
 */
export function ChatPanel({
  ask,
  starters,
  disclaimer,
  placeholder,
}: {
  ask: (messages: ChatMsg[]) => Promise<ChatReply>;
  starters: string[];
  disclaimer: string;
  placeholder: string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || pending) return;
    setError(null);
    const next: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    startTransition(async () => {
      const res = await ask(next);
      if (res.ok) setMessages((m) => [...m, { role: "assistant", content: res.answer }]);
      else setError(res.error);
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: "smooth" })
      );
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-700">{disclaimer}</p>

      {messages.length === 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink-muted">Try asking…</p>
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="card w-full p-3 text-left text-sm text-ink active:bg-surface-muted"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.map((m, i) => (
        <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
          <div
            className={
              m.role === "user"
                ? "max-w-[85%] rounded-2xl rounded-br-sm bg-navy-600 px-4 py-2.5 text-sm text-white"
                : "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface px-4 py-2.5 text-sm text-ink shadow-card"
            }
          >
            {m.content}
          </div>
        </div>
      ))}

      {pending && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-sm bg-surface px-4 py-2.5 text-sm text-ink-muted shadow-card">
            Thinking…
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-warn-50 px-3 py-2 text-sm font-medium text-warn-700">
          {error}
        </p>
      )}

      <div ref={endRef} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-4 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="field max-h-32 flex-1 resize-none"
        />
        <VoiceInput label="" onAppend={(t) => setInput((v) => (v ? `${v} ${t}` : t))} />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="btn-primary shrink-0 px-4 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
