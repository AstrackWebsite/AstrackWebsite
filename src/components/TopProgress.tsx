"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// A thin progress bar at the very top of the screen that appears the instant an
// internal link is tapped and completes when the new page arrives. Gives
// immediate "it's working" feedback on navigations, which otherwise feel
// unresponsive for the first moment. No dependencies.
export function TopProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failsafe = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (trickle.current) clearInterval(trickle.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (failsafe.current) clearTimeout(failsafe.current);
    trickle.current = hideTimer.current = failsafe.current = null;
  };

  const start = () => {
    clearTimers();
    setVisible(true);
    setWidth(10);
    trickle.current = setInterval(() => {
      setWidth((w) => (w < 90 ? w + (90 - w) * 0.18 : w));
    }, 250);
    // If a click didn't actually navigate, don't leave the bar hanging.
    failsafe.current = setTimeout(finish, 8000);
  };

  const finish = () => {
    clearTimers();
    setWidth(100);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 250);
  };

  // Start on any left-click of an internal link.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || href.startsWith("#") || target === "_blank" || anchor.hasAttribute("download"))
        return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search)
          return;
      } catch {
        return;
      }
      start();
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, []);

  // The pathname changing means the navigation landed — complete the bar.
  useEffect(() => {
    if (visible) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
    >
      <div
        className="h-full bg-accent-500 shadow-[0_0_8px] shadow-accent-400 transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
