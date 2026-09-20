export type GoalIconKey =
  | "house"
  | "car"
  | "vacation"
  | "debt"
  | "wedding"
  | "education"
  | "gadget"
  | "emergency"
  | "other";

// Category is now told apart by the line-art shape itself, not by tile color,
// so every icon shares one soft, neutral cream tile - like a boutique logo
// mark rather than a set of colored app-icon badges.
const TILE = "linear-gradient(155deg, #f6f1e4 0%, #e2d5b3 100%)";

export const GOAL_ICONS: { key: GoalIconKey; label: string; tile: string }[] = [
  { key: "house", label: "Buy a house", tile: TILE },
  { key: "car", label: "Buy a car", tile: TILE },
  { key: "vacation", label: "Vacation", tile: TILE },
  { key: "debt", label: "Pay off debt", tile: TILE },
  { key: "wedding", label: "Wedding", tile: TILE },
  { key: "education", label: "Education", tile: TILE },
  { key: "gadget", label: "New gadget", tile: TILE },
  { key: "emergency", label: "Emergency fund", tile: TILE },
  { key: "other", label: "Something else", tile: TILE },
];

export function goalIconTile(key: string | null): string {
  return GOAL_ICONS.find((i) => i.key === key)?.tile ?? TILE;
}

export function goalIconLabel(key: string | null): string {
  return GOAL_ICONS.find((i) => i.key === key)?.label ?? "Goal";
}

const INK = "#2c2416";

/** Elegant, single continuous-line illustrations - hand-drawn ink strokes on a
 * plain tile, in the spirit of a minimalist boutique logo mark rather than a
 * colored app icon. */
export function GoalIconGlyph({
  goalIcon,
  size = 36,
}: {
  goalIcon: string | null;
  size?: number;
}) {
  const s = {
    fill: "none",
    stroke: INK,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const style = { width: size, height: size };

  switch (goalIcon) {
    case "house":
      return (
        <svg viewBox="0 0 24 24" style={style} aria-hidden="true">
          <path d="M4 20V11L12 5l8 6v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" {...s} />
          <circle cx="12" cy="15.6" r="0.5" fill={INK} stroke="none" />
        </svg>
      );
    case "car":
      return (
        <svg viewBox="0 0 24 24" style={style} aria-hidden="true">
          <path
            d="M3.5 16v-2.2a1.7 1.7 0 0 1 1-1.6L6 11l1.7-3.3A2 2 0 0 1 9.5 6.5h5a2 2 0 0 1 1.8 1.2L18 11l1.5 1.2a1.7 1.7 0 0 1 1 1.6V16"
            {...s}
          />
          <path d="M3.5 16h17" {...s} />
          <circle cx="7.5" cy="16.8" r="1.5" {...s} />
          <circle cx="16.5" cy="16.8" r="1.5" {...s} />
        </svg>
      );
    case "vacation":
      return (
        <svg viewBox="0 0 24 24" style={style} aria-hidden="true">
          <circle cx="5.3" cy="5.3" r="1.7" fill={INK} stroke="none" />
          <path d="M12.3 21c.3-4.6 1-8.2 1-10.8" {...s} />
          <path d="M13.3 10.2c-2.6-1.9-5.1-2-6.7-.2" {...s} />
          <path d="M13.3 10.2c-1.7-2.5-1.4-4.9.6-6.2" {...s} />
          <path d="M13.3 10.2c.8-2.7 2.8-4.2 5.3-3.9" {...s} />
          <path d="M13.3 10.2c2.4-.8 4.6 0 5.8 2.1" {...s} />
        </svg>
      );
    case "debt":
      return (
        <svg viewBox="0 0 24 24" style={style} aria-hidden="true">
          <rect x="3" y="6" width="18" height="12" rx="2" {...s} />
          <path d="M3 10h18" {...s} />
          <path d="M14.5 15.3l1.7 1.7 3.3-3.6" {...s} />
        </svg>
      );
    case "wedding":
      return (
        <svg viewBox="0 0 24 24" style={style} aria-hidden="true">
          <circle cx="9" cy="14.3" r="4.3" {...s} />
          <circle cx="14.7" cy="14.3" r="4.3" {...s} />
          <path d="M10.6 6.4 12 3.8l1.4 2.6-1.4 1.6z" fill={INK} stroke="none" />
        </svg>
      );
    case "education":
      return (
        <svg viewBox="0 0 24 24" style={style} aria-hidden="true">
          <path d="M12 4.6 2.3 9.3 12 14l9.7-4.7z" {...s} />
          <path d="M6.2 11.6v3.5c0 1.4 2.6 2.5 5.8 2.5s5.8-1.1 5.8-2.5v-3.5" {...s} />
          <path d="M20.7 9.7v4.9" {...s} />
          <circle cx="20.7" cy="15.3" r="0.55" fill={INK} stroke="none" />
        </svg>
      );
    case "gadget":
      return (
        <svg viewBox="0 0 24 24" style={style} aria-hidden="true">
          <rect x="4" y="5.4" width="16" height="9.6" rx="1" {...s} />
          <path d="M2 18.4h20l-1.6-2.6H3.6z" {...s} />
        </svg>
      );
    case "emergency":
      return (
        <svg viewBox="0 0 24 24" style={style} aria-hidden="true">
          <path d="M12 3.4 19 6v6c0 5-3.4 7.6-7 8.5-3.6-.9-7-3.5-7-8.5V6z" {...s} />
          <path d="M9.1 12.3l2 2 3.9-4.1" {...s} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" style={style} aria-hidden="true">
          <path
            d="M12 4c-4.7 0-8.5 3.4-8.5 7.6 0 3.9 3.5 6.7 7.4 6.4-.5-.6-.6-1.3-.1-1.8.5-.5 1.3-.3 1.9-.3 3.6 0 6.5-2.6 6.5-5.8C19.2 6.6 16 4 12 4z"
            {...s}
          />
          <circle cx="8.9" cy="10.2" r="0.7" fill={INK} stroke="none" />
          <circle cx="12.2" cy="8.4" r="0.7" fill={INK} stroke="none" />
          <circle cx="15.3" cy="10.2" r="0.7" fill={INK} stroke="none" />
          <path d="M17.5 16.2l2.4 2.8" {...s} />
        </svg>
      );
  }
}
