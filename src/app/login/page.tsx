"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "./actions";
import { BrandMark, AsTrackWordmark } from "@/components/Brand";

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
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-navy-700 to-navy-800 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark size={64} />
          <div>
            <AsTrackWordmark onDark size={28} className="block" />
            <p className="mt-1 text-sm text-navy-100">Site compliance platform</p>
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
              placeholder="you@yourcompany.co.uk"
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

          <a
            href="/forgot-password"
            className="block w-full text-center text-sm font-medium text-navy-500"
          >
            Forgot password?
          </a>
        </form>

        <p className="mt-5 text-center text-sm text-navy-100">
          New contractor?{" "}
          <a href="/signup" className="font-semibold text-white underline">
            Request access
          </a>
        </p>

        <p className="mt-6 text-center text-xs text-navy-200">
          Built for HSE-licensed contractors · CAR 2012 by design
        </p>
      </div>
    </main>
  );
}
