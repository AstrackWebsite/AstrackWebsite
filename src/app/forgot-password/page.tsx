"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestReset } from "./actions";
import { BrandMark, AsTrackWordmark } from "@/components/Brand";

const initialState: { error?: string; ok?: boolean } = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Sending…" : "Send reset link"}
    </button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(requestReset, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-navy-700 to-navy-800 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark size={64} />
          <AsTrackWordmark onDark size={28} className="block" />
        </div>

        {state?.ok ? (
          <div className="card space-y-3 p-6 text-center">
            <p className="text-2xl">📧</p>
            <h1 className="font-semibold text-ink">Check your email</h1>
            <p className="text-sm text-ink-muted">
              If that address has an account, we&apos;ve sent a link to reset your
              password. It expires shortly — open it on this device.
            </p>
            <a href="/login" className="btn-secondary w-full">Back to sign in</a>
          </div>
        ) : (
          <form action={formAction} className="card space-y-4 p-6">
            <div>
              <h1 className="mb-1 font-semibold text-ink">Reset your password</h1>
              <p className="text-sm text-ink-muted">
                Enter your account email and we&apos;ll send you a reset link.
              </p>
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="field"
                placeholder="you@yourcompany.co.uk"
                required
              />
            </div>
            {state?.error && (
              <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
                {state.error}
              </p>
            )}
            <SubmitButton />
            <a href="/login" className="block text-center text-sm font-medium text-navy-500">
              Back to sign in
            </a>
          </form>
        )}
      </div>
    </main>
  );
}
