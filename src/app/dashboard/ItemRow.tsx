"use client";

import { useTransition } from "react";
import { setItemStatus } from "./actions";
import type { AttentionItem } from "@/lib/types";

const TYPE_LABEL: Record<AttentionItem["type"], string> = {
  bill: "Bill",
  renewal: "Renewal",
  appointment: "Appointment",
  deadline: "Deadline",
  reservation: "Reservation",
  document: "Document",
};

export function ItemRow({ item }: { item: AttentionItem }) {
  const [isPending, startTransition] = useTransition();

  const act = (status: "handled" | "dismissed") => {
    startTransition(() => setItemStatus(item.id, status));
  };

  return (
    <li className="flex items-center justify-between gap-4 rounded-md border border-neutral-200 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="text-xs text-neutral-500">
          {TYPE_LABEL[item.type]}
          {item.due_date ? ` · due ${item.due_date}` : ""}
          {" · "}
          {item.source}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => act("handled")}
          disabled={isPending}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50"
        >
          Handled
        </button>
        <button
          onClick={() => act("dismissed")}
          disabled={isPending}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </li>
  );
}
