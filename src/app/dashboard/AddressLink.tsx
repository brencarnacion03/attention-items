"use client";

import { useEffect, useState } from "react";
import { MAP_PROVIDERS, mapProviderLabel, mapsUrl, type MapProvider } from "@/lib/navigation";

const TRANSITION_MS = 220;

// Hand-built to match each brand's real colors and iconic silhouette (a Google Maps
// pin is genuinely a four-color pinwheel; Apple Maps' mark is a road map card with a
// red pin; Waze's is its light-blue "Moodie" mascot) rather than a downloaded asset -
// there's no way to embed the literal official file here, so this is the closest
// faithful approximation of each.
function ProviderIcon({ provider }: { provider: MapProvider }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden="true">
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
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#fff" stroke="#e5e5e5" />
        <path
          d="M4 15.5 8.5 7l3.5 5.5L15 8l5 8"
          stroke="#8ab4f8"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 6c-1.7 0-3 1.3-3 3 0 2.3 3 6.2 3 6.2s3-3.9 3-6.2c0-1.7-1.3-3-3-3z"
          fill="#FF3B30"
        />
        <circle cx="12" cy="9.1" r="1.1" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#05C8F7" />
      <path
        d="M12 5c-3.3 0-6 2.5-6 5.6 0 1.8 1 3.4 2.5 4.4L8 17l2.3-1a7 7 0 0 0 1.7.2c3.3 0 6-2.5 6-5.6S15.3 5 12 5z"
        fill="#fff"
      />
      <circle cx="9.8" cy="10.2" r="0.9" fill="#05C8F7" />
      <circle cx="14.2" cy="10.2" r="0.9" fill="#05C8F7" />
      <path
        d="M9.8 12.6c.6.6 1.4.9 2.2.9s1.6-.3 2.2-.9"
        stroke="#05C8F7"
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
        className="text-blue-600 underline decoration-blue-600/40 active:text-blue-700"
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
            className={`absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl border-t border-neutral-800 bg-neutral-950 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-[220ms] ease-out ${
              visible ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-neutral-700" />

            <div className="px-4 pb-1 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Get directions to
              </p>
              <p className="truncate text-sm text-neutral-300">{address}</p>
            </div>

            <div className="mt-2 divide-y divide-neutral-800 border-t border-neutral-800">
              {MAP_PROVIDERS.map((provider) => (
                <a
                  key={provider}
                  href={mapsUrl(provider, address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={hide}
                  className="flex items-center gap-3 px-4 py-3.5 text-base text-white transition-colors active:bg-white/10"
                >
                  <ProviderIcon provider={provider} />
                  {mapProviderLabel(provider)}
                </a>
              ))}
            </div>

            <button
              type="button"
              onClick={hide}
              className="mx-4 mb-1 mt-2 w-[calc(100%-2rem)] rounded-xl border border-neutral-700 py-3 text-base font-medium text-white active:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
