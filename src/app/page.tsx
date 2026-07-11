import Link from "next/link";
import { BrandMark } from "@/components/Brand";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-navy-600 text-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <BrandMark size={34} />
          <span className="text-lg font-semibold">ART Asbestos</span>
        </div>
        <Link href="/login" className="text-sm font-semibold text-navy-100">
          Log in
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-16 pt-8">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-200">
          For licensed asbestos removal
        </p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Replace site paperwork with real-time, auditable compliance.
        </h1>
        <p className="mt-4 max-w-xl text-navy-100">
          Capture every site record digitally — registers, RPE checks, exposure,
          plant and closeout — with compliance enforced at the point of capture.
          Built by an operating contractor, not a software vendor.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary bg-white text-navy-700 hover:bg-navy-50">
            Request access
          </Link>
          <Link
            href="/login"
            className="btn-secondary border-navy-400 bg-transparent text-white active:bg-navy-700"
          >
            Log in
          </Link>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            ["Capture", "Registers, RPE, exposure, diary and photos — no paper, no transcription."],
            ["Enforce", "Expired certs block sign-in. Licensed plant checks gate the day."],
            ["Prove", "Tamper-evident records and a one-tap closeout PDF, ready for the client."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-card bg-navy-700/60 p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-navy-100">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-navy-500 py-6 text-center text-xs text-navy-200">
        HSE-licensed · CAR 2012 compliant by design
      </footer>
    </main>
  );
}
