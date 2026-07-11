"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "./actions";
import { BrandMark } from "@/components/Brand";

const initialState: { error?: string } = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign In"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(signIn, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-600 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark size={64} />
          <div>
            <h1 className="text-2xl font-bold text-white">ART Asbestos</h1>
            <p className="text-sm text-navy-100">Site compliance platform</p>
          </div>
        </div>

        <form action={formAction} className="card space-y-4 p-6">
          <div>
            <label htmlFor="email" className="label">
              Username or email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              className="field"
              placeholder="you@artasbestos.co.uk"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
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

          <button
            type="button"
            className="w-full text-center text-sm font-medium text-navy-500"
          >
            Forgot password?
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-navy-200">
          HSE-licensed · CAR 2012 compliant by design
        </p>
      </div>
    </main>
  );
}
