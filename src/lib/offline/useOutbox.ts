"use client";

import { useEffect, useState } from "react";
import { all, subscribe, type OutboxItem, type OutboxKind } from "./outbox";

/**
 * Reactive view of the outbox, optionally filtered by project and kind(s).
 * Re-renders whenever the queue changes (this tab or another).
 */
export function useOutbox(projectId?: string, kinds?: OutboxKind[]): OutboxItem[] {
  const [items, setItems] = useState<OutboxItem[]>([]);

  useEffect(() => {
    const refresh = () =>
      setItems(
        all().filter(
          (i) =>
            (!projectId || i.projectId === projectId) &&
            (!kinds || kinds.includes(i.kind))
        )
      );
    refresh();
    return subscribe(refresh);
  }, [projectId, kinds ? kinds.join(",") : ""]);

  return items;
}
