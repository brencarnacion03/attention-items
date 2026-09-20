"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Sync failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={syncing}
        className="rounded-full border border-ink-600 px-3 py-1.5 text-sm font-medium text-sand-200 transition-transform hover:bg-ink-800 active:scale-90 disabled:opacity-50"
      >
        {syncing ? "Syncing..." : "Sync now"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
