import Link from "next/link";
import { AsTrackLogo } from "@/components/Brand";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-navy-700 to-navy-800 text-white">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <AsTrackLogo size={34} onDark />
        <Link href="/login" className="text-sm font-semibold text-navy-100 hover:text-white">
          Log in
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-10">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy-700/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-400 ring-1 ring-navy-500">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          Asbestos compliance, tracked
        </p>
        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">
          Replace site paperwork with real-time, auditable compliance.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-navy-100">
          AsTrack captures every site record digitally — registers, RPE checks,
          exposure, plant and closeout — with compliance enforced at the point of
          capture. Built for licensed asbestos contractors.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className="btn-accent">
            Request access
          </Link>
          <Link
            href="/login"
            className="btn-secondary border-navy-400 bg-transparent text-white active:bg-navy-700"
          >
            Log in
          </Link>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            ["Capture", "Registers, RPE, exposure, diary and photos — no paper, no transcription."],
            ["Enforce", "Expired certs block sign-in. Licensed plant checks gate the day."],
            ["Prove", "Tamper-evident records and a one-tap closeout PDF, ready for the client."],
          ].map(([title, body]) => (
            <div
              key={title}
              className="rounded-card border-t-2 border-accent-500 bg-navy-700/50 p-5 ring-1 ring-navy-600"
            >
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-navy-100">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-navy-600 py-6 text-center text-xs text-navy-200">
        AsTrack · HSE-licensed &amp; CAR 2012 compliant by design
      </footer>
    </main>
  );
}
