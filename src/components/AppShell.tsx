"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { BrandMark } from "./Brand";
import { signOut } from "@/app/login/actions";

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-navy-600 px-4 text-white shadow-raised">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-lg active:bg-navy-700"
        >
          <HamburgerIcon />
        </button>
        <div className="flex items-center gap-2">
          <BrandMark size={30} />
          <span className="text-base font-semibold tracking-tight">
            ART Asbestos
          </span>
        </div>
      </header>

      {/* Drawer + overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/50"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <nav
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-surface shadow-raised transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-14 items-center justify-between bg-navy-600 px-4 text-white">
          <div className="flex items-center gap-2">
            <BrandMark size={30} />
            <span className="font-semibold">ART Asbestos</span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg active:bg-navy-700"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex h-[calc(100vh-3.5rem)] flex-col">
          <div className="flex-1 overflow-y-auto py-2">
            {NAV.map((section, i) => (
              <div key={i} className="py-1">
                {section.heading && (
                  <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {section.heading}
                  </p>
                )}
                {section.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  if (item.placeholder) {
                    return (
                      <span
                        key={item.href}
                        className="flex min-h-tap cursor-not-allowed items-center justify-between px-4 py-3 text-base text-ink-faint"
                      >
                        {item.label}
                        <span className="pill pill-neutral">Soon</span>
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-tap items-center px-4 py-3 text-base font-medium ${
                        active
                          ? "border-l-4 border-navy-600 bg-navy-50 text-navy-700"
                          : "border-l-4 border-transparent text-ink active:bg-surface-muted"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer: user + sign out */}
          <div className="border-t border-surface-border p-4">
            <p className="mb-2 truncate text-sm text-ink-muted">{userEmail}</p>
            <form action={signOut}>
              <button type="submit" className="btn-secondary w-full">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-2xl px-4 py-5">{children}</main>
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
