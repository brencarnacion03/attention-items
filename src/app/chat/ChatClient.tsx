"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How much have I spent this month?",
  "What bills are coming up?",
  "Am I on track for my savings goals?",
  "How big should an emergency fund be?",
];

/** Renders a reply: **bold** becomes real bold, bare URLs become tappable links, heading hashes are dropped. */
function RichText({ text }: { text: string }) {
  const cleaned = text.replace(/^#{1,6}\s*/gm, "");
  return (
    <>
      {cleaned.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (/^https?:\/\//.test(part))
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all text-hunter-600 underline">
              {part}
            </a>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function ChatClient({ initialSpentUsd, capUsd }: { initialSpentUsd: number; capUsd: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spentUsd, setSpentUsd] = useState(initialSpentUsd);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const atLimit = spentUsd >= capUsd;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending || atLimit) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const body = await res.json();
      if (typeof body.spentUsd === "number") setSpentUsd(body.spentUsd);
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setMessages([...next, { role: "assistant", content: body.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-5">
      <div className="space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={atLimit}
                className="rounded-full border border-paper-400 px-3 py-1.5 text-left text-xs font-medium text-ink-700 transition-transform hover:bg-paper-100 active:scale-95 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === "user" ? "bg-hunter-600 text-white" : "card-surface text-ink-950"
              }`}
            >
              {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="card-surface rounded-2xl px-3.5 py-2.5 text-sm text-ink-500">Thinking…</div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-[4.75rem] mt-4 bg-[var(--background)] pb-2 pt-2"
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1000}
            disabled={sending || atLimit}
            placeholder={atLimit ? "Monthly limit reached" : "Ask anything…"}
            className="min-w-0 flex-1 rounded-xl border border-sand-300 bg-sand-100 px-3 py-2.5 text-base text-ink-950 placeholder:text-ink-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || atLimit || !input.trim()}
            className="rounded-xl bg-hunter-600 px-4 py-2.5 text-sm font-medium text-white transition-transform active:scale-90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-ink-500">
          ${spentUsd.toFixed(2)} of ${capUsd.toFixed(2)} used this month
        </p>
      </form>
    </div>
  );
}
