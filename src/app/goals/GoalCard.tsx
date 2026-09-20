"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addMoneyToGoal,
  deleteContribution,
  deleteGoal,
  setGoalCoverIcon,
  setGoalCoverPhoto,
} from "./actions";
import { GOAL_ICONS, GoalIconGlyph, goalIconTile } from "./GoalIcons";
import type { GoalContribution, SavingsGoal } from "@/lib/types";

const DELETE_WIDTH = 84;
const SWIPE_OPEN_THRESHOLD = DELETE_WIDTH * 0.55;
const SHEET_TRANSITION_MS = 220;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(dateISO: string): string {
  return new Date(dateISO + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateISO + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** A wave-filled progress indicator with milestone ticks at 25/50/75%, instead of a flat bar. */
function LiquidProgressBar({ pct, reached }: { pct: number; reached: boolean }) {
  const fillColor = reached ? "#74ab7e" : "#3c6b43";
  return (
    <div className="relative h-4 w-full overflow-hidden rounded-full bg-white">
      {[25, 50, 75].map((m) => (
        <div key={m} className="absolute inset-y-0 z-10 w-px bg-black/15" style={{ left: `${m}%` }} />
      ))}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ width: `${pct}%` }}
      >
        <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="absolute inset-0 h-full w-[200%] animate-wave-scroll">
          <path
            d="M0 22 C 12.5 12, 37.5 32, 50 22 S 87.5 12, 100 22 S 137.5 32, 150 22 S 187.5 12, 200 22 L200 40 L0 40 Z"
            fill={fillColor}
          />
        </svg>
      </div>
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Bottom sheet for picking a cute preset icon or uploading a real photo as a goal's cover. */
function CoverPicker({
  onPickIcon,
  onUploadFile,
  onClose,
}: {
  onPickIcon: (key: string) => void;
  onUploadFile: (file: File) => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, SHEET_TRANSITION_MS);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-[220ms] ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-ink-700 bg-ink-950 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-[220ms] ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-ink-600" />

        <div className="px-5 pb-1 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sand-500">Choose a cover</p>
        </div>

        <div className="grid grid-cols-3 gap-3 px-5 pt-3">
          {GOAL_ICONS.map((icon) => (
            <button
              key={icon.key}
              type="button"
              onClick={() => {
                onPickIcon(icon.key);
                close();
              }}
              className="flex flex-col items-center gap-1.5 transition-transform duration-150 active:scale-90"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-[18px] ring-1 ring-black/10"
                style={{ background: icon.tile, boxShadow: "0 3px 8px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.35)" }}
              >
                <GoalIconGlyph goalIcon={icon.key} size={30} />
              </span>
              <span className="text-center text-[11px] leading-tight text-sand-300">{icon.label}</span>
            </button>
          ))}
        </div>

        <div className="px-5 pt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="absolute h-px w-px overflow-hidden opacity-0"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFile(file);
              close();
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border border-ink-600 py-3 text-sm font-medium text-sand-200 transition-transform active:scale-[0.98]"
          >
            Upload a photo instead
          </button>
          <button
            type="button"
            onClick={close}
            className="mt-2 w-full rounded-xl py-3 text-sm font-medium text-sand-400 transition-transform active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function GoalCard({ goal, contributions }: { goal: SavingsGoal; contributions: GoalContribution[] }) {
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointerId = useRef<number | null>(null);
  const startX = useRef(0);
  const startDragX = useRef(0);

  const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
  const reached = goal.current_amount >= goal.target_amount;
  const remaining = daysUntil(goal.target_date ?? "");
  const hasHistory = contributions.length > 0;
  const hasCover = Boolean(goal.cover_image_url || goal.cover_icon);

  const clampDrag = (x: number) => Math.min(0, Math.max(-DELETE_WIDTH - 16, x));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPending) return;
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    startDragX.current = dragX;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    setDragX(clampDrag(startDragX.current + (e.clientX - startX.current)));
  };

  const endDrag = () => {
    if (pointerId.current === null) return;
    pointerId.current = null;
    setDragging(false);
    setDragX((x) => (x < -SWIPE_OPEN_THRESHOLD ? -DELETE_WIDTH : 0));
  };

  const submitAdd = () => {
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await addMoneyToGoal(goal.id, value);
        setAmount("");
        setAdding(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add money.");
      }
    });
  };

  const handlePickIcon = (key: string) => {
    setCoverError(null);
    startTransition(() => setGoalCoverIcon(goal.id, key));
  };

  const handleUploadFile = (file: File) => {
    // iOS Safari often reports an empty MIME type for photos picked from the
    // camera roll (notably HEIC) - only reject when a type IS reported and
    // it's clearly not an image, so those still go through.
    if (file.type && !file.type.startsWith("image/")) {
      setCoverError("Choose an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setCoverError("Image must be under 10MB.");
      return;
    }
    setCoverError(null);
    setUploadingCover(true);
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in.");

        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${goal.id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("goal-covers")
          .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage.from("goal-covers").getPublicUrl(path);
        await setGoalCoverPhoto(goal.id, pub.publicUrl);
      } catch (err) {
        setCoverError(err instanceof Error ? err.message : "Could not upload photo.");
      } finally {
        setUploadingCover(false);
      }
    })();
  };

  return (
    <li
      className={`overflow-hidden rounded-2xl border shadow-sm transition-colors ${
        reached ? "animate-goal-glow border-hunter-400/70" : "border-ink-700"
      }`}
    >
      <div className="relative">
        <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: DELETE_WIDTH }}>
          <button
            type="button"
            onClick={() => startTransition(() => deleteGoal(goal.id))}
            disabled={isPending}
            className="flex flex-1 items-center justify-center bg-red-600 text-sm font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
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
          className={`relative select-none ${dragging ? "" : "transition-transform duration-200 ease-out"}`}
        >
          {hasCover ? (
            <div className="relative h-32 w-full overflow-hidden bg-ink-800">
              {goal.cover_image_url ? (
                <img src={goal.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <div className="absolute inset-0" style={{ background: goalIconTile(goal.cover_icon) }} />
                  <div className="absolute inset-x-0 top-3 flex justify-center drop-shadow-sm">
                    <GoalIconGlyph goalIcon={goal.cover_icon} size={52} />
                  </div>
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute inset-x-3 bottom-2">
                <div className="flex items-center gap-2">
                  <p className="truncate text-lg font-bold text-sand-50">{goal.title}</p>
                  {reached && (
                    <span className="shrink-0 rounded-full bg-hunter-400/20 px-2 py-0.5 text-[10px] font-semibold text-hunter-400">
                      🎉 Reached
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-sand-100/90">
                  {formatDollars(goal.current_amount)} of {formatDollars(goal.target_amount)}
                  {goal.target_date && <> · {remaining >= 0 ? `${remaining}d left` : "past due"}</>}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--background)] px-4 pb-2 pt-4">
              <div className="flex items-center gap-2">
                <p className="truncate text-lg font-bold text-sand-100">{goal.title}</p>
                {reached && (
                  <span className="shrink-0 rounded-full bg-hunter-400/15 px-2 py-0.5 text-[10px] font-semibold text-hunter-400">
                    🎉 Reached
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-sand-400">
                {formatDollars(goal.current_amount)} of {formatDollars(goal.target_amount)}
                {goal.target_date && <> · {remaining >= 0 ? `${remaining}d left` : "past due"}</>}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={() => hasHistory && setHistoryOpen((v) => !v)}
          className={`block w-full ${hasHistory ? "cursor-pointer active:scale-[0.99]" : "cursor-default"} transition-transform`}
        >
          <LiquidProgressBar pct={pct} reached={reached} />
          <p className="mt-1 text-right text-xs text-sand-500">{Math.round(pct)}%</p>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="rounded-full border border-ink-600 px-3 py-1.5 text-xs font-medium text-sand-200 transition-transform active:scale-90"
          >
            {adding ? "Cancel" : "+ Add money"}
          </button>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={uploadingCover}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-sand-400 transition-transform active:scale-90 disabled:opacity-50"
          >
            {uploadingCover ? "Uploading..." : hasCover ? "Change cover" : "+ Cover"}
          </button>

          {hasHistory && (
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-sand-400 transition-transform active:scale-90"
            >
              History ({contributions.length})
              <ChevronIcon expanded={historyOpen} />
            </button>
          )}
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            adding ? "grid-rows-[1fr] mt-3" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                step="0.01"
                autoFocus={adding}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="$ amount"
                className="w-28 rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
              />
              <button
                type="button"
                onClick={submitAdd}
                disabled={isPending}
                className="rounded-xl bg-hunter-600 px-3 py-1.5 text-sm font-medium text-sand-50 transition-transform active:scale-90 disabled:opacity-50"
              >
                {isPending ? "Adding..." : "Save"}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {coverError && <p className="mt-1 text-xs text-red-500">{coverError}</p>}

        {hasHistory && (
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              historyOpen ? "grid-rows-[1fr] mt-3" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <ul className="max-h-48 space-y-1 overflow-y-auto overscroll-contain border-t border-ink-800 pr-0.5 pt-2">
                {contributions.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-xs">
                    <span className="text-sand-400">{formatDate(c.contributed_at)}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-sand-200">{formatDollars(c.amount)}</span>
                      <button
                        type="button"
                        onClick={() => startTransition(() => deleteContribution(c.id))}
                        disabled={isPending}
                        className="rounded-full px-1.5 py-0.5 text-sand-500/70 underline transition-transform active:scale-90 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {pickerOpen && (
        <CoverPicker
          onPickIcon={handlePickIcon}
          onUploadFile={handleUploadFile}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </li>
  );
}
