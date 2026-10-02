"use client";

import { useRef, useState, useTransition } from "react";
import { draftReplyForItem, editItem, setItemStatus, type ReplyDraft } from "./actions";
import { deleteCalendarItem } from "@/app/calendar/actions";
import { AddressLink } from "./AddressLink";
import type { AttentionItem, ItemType } from "@/lib/types";

const TYPE_LABEL: Record<AttentionItem["type"], string> = {
  bill: "Bill",
  renewal: "Renewal",
  appointment: "Appointment",
  deadline: "Deadline",
  reservation: "Reservation",
  document: "Document",
};

const TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: "bill", label: "Bill" },
  { value: "renewal", label: "Renewal" },
  { value: "appointment", label: "Appointment" },
  { value: "deadline", label: "Deadline" },
  { value: "reservation", label: "Reservation" },
  { value: "document", label: "Document" },
];

const NEEDS_TIME_AND_ADDRESS: ItemType[] = ["appointment", "reservation"];

const DELETE_WIDTH = 84;
const SWIPE_OPEN_THRESHOLD = DELETE_WIDTH * 0.55;
const SWIPE_START_PX = 6;
const EXIT_MS = 180;
// Taps on these must keep working normally, so they never start a swipe.
const INTERACTIVE = "button, a, input, select, textarea, label";

function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4 20h4L18.5 9.5a1 1 0 0 0 0-1.4l-2.6-2.6a1 1 0 0 0-1.4 0L4 15v5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const canDraftReply = (item: AttentionItem) => item.source === "gmail" && item.auto_handleable && item.status === "new";

