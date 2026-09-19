"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_PROVIDERS, mapProviderLabel, mapsUrl, type MapProvider } from "@/lib/navigation";

const PROVIDER_ICON_BG: Record<MapProvider, string> = {
  google: "bg-[#4285F4]",
  apple: "bg-neutral-700",
  waze: "bg-[#33CCFF]",
};

// A generic pin glyph (Google's Material Icons "location_on", Apache-2.0) tinted per
// provider - a literal brand logo would be a trademark minefield for three different
// companies, this keeps each option visually distinct and instantly recognizable as
// "a map pin" without pretending to be any single brand's actual mark.
function ProviderIcon({ provider }: { provider: MapProvider }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${PROVIDER_ICON_BG[provider]}`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
      </svg>
    </span>
  );
}

export function AddressLink({ address }: { address: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-blue-600 underline decoration-blue-600/40 hover:text-blue-500"
      >
        {address}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950 py-2 shadow-2xl">
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Get directions with
          </p>
          {MAP_PROVIDERS.map((provider) => (
            <a
              key={provider}
              href={mapsUrl(provider, address)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              <ProviderIcon provider={provider} />
              {mapProviderLabel(provider)}
            </a>
          ))}
        </div>
      )}
    </span>
  );
}
