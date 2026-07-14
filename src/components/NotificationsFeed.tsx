"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markAllNotificationsRead } from "@/app/(app)/notification-actions";
import { formatDay, formatTime } from "@/lib/format";

export interface NotificationRow {
  id: string;
  projectId: string | null;
  actorName: string | null;
  message: string;
  createdAt: string;
  read: boolean;
}

export function NotificationsFeed({
  notifications,
  unread,
}: {
  notifications: NotificationRow[];
  unread: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (notifications.length === 0) return null;

  const markAll = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  };

  return (
    <section className="mb-6 rounded-xl border border-surface-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Site activity
          {unread > 0 && <span className="pill pill-warn">{unread} new</span>}
        </h2>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            disabled={pending}
            className="text-xs font-medium text-navy-600 disabled:opacity-50"
          >
            Mark all read
          </button>
        )}
      </div>
      <ul className="space-y-1">
        {notifications.map((n) => {
          const body = (
            <div
              className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2 ${
                n.read ? "" : "bg-amber-50"
              }`}
            >
              <p className="min-w-0 text-sm text-ink">
                {!n.read && (
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" />
                )}
                <span className="font-medium">{n.actorName ?? "Site"}</span>{" "}
                {n.message}
              </p>
              <span className="shrink-0 whitespace-nowrap text-xs text-ink-muted">
                {formatDay(n.createdAt)} {formatTime(n.createdAt)}
              </span>
            </div>
          );
          return (
            <li key={n.id}>
              {n.projectId ? (
                <Link href={`/projects/${n.projectId}`} className="block active:opacity-80">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
