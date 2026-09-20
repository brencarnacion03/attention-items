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

export const GOAL_ICONS: { key: GoalIconKey; label: string; tile: string }[] = [
  { key: "house", label: "Buy a house", tile: "linear-gradient(180deg, #e0a05c 0%, #c17f3d 100%)" },
  { key: "car", label: "Buy a car", tile: "linear-gradient(180deg, #6db3e8 0%, #3f8fd1 100%)" },
  { key: "vacation", label: "Vacation", tile: "linear-gradient(180deg, #4fd0c4 0%, #26a99c 100%)" },
  { key: "debt", label: "Pay off debt", tile: "linear-gradient(180deg, #6ea672 0%, #4c7a52 100%)" },
  { key: "wedding", label: "Wedding", tile: "linear-gradient(180deg, #ed9bb8 0%, #d9628c 100%)" },
  { key: "education", label: "Education", tile: "linear-gradient(180deg, #a48ce0 0%, #8266c9 100%)" },
  { key: "gadget", label: "New gadget", tile: "linear-gradient(180deg, #8b93a1 0%, #6b7280 100%)" },
  { key: "emergency", label: "Emergency fund", tile: "linear-gradient(180deg, #3c6b43 0%, #2d5233 100%)" },
  { key: "other", label: "Something else", tile: "linear-gradient(180deg, #e2d5b3 0%, #c9bb95 100%)" },
];

export function goalIconTile(key: string | null): string {
  return GOAL_ICONS.find((i) => i.key === key)?.tile ?? GOAL_ICONS[GOAL_ICONS.length - 1].tile;
}

export function goalIconLabel(key: string | null): string {
  return GOAL_ICONS.find((i) => i.key === key)?.label ?? "Goal";
}

/** Hand-drawn, cute-caricature style glyphs - simple flat shapes, one per goal category. */
export function GoalIconGlyph({ goalIcon, className }: { goalIcon: string | null; className?: string }) {
  const cls = className ?? "h-9 w-9";
  switch (goalIcon) {
    case "house":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M4 20v-9l8-6 8 6v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" fill="#fff" />
          <path d="M2.5 12 12 5l9.5 7" stroke="#7a4a22" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="10" y="15" width="4" height="6" rx="0.5" fill="#c17f3d" />
          <rect x="15.2" y="4.5" width="1.6" height="3" fill="#c9bb95" />
          <circle cx="16" cy="3.2" r="1.1" fill="#e2d5b3" />
        </svg>
      );
    case "car":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M3 16v-2.5a2 2 0 0 1 1.2-1.8L6 10.8 7.6 7.4A2 2 0 0 1 9.4 6.2h5.2a2 2 0 0 1 1.8 1.2l1.6 3.4 1.8.9A2 2 0 0 1 21 13.5V16a1 1 0 0 1-1 1h-1.2a2.2 2.2 0 0 1-4.36 0H9.56A2.2 2.2 0 0 1 5.2 17H4a1 1 0 0 1-1-1z" fill="#fff" />
          <path d="M7.8 10.6 9 7.6h6l1.4 3z" fill="#3f8fd1" opacity="0.5" />
          <circle cx="7.4" cy="17" r="1.6" fill="#2c2c2a" />
          <circle cx="16.6" cy="17" r="1.6" fill="#2c2c2a" />
          <circle cx="9" cy="9.2" r="0.6" fill="#2c2c2a" />
          <circle cx="15" cy="9.2" r="0.6" fill="#2c2c2a" />
        </svg>
      );
    case "vacation":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <circle cx="17" cy="6" r="3" fill="#f6d365" />
          <path d="M12 21c0-6 2.2-11 4.5-13" stroke="#7a5230" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M16.5 8c-4-1-7 0.5-7.5 3 2.7-1 5.4-1 7.5-3z" fill="#2fa88a" />
          <path d="M16.5 8c-2 3-1 6.4 3 7-1-3-1.6-5.2-3-7z" fill="#3cc4a3" />
          <path d="M4 20c3-4 12-4 16 0" stroke="#3f8fd1" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "debt":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="3" y="6" width="18" height="13" rx="2" fill="#fff" />
          <rect x="3" y="9" width="18" height="2.4" fill="#4c7a52" />
          <rect x="5.5" y="14" width="5" height="1.8" rx="0.9" fill="#c9bb95" />
          <circle cx="17.5" cy="15" r="4" fill="#4c7a52" />
          <path d="M15.7 15 17 16.3l2.3-2.6" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "wedding":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <circle cx="9.5" cy="14" r="4.6" fill="none" stroke="#fff" strokeWidth="1.8" />
          <circle cx="14.5" cy="14" r="4.6" fill="none" stroke="#fce8ee" strokeWidth="1.8" />
          <path d="M9 6.5 10 4l1 2.5-1 1.2z" fill="#fff" />
          <circle cx="10" cy="5.2" r="0.4" fill="#d9628c" />
        </svg>
      );
    case "education":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M12 5 2 9.5 12 14l10-4.5z" fill="#fff" />
          <path d="M6 11.8v3.6c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-3.6l-6 2.7z" fill="#e6ddfa" />
          <path d="M20.5 10v5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="20.5" cy="16" r="1" fill="#fff" />
        </svg>
      );
    case "gadget":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="4" y="5.5" width="16" height="10" rx="1.2" fill="#fff" />
          <rect x="5.4" y="6.9" width="13.2" height="7.2" fill="#6b7280" />
          <path d="M2.5 18.5h19l-1.4-2.4H3.9z" fill="#e2e5ea" />
        </svg>
      );
    case "emergency":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M12 3.5 19 6v6c0 5-3.4 7.6-7 8.5-3.6-0.9-7-3.5-7-8.5V6z" fill="#74ab7e" />
          <path d="M9.2 12.4l1.9 1.9 3.7-3.9" stroke="#0f1c13" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <ellipse cx="12" cy="14" rx="8" ry="6" fill="#fff" />
          <path d="M18 12.5c1 .2 2 1 2 2s-1 1.8-2 2" fill="none" stroke="#c9bb95" strokeWidth="1.4" />
          <circle cx="8.5" cy="13" r="1" fill="#8a7c5f" />
          <rect x="10.5" y="8.5" width="3" height="2" rx="1" fill="#fff" />
          <path d="M6.5 18.5 5.3 20.5M17 18.7l1.1 1.9" stroke="#c9bb95" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
  }
}
