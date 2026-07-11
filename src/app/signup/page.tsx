"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestAccess } from "./actions";
import { BrandMark } from "@/components/Brand";

const initialState: { error?: string; ok?: boolean } = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Submitting…" : "Request access"}
    </button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useFormState(requestAccess, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-navy-700 to-navy-800 px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark size={56} />
          <div>
            <h1 className="text-2xl font-bold text-white">Request access</h1>
            <p className="text-sm text-navy-100">Set up your company on AsTrack</p>
          </div>
        </div>

        {state?.ok ? (
          <div className="card p-6 text-center">
            <span className="pill pill-ok mb-3">Request received</span>
            <p className="text-sm text-ink-muted">
              Thanks — your company account has been created and is{" "}
              <span className="font-semibold text-ink">awaiting approval</span>.
              You&apos;ll be able to sign in once it&apos;s approved.
            </p>
            <a href="/login" className="btn-secondary mt-4 w-full">
              Back to log in
            </a>
          </div>
        ) : (
          <form action={formAction} className="card space-y-4 p-6">
            <div>
              <label htmlFor="company_name" className="label">Company name</label>
              <input id="company_name" name="company_name" className="field" required />
            </div>
            <div>
              <label htmlFor="contact_name" className="label">Your name</label>
              <input id="contact_name" name="contact_name" className="field" required />
            </div>
            <div>
              <label htmlFor="email" className="label">Work email</label>
              <input id="email" name="email" type="email" autoComplete="email" className="field" required />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" className="field" required minLength={8} />
              <p className="mt-1 text-xs text-ink-faint">At least 8 characters.</p>
            </div>

            {state?.error && (
              <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
                {state.error}
              </p>
            )}

            <SubmitButton />

            <p className="text-center text-sm text-ink-muted">
              Already have an account?{" "}
              <a href="/login" className="font-semibold text-navy-600">Log in</a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
