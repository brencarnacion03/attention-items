"use client";

import { useMemo, useState } from "react";
import type { ItemType } from "@/lib/types";

export interface SpendingCategory {
  type: ItemType;
  label: string;
  color: string;
  total: number;
  items: { id: string; title: string; amount: number; due_date: string | null }[];
}

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function donutArcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  // A true 360deg slice degenerates (start === end point), so cap just short of a full turn.
  const clampedEnd = endAngle - startAngle >= 359.99 ? startAngle + 359.99 : endAngle;
  const largeArc = clampedEnd - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerR, clampedEnd);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, clampedEnd);
  return [
    "M", outerStart.x, outerStart.y,
    "A", outerR, outerR, 0, largeArc, 0, outerEnd.x, outerEnd.y,
    "L", innerStart.x, innerStart.y,
    "A", innerR, innerR, 0, largeArc, 1, innerEnd.x, innerEnd.y,
    "Z",
  ].join(" ");
}

const CX = 120;
const CY = 120;
const OUTER_R = 100;
const INNER_R = 62;

export function SpendingChart({
  categories,
  totalAmount,
  periodLabel,
}: {
  categories: SpendingCategory[];
  totalAmount: number;
  periodLabel: string;
}) {
  const [selected, setSelected] = useState<ItemType | null>(null);
  const [hovered, setHovered] = useState<ItemType | null>(null);
  const [showTable, setShowTable] = useState(false);

  const slices = useMemo(() => {
    let angle = 0;
    return categories.map((cat) => {
      const fraction = totalAmount > 0 ? cat.total / totalAmount : 0;
      const startAngle = angle;
      const endAngle = angle + fraction * 360;
      angle = endAngle;
      return { ...cat, startAngle, endAngle, fraction };
    });
  }, [categories, totalAmount]);

  const focused = selected ?? hovered;
  const focusedCategory = categories.find((c) => c.type === focused) ?? null;
  const selectedCategory = categories.find((c) => c.type === selected) ?? null;

  const toggle = (type: ItemType) => {
    setSelected((current) => (current === type ? null : type));
  };

  if (totalAmount === 0) {
    return (
      <p className="rounded-md border border-dashed border-ink-600 p-8 text-center text-sm text-sand-400">
        No spending recorded for {periodLabel}. Amounts you add to bills, renewals, and other items will
        show up here.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-center">
        <div className="relative shrink-0">
          <svg viewBox="0 0 240 240" className="h-64 w-64" role="img" aria-label={`Spending by category for ${periodLabel}`}>
            {slices.map((slice) => {
              const isFocused = focused === slice.type;
              return (
                <path
                  key={slice.type}
                  d={donutArcPath(CX, CY, OUTER_R, INNER_R, slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                  stroke="#000"
                  strokeWidth={2}
                  tabIndex={0}
                  role="button"
                  aria-label={`${slice.label}: ${formatDollars(slice.total)}, ${Math.round(slice.fraction * 100)} percent`}
                  onClick={() => toggle(slice.type)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(slice.type);
                    }
                  }}
                  onMouseEnter={() => setHovered(slice.type)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(slice.type)}
                  onBlur={() => setHovered(null)}
                  className="cursor-pointer outline-none transition-transform duration-150"
                  style={{
                    transformOrigin: `${CX}px ${CY}px`,
                    transform: isFocused ? "scale(1.035)" : "scale(1)",
                    filter: isFocused ? "brightness(1.15)" : "none",
                  }}
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-sand-400">
              {focusedCategory ? focusedCategory.label : "Total"}
            </span>
            <span className="font-display text-2xl font-semibold text-sand-50">
              {formatDollars(focusedCategory ? focusedCategory.total : totalAmount)}
            </span>
            {focusedCategory && (
              <span className="text-xs text-sand-500">
                {Math.round((focusedCategory.total / totalAmount) * 100)}% of total
              </span>
            )}
          </div>
        </div>

        <div className="w-full max-w-xs space-y-1.5">
          {slices.map((slice) => (
            <button
              key={slice.type}
              type="button"
              onClick={() => toggle(slice.type)}
              onMouseEnter={() => setHovered(slice.type)}
              onMouseLeave={() => setHovered(null)}
              className={`card-surface flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-transform active:scale-[0.97] ${
                selected === slice.type ? "border-sand-200 bg-sand-100/10" : "hover:border-ink-600"
              }`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: slice.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-sand-200">{slice.label}</span>
              <span className="shrink-0 text-sm font-medium text-sand-50">{formatDollars(slice.total)}</span>
              <span className="w-10 shrink-0 text-right text-xs text-sand-500">
                {Math.round(slice.fraction * 100)}%
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedCategory && (
        <div className="card-surface mt-6 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-sand-50">{selectedCategory.label} items</h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-full px-2 py-1 text-xs text-sand-400 underline transition-transform active:scale-90"
            >
              Clear
            </button>
          </div>
          <ul className="space-y-1.5">
            {selectedCategory.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="min-w-0 truncate text-sand-300">
                  {item.title}
                  {item.due_date ? ` · ${item.due_date}` : ""}
                </span>
                <span className="shrink-0 font-medium text-sand-50">{formatDollars(item.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="rounded-full px-3 py-1.5 text-xs text-sand-400 underline transition-transform active:scale-90"
        >
          {showTable ? "Hide table view" : "View as table"}
        </button>
      </div>

      {showTable && (
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">Spending by category for {periodLabel}</caption>
          <thead>
            <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wide text-sand-500">
              <th className="py-1.5 font-medium">Category</th>
              <th className="py-1.5 text-right font-medium">Amount</th>
              <th className="py-1.5 text-right font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <tr key={slice.type} className="border-b border-ink-800">
                <td className="py-1.5 text-sand-200">{slice.label}</td>
                <td className="py-1.5 text-right tabular-nums text-sand-50">{formatDollars(slice.total)}</td>
                <td className="py-1.5 text-right tabular-nums text-sand-400">
                  {Math.round(slice.fraction * 100)}%
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-2 font-medium text-sand-50">Total</td>
              <td className="pt-2 text-right font-medium tabular-nums text-sand-50">
                {formatDollars(totalAmount)}
              </td>
              <td className="pt-2 text-right tabular-nums text-sand-400">100%</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
