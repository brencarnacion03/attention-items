"use client";

import { useEffect, useState } from "react";
import { MAP_PROVIDERS, mapProviderLabel, mapsUrl, type MapProvider } from "@/lib/navigation";

const TRANSITION_MS = 220;

const TILE_BACKGROUND: Record<MapProvider, string> = {
  google: "linear-gradient(180deg, #ffffff 0%, #eef0f2 100%)",
  apple: "linear-gradient(180deg, #ffffff 0%, #e9eef5 100%)",
  waze: "linear-gradient(180deg, #4fdcff 0%, #05b3ea 100%)",
};

// Hand-built to match each brand's real colors and iconic silhouette (a Google Maps
// pin is genuinely a four-color pinwheel; Apple Maps' mark is a road map card with a
// red pin; Waze's is its light-blue "Moodie" mascot) rather than a downloaded asset -
// there's no way to embed the literal official file here, so this is the closest
// faithful caricature of each, drawn to sit inside its own app-icon-style tile.
function ProviderGlyph({ provider }: { provider: MapProvider }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 24 24" className="h-9 w-9 drop-shadow-sm" aria-hidden="true">
        <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z" fill="#EA4335" />
        <path d="M12 2v8L5.1 13.9C4.4 12 4 11 4 10c0-4.4 3.6-8 8-8z" fill="#4285F4" />
        <path d="M12 2v8l6.9 3.9c.7-1.9 1.1-2.9 1.1-3.9 0-4.4-3.6-8-8-8z" fill="#FBBC04" />
        <path d="M12 10l-6.9 3.9C6.7 17.5 12 22 12 22s5.3-4.5 6.9-8.1L12 10z" fill="#34A853" />
        <circle cx="12" cy="10" r="3.2" fill="#fff" />
      </svg>
    );
  }
  if (provider === "apple") {
    return (
      <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden="true">
        <path
          d="M3.5 16 8 7.2l3.5 5.6L14.8 8l5.7 8.4"
          stroke="#34a1f0"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <path
          d="M3.5 18.3 9 9.8l3 5.2 3.2-6 5.3 9"
          stroke="#8ab4f8"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
        <path
          d="M12 5.4c-2 0-3.6 1.6-3.6 3.6 0 2.8 3.6 7.4 3.6 7.4s3.6-4.6 3.6-7.4c0-2-1.6-3.6-3.6-3.6z"
          fill="#FF3B30"
          stroke="#fff"
          strokeWidth="0.6"
        />
        <circle cx="12" cy="9.1" r="1.2" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden="true">
      <path
        d="M12 5c-3.3 0-6 2.5-6 5.6 0 1.8 1 3.4 2.5 4.4L8 17l2.3-1a7 7 0 0 0 1.7.2c3.3 0 6-2.5 6-5.6S15.3 5 12 5z"
        fill="#fff"
      />
      <circle cx="9.8" cy="10.2" r="0.9" fill="#05b3ea" />
      <circle cx="14.2" cy="10.2" r="0.9" fill="#05b3ea" />
      <path
        d="M9.8 12.6c.6.6 1.4.9 2.2.9s1.6-.3 2.2-.9"
        stroke="#05b3ea"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AddressLink({ address }: { address: string }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const show = () => {
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };
  const hide = () => {
    setVisible(false);
    setTimeout(() => setMounted(false), TRANSITION_MS);
  };

  useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted]);

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="text-hunter-400 underline decoration-hunter-400/40 active:text-hunter-500"
      >
        {address}
      </button>

      {mounted && (
        <div className="fixed inset-0 z-50">
          <div
            onClick={hide}
            className={`absolute inset-0 bg-black/60 transition-opacity duration-[220ms] ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl border-t border-ink-700 bg-ink-950 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-[220ms] ease-out ${
              visible ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-ink-600" />

            <div className="px-4 pb-2 pt-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-sand-500">
                Get directions to
              </p>
              <p className="truncate text-sm text-sand-200">{address}</p>
            </div>

            <div className="flex justify-center gap-6 px-6 pb-2 pt-3">
              {MAP_PROVIDERS.map((provider) => (
                <a
                  key={provider}
                  href={mapsUrl(provider, address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={hide}
                  className="flex w-20 flex-col items-center gap-2 transition-transform duration-150 active:scale-90"
                >
                  <span
                    className="flex h-16 w-16 items-center justify-center rounded-[20px] ring-1 ring-black/10"
                    style={{
                      background: TILE_BACKGROUND[provider],
                      boxShadow: "0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
                    }}
                  >
                    <ProviderGlyph provider={provider} />
                  </span>
                  <span className="text-center text-xs font-medium leading-tight text-sand-200">
                    {mapProviderLabel(provider)}
                  </span>
                </a>
              ))}
            </div>

            <button
              type="button"
              onClick={hide}
              className="mx-4 mb-1 mt-3 w-[calc(100%-2rem)] rounded-xl border border-ink-600 py-3 text-base font-medium text-sand-100 transition-transform active:scale-[0.98] active:bg-ink-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