export function ItemRow({ item }: { item: AttentionItem }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<ItemType>(item.type);
  const [error, setError] = useState<string | null>(null);
  const showTimeAndAddress = NEEDS_TIME_AND_ADDRESS.includes(type);

  const [draftOpen, setDraftOpen] = useState(false);
  const [isDrafting, startDraftTransition] = useTransition();
  const [draft, setDraft] = useState<ReplyDraft | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const swipe = useRef<{ id: number; x: number; y: number; from: number; active: boolean } | null>(null);

  const act = (status: "handled" | "dismissed") => {
    startTransition(() => setItemStatus(item.id, status));
  };

  const clampDrag = (x: number) => Math.min(0, Math.max(-DELETE_WIDTH - 16, x));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPending || removing || (e.target as HTMLElement).closest(INTERACTIVE)) return;
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: dragX, active: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    if (!s.active) {
      // Wait until it's clearly a horizontal drag so vertical scrolling and taps are untouched.
      if (Math.abs(dx) < SWIPE_START_PX || Math.abs(dx) < Math.abs(e.clientY - s.y)) return;
      s.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    setDragX(clampDrag(s.from + dx));
  };

  const endDrag = () => {
    const s = swipe.current;
    swipe.current = null;
    if (!s?.active) return;
    setDragging(false);
    setDragX((x) => (x < -SWIPE_OPEN_THRESHOLD ? -DELETE_WIDTH : 0));
  };

  const handleDelete = () => {
    setRemoving(true);
    setTimeout(() => startTransition(() => deleteCalendarItem(item.id)), EXIT_MS);
  };

  const closeEdit = () => {
    setEditing(false);
    setType(item.type);
    setError(null);
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await editItem(item.id, formData);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save changes.");
      }
    });
  };

  const openDraft = () => {
    setDraftOpen(true);
    if (draft || isDrafting) return;
    setDraftError(null);
    startDraftTransition(async () => {
      try {
        const result = await draftReplyForItem(item.id);
        setDraft(result);
        setDraftBody(result.body);
      } catch (err) {
        setDraftError(err instanceof Error ? err.message : "Could not draft a reply.");
      }
    });
  };

  const gmailComposeUrl = draft
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(draft.to)}&su=${encodeURIComponent(
        draft.subject
      )}&body=${encodeURIComponent(draftBody)}`
    : "#";

  return (
    <li
      className={`relative overflow-x-clip rounded-2xl transition-[opacity,transform] duration-200 ${
        removing ? "scale-95 opacity-0" : isPending ? "scale-[0.98] opacity-40" : "scale-100 opacity-100"
      }`}
    >
      <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: DELETE_WIDTH }}>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending || removing}
          aria-label={`Delete ${item.title}`}
          className="flex flex-1 items-center justify-center rounded-2xl bg-red-600 text-sm font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ transform: `translateX(${dragX}px)`, touchAction: "pan-y" }}
        className={`card-surface relative px-4 py-3 ${dragging ? "" : "transition-transform duration-200 ease-out"}`}
      >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-950">
            {item.title}
            {item.amount != null ? ` · $${item.amount.toFixed(2)}` : ""}
          </p>
          <div className="text-xs text-ink-500">
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
            {canDraftReply(item) && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => (draftOpen ? setDraftOpen(false) : openDraft())}
                  className="font-medium text-hunter-600 underline transition-colors hover:text-hunter-700"
                >
                  {draftOpen ? "Hide reply" : "Draft reply"}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => (editing ? closeEdit() : setEditing(true))}
            aria-label={editing ? "Cancel editing" : "Edit"}
            className={`rounded-full border p-1.5 transition-transform active:scale-90 ${
              editing
                ? "border-hunter-600 bg-hunter-600/10 text-hunter-700"
                : "border-paper-400 text-ink-700 hover:bg-paper-100"
            }`}
          >
            <PencilIcon />
          </button>
          {!editing && (
            <>
              <button
                onClick={() => act("handled")}
                disabled={isPending}
                className="rounded-full border border-paper-400 px-3 py-1.5 text-xs font-medium text-ink-700 transition-transform hover:bg-paper-100 active:scale-90 disabled:opacity-50"
              >
                Handled
              </button>
              <button
                onClick={() => act("dismissed")}
                disabled={isPending}
                className="rounded-full border border-paper-400 px-3 py-1.5 text-xs font-medium text-ink-700 transition-transform hover:bg-paper-100 active:scale-90 disabled:opacity-50"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          editing ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <form action={handleSubmit} className="space-y-2 border-t border-paper-300 pt-3">
            <div className="flex flex-wrap gap-2">
              <input
                name="title"
                required
                defaultValue={item.title}
                className="min-w-[160px] flex-1 rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950 placeholder:text-ink-500"
              />
              <select
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value as ItemType)}
                className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                name="due_date"
                defaultValue={item.due_date ?? ""}
                className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
              />
              <label className="flex items-center gap-1.5 text-sm text-ink-700">
                $
                <input
                  type="number"
                  name="amount"
                  min={0}
                  step="0.01"
                  defaultValue={item.amount ?? ""}
                  placeholder="optional"
                  className="w-24 rounded-xl border border-sand-300 bg-sand-100 px-2 py-1.5 text-base text-ink-950 placeholder:text-ink-500"
                />
              </label>
              {showTimeAndAddress && (
                <>
                  <input
                    type="time"
                    name="event_time"
                    defaultValue={item.event_time ?? ""}
                    className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
                  />
                  <input
                    name="address"
                    defaultValue={item.address ?? ""}
                    placeholder="Address (optional)"
                    className="min-w-[160px] flex-1 rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950 placeholder:text-ink-500"
                  />
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-hunter-600 px-4 py-1.5 text-sm font-medium text-white transition-transform active:scale-90 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl px-4 py-1.5 text-sm font-medium text-ink-500 transition-transform active:scale-90"
              >
                Cancel
              </button>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </form>
        </div>
      </div>

      {canDraftReply(item) && (
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            draftOpen ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-2 border-t border-paper-300 pt-3">
              {isDrafting && <p className="text-xs text-ink-500">Drafting a reply…</p>}
              {draftError && <p className="text-xs text-red-500">{draftError}</p>}
              {draft && (
                <>
                  <p className="text-xs text-ink-500">
                    To {draft.to} · {draft.subject}
                  </p>
                  <textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-sm text-ink-950"
                  />
                  <div className="flex items-center gap-2">
                    <a
                      href={gmailComposeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-hunter-600 px-3 py-1.5 text-xs font-medium text-white transition-transform active:scale-90"
                    >
                      Open in Gmail
                    </a>
                    <button
                      type="button"
                      onClick={() => setDraftOpen(false)}
                      className="rounded-xl px-3 py-1.5 text-xs font-medium text-ink-500 transition-transform active:scale-90"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </li>
  );
}
