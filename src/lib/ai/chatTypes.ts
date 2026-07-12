// Shared chat shapes — safe to import from client or server (no SDK import).

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export type ChatReply =
  | { ok: true; answer: string }
  | { ok: false; error: string };
