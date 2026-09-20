import Link from "next/link";

type TabKey = "dashboard" | "calendar" | "spending" | "goals";

function HomeIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} />
      <path d="M3 10h18" stroke={filled ? "black" : "currentColor"} strokeWidth={2} opacity={filled ? 0.85 : 1} />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function PieChartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      {filled ? (
        <path d="M12 2a10 10 0 1 0 10 10H12z" fill="currentColor" stroke="none" />
      ) : (
        <>
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" strokeLinecap="round" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

function TargetIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
      />
      <circle
        cx="12"
        cy="12"
        r="5.2"
        fill={filled ? "black" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={filled ? 0 : 2}
        opacity={filled ? 0.85 : 1}
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

const TABS: { key: TabKey; href: string; label: string; icon: (filled: boolean) => React.ReactNode }[] = [
  { key: "dashboard", href: "/dashboard", label: "Home", icon: (f) => <HomeIcon filled={f} /> },
  { key: "calendar", href: "/calendar", label: "Calendar", icon: (f) => <CalendarIcon filled={f} /> },
  { key: "spending", href: "/spending", label: "Spending", icon: (f) => <PieChartIcon filled={f} /> },
  { key: "goals", href: "/goals", label: "Goals", icon: (f) => <TargetIcon filled={f} /> },
];

export function TabBar({ active }: { active: TabKey }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 bg-ink-950/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-transform active:scale-90 ${
                isActive ? "text-hunter-400" : "text-sand-500"
              }`}
            >
              {tab.icon(isActive)}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
