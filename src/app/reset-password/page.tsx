"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updatePassword } from "./actions";
import { BrandMark, AsTrackWordmark } from "@/components/Brand";

const initialState: { error?: string } = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Saving…" : "Set new password"}
    </button>
  );
}

export default function ResetPasswordPage() {
  const [state, formAction] = useFormState(updatePassword, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-navy-700 to-navy-800 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark size={64} />
          <AsTrackWordmark onDark size={28} className="block" />
        </div>

        <form action={formAction} className="card space-y-4 p-6">
          <div>
            <h1 className="mb-1 font-semibold text-ink">Choose a new password</h1>
            <p className="text-sm text-ink-muted">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="password" className="label">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className="field"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label htmlFor="confirm" className="label">Confirm password</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              className="field"
              placeholder="••••••••"
              required
            />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
              {state.error}
            </p>
          )}
          <SubmitButton />
        </form>
      </div>
    </main>
  );
}
