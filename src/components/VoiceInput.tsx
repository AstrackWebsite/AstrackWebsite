"use client";

import { useEffect, useRef, useState } from "react";

// Voice capture — hands-free dictation for site use.
// -----------------------------------------------------------------------------
// Uses the browser's built-in Web Speech API (SpeechRecognition). It runs
// entirely on-device, costs nothing and needs no API key, so it works whether
// or not the AI features are switched on. The button only renders when the
// browser supports it (Chrome / Edge / Android). Transcribed text is appended
// via onAppend so a user can dictate then tidy up by hand.

// Minimal typings for the non-standard SpeechRecognition API.
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
      .webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function VoiceInput({
  onAppend,
  label = "Dictate",
}: {
  onAppend: (text: string) => void;
  label?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getRecognition() !== null);
    return () => recRef.current?.stop();
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    rec.lang = "en-GB";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      if (finalText.trim()) onAppend(finalText.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={listening}
      className={`inline-flex min-h-tap items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
        listening
          ? "border-danger-200 bg-danger-50 text-danger-700"
          : "border-surface-border bg-surface text-navy-600 active:bg-surface-muted"
      }`}
    >
      <MicIcon listening={listening} />
      {listening ? "Listening… tap to stop" : label}
    </button>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${listening ? "animate-pulse text-danger-600" : "text-accent-600"}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11z" />
    </svg>
  );
}
