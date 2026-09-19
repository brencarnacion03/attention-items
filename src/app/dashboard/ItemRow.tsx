"use client";

import { useTransition } from "react";
import { setItemStatus } from "./actions";
import { AddressLink } from "./AddressLink";
import type { AttentionItem } from "@/lib/types";

const TYPE_LABEL: Record<AttentionItem["type"], string> = {
  bill: "Bill",
  renewal: "Renewal",
  appointment: "Appointment",
  deadline: "Deadline",
  reservation: "Reservation",
  document: "Document",
};

function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function ItemRow({ item }: { item: AttentionItem }) {
  const [isPending, startTransition] = useTransition();

  const act = (status: "handled" | "dismissed") => {
    startTransition(() => setItemStatus(item.id, status));
  };

  return (
    <li
      className={`flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 px-4 py-3 shadow-sm transition-all duration-200 ${
        isPending ? "scale-[0.98] opacity-40" : "scale-100 opacity-100"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {item.title}
          {item.amount != null ? ` · $${item.amount.toFixed(2)}` : ""}
        </p>
        <div className="text-xs text-neutral-500">
          {TYPE_LABEL[item.type]}
          {item.due_date ? ` · due ${item.due_date}` : ""}
          {item.event_time ? ` at ${formatTime12h(item.event_time)}` : ""}
          {item.address && (
            <>
              {" · "}
              <AddressLink address={item.address} />
            </>
          )}
          {" · "}
          {item.source}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => act("handled")}
          disabled={isPending}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium transition-transform hover:bg-neutral-100 active:scale-90 disabled:opacity-50"
        >
          Handled
        </button>
        <button
          onClick={() => act("dismissed")}
          disabled={isPending}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium transition-transform hover:bg-neutral-100 active:scale-90 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </li>
  );
}
