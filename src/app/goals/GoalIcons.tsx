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
  {
    key: "house",
    label: "Buy a house",
    tile: "radial-gradient(120% 100% at 25% 12%, rgba(255,255,255,.4), transparent 55%), linear-gradient(155deg, #f0c383 0%, #dba05a 45%, #b97a3a 100%)",
  },
  {
    key: "car",
    label: "Buy a car",
    tile: "radial-gradient(120% 100% at 25% 12%, rgba(255,255,255,.45), transparent 55%), linear-gradient(155deg, #bfe0f7 0%, #7ab8e8 50%, #4a8fd1 100%)",
  },
  {
    key: "vacation",
    label: "Vacation",
    tile: "radial-gradient(120% 100% at 25% 12%, rgba(255,255,255,.35), transparent 55%), linear-gradient(155deg, #bdeee6 0%, #5fd1c4 50%, #239e92 100%)",
  },
  {
    key: "debt",
    label: "Pay off debt",
    tile: "radial-gradient(120% 100% at 25% 12%, rgba(255,255,255,.35), transparent 55%), linear-gradient(155deg, #b9d9bd 0%, #7fb386 50%, #4c7a52 100%)",
  },
  {
    key: "wedding",
    label: "Wedding",
    tile: "radial-gradient(120% 100% at 25% 12%, rgba(255,255,255,.4), transparent 55%), linear-gradient(155deg, #fbd9e4 0%, #f2a8c0 50%, #dd6f95 100%)",
  },
  {
    key: "education",
    label: "Education",
    tile: "radial-gradient(120% 100% at 25% 12%, rgba(255,255,255,.4), transparent 55%), linear-gradient(155deg, #d9cdf5 0%, #ad93e6 50%, #8266c9 100%)",
  },
  {
    key: "gadget",
    label: "New gadget",
    tile: "radial-gradient(120% 100% at 25% 12%, rgba(255,255,255,.4), transparent 55%), linear-gradient(155deg, #d3d8e0 0%, #a2acb8 50%, #6b7280 100%)",
  },
  {
    key: "emergency",
    label: "Emergency fund",
    tile: "radial-gradient(120% 100% at 25% 12%, rgba(255,255,255,.35), transparent 55%), linear-gradient(155deg, #a9d2ae 0%, #6ea672 50%, #3c6b43 100%)",
  },
  {
    key: "other",
    label: "Something else",
    tile: "radial-gradient(120% 100% at 25% 12%, rgba(255,255,255,.4), transparent 55%), linear-gradient(155deg, #f2e8ce 0%, #e0d0a3 50%, #c9bb95 100%)",
  },
];

export function goalIconTile(key: string | null): string {
  return GOAL_ICONS.find((i) => i.key === key)?.tile ?? GOAL_ICONS[GOAL_ICONS.length - 1].tile;
}

export function goalIconLabel(key: string | null): string {
  return GOAL_ICONS.find((i) => i.key === key)?.label ?? "Goal";
}

// Real emoji rather than hand-drawn shapes: on iOS/macOS these already render
// with Apple's own glossy, dimensional icon art - closer to that look than
// anything redrawn in SVG could get.
const GOAL_ICON_EMOJI: Record<GoalIconKey, string> = {
  house: "🏡",
  car: "🚗",
  vacation: "🏖️",
  debt: "💳",
  wedding: "💍",
  education: "🎓",
  gadget: "💻",
  emergency: "🛟",
  other: "🎨",
};

export function GoalIconGlyph({
  goalIcon,
  size = 36,
}: {
  goalIcon: string | null;
  size?: number;
}) {
  const emoji = GOAL_ICON_EMOJI[goalIcon as GoalIconKey] ?? GOAL_ICON_EMOJI.other;
  return (
    <span
      role="img"
      aria-hidden="true"
      style={{ fontSize: size, lineHeight: 1, display: "inline-block" }}
    >
      {emoji}
    </span>
  );
}
