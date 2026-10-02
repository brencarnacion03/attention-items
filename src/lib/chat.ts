import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { incomeOccurrencesInRange } from "./recurringIncome";
import type { RecurringIncome } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const CHAT_MODEL = "claude-haiku-4-5-20251001";

// Haiku 4.5 list prices (USD per token) and web search (USD per search).
const INPUT_USD_PER_TOKEN = 1 / 1_000_000;
const OUTPUT_USD_PER_TOKEN = 5 / 1_000_000;
const SEARCH_USD = 0.01;

export const MONTHLY_CAP_USD = Number(process.env.CHAT_MONTHLY_CAP_USD) > 0 ? Number(process.env.CHAT_MONTHLY_CAP_USD) : 3;

const MAX_TOKENS = 1024;
const MAX_TOOL_ROUNDS = 6;
const MAX_SEARCHES = 3;
const MAX_HISTORY = 10;
const MAX_MESSAGE_CHARS = 2000;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
  searches: number;
}

export function costOf(u: ChatUsage): number {
  return u.inputTokens * INPUT_USD_PER_TOKEN + u.outputTokens * OUTPUT_USD_PER_TOKEN + u.searches * SEARCH_USD;
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const DATA_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_items",
    description:
      "List the user's attention items (bills, renewals, appointments, deadlines, reservations, documents), optionally filtered. Returns title, type, due_date, amount, status, urgency, source. Dismissed items are excluded unless status is 'dismissed'.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["new", "handled", "dismissed"], description: "Filter to one status." },
        type: { type: "string", enum: ["bill", "renewal", "appointment", "deadline", "reservation", "document"] },
        from: { type: "string", description: "Earliest due date, YYYY-MM-DD." },
        to: { type: "string", description: "Latest due date, YYYY-MM-DD." },
        limit: { type: "number", description: "Max rows (default 60, max 100)." },
      },
    },
  },
  {
    name: "get_spending",
    description:
      "Spending for a date range: total, a breakdown by category (bill, renewal, ...), and the individual items that have an amount. Mirrors the app's Spending tab. Defaults to the current month.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Range start, YYYY-MM-DD." },
        to: { type: "string", description: "Range end, YYYY-MM-DD." },
      },
    },
  },
  {
    name: "get_income",
    description:
      "Income for a date range: one-time entries plus every occurrence of recurring paychecks, with a total. Defaults to the current month.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Range start, YYYY-MM-DD." },
        to: { type: "string", description: "Range end, YYYY-MM-DD." },
      },
    },
  },
  {
    name: "get_recurring_bills",
    description: "The user's recurring monthly bills (title, type, day of month, amount).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_goals",
    description: "The user's savings goals with target, saved so far, target date, and recent contributions.",
    input_schema: { type: "object", properties: {} },
  },
];

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const m = currentMonthKey(now);
  return { from: `${m}-01`, to: `${m}-${String(last).padStart(2, "0")}` };
}

function rangeFrom(input: Record<string, unknown>): { from: string; to: string } {
  const def = monthRange();
  const from = typeof input.from === "string" && ISO_DATE.test(input.from) ? input.from : def.from;
  const to = typeof input.to === "string" && ISO_DATE.test(input.to) ? input.to : def.to;
  return { from, to };
}

/** Runs one of the read-only data tools. The client is the signed-in user's, so RLS scopes every query to them. */
async function runDataTool(supabase: SupabaseClient, name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_items": {
      let q = supabase
        .from("attention_items")
        .select("title,type,due_date,amount,status,urgency,source")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(Math.min(100, Math.max(1, Number(input.limit) || 60)));
      if (typeof input.status === "string") q = q.eq("status", input.status);
      else q = q.neq("status", "dismissed");
      if (typeof input.type === "string") q = q.eq("type", input.type);
      if (typeof input.from === "string" && ISO_DATE.test(input.from)) q = q.gte("due_date", input.from);
      if (typeof input.to === "string" && ISO_DATE.test(input.to)) q = q.lte("due_date", input.to);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { count: data.length, items: data };
    }
    case "get_spending": {
      const { from, to } = rangeFrom(input);
      const { data, error } = await supabase
        .from("attention_items")
        .select("title,type,due_date,amount,status")
        .gte("due_date", from)
        .lte("due_date", to)
        .not("amount", "is", null)
        .order("due_date", { ascending: true })
        .limit(200);
      if (error) return { error: error.message };
      const byCategory: Record<string, number> = {};
      let total = 0;
      for (const row of data) {
        byCategory[row.type] = Math.round(((byCategory[row.type] ?? 0) + row.amount) * 100) / 100;
        total += row.amount;
      }
      return { from, to, total: Math.round(total * 100) / 100, byCategory, items: data.slice(0, 60) };
    }
    case "get_income": {
      const { from, to } = rangeFrom(input);
      const { data: entries } = await supabase
        .from("income_entries")
        .select("title,amount,received_date")
        .gte("received_date", from)
        .lte("received_date", to);
      const { data: rules } = await supabase.from("recurring_income").select("*");
      const rows: { title: string | null; amount: number; date: string; recurring: boolean }[] = (entries ?? []).map(
        (e) => ({ title: e.title, amount: e.amount, date: e.received_date, recurring: false })
      );
      for (const rule of (rules ?? []) as RecurringIncome[]) {
        for (const date of incomeOccurrencesInRange(rule.start_date, rule.frequency, from, to)) {
          rows.push({ title: rule.title, amount: rule.amount, date, recurring: true });
        }
      }
      rows.sort((a, b) => a.date.localeCompare(b.date));
      const total = rows.reduce((s, r) => s + r.amount, 0);
      return { from, to, total: Math.round(total * 100) / 100, entries: rows.slice(0, 60) };
    }
    case "get_recurring_bills": {
      const { data, error } = await supabase
        .from("recurring_bills")
        .select("title,type,day_of_month,amount")
        .order("day_of_month", { ascending: true });
      return error ? { error: error.message } : { bills: data };
    }
    case "get_goals": {
      const { data: goals, error } = await supabase
        .from("savings_goals")
        .select("id,title,target_amount,current_amount,target_date")
        .order("created_at", { ascending: true });
      if (error) return { error: error.message };
      const { data: contribs } = await supabase
        .from("goal_contributions")
        .select("goal_id,amount,contributed_at")
        .order("contributed_at", { ascending: false })
        .limit(100);
      return {
        goals: (goals ?? []).map((g) => ({
          title: g.title,
          target_amount: g.target_amount,
          current_amount: g.current_amount,
          target_date: g.target_date,
          recent_contributions: (contribs ?? [])
            .filter((c) => c.goal_id === g.id)
            .slice(0, 5)
            .map((c) => ({ amount: c.amount, date: c.contributed_at })),
        })),
      };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

function systemPrompt(): string {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return `You are the assistant inside "Attention Items", a personal life-admin app that tracks the user's bills, renewals, appointments, calendar, spending, income and savings goals. Today is ${today}.

- For anything about the user's own money, bills, schedule or goals, call the data tools - never guess or invent their numbers. If a tool returns nothing, say so plainly.
- For general or current questions (rates, definitions, how things work, news), use web search and mention the source name or link.
- You give general financial information and help the user understand their own numbers. You are not a licensed financial advisor: don't recommend specific investments or products, and suggest a professional for big decisions like taxes, loans or investing.
- Be concise and friendly. Write in plain text with short paragraphs and simple "-" lists. Do not use markdown symbols like ** or #. Format money like $1,234.50.`;
}

export interface ChatResult {
  reply: string;
  usage: ChatUsage;
}

/** Runs one user turn: Claude may call the data tools and web search several times before answering. */
export async function runChat(supabase: SupabaseClient, history: ChatMessage[]): Promise<ChatResult> {
  const trimmed = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
  // The conversation must open with a user turn.
  while (trimmed.length && trimmed[0].role !== "user") trimmed.shift();
  if (!trimmed.length || trimmed[trimmed.length - 1].role !== "user") throw new Error("Send a message first.");

  const messages: Anthropic.MessageParam[] = trimmed;
  const usage: ChatUsage = { inputTokens: 0, outputTokens: 0, searches: 0 };
  let useSearch = true;

  const buildTools = (): Anthropic.ToolUnion[] =>
    useSearch
      ? [...DATA_TOOLS, { type: "web_search_20250305", name: "web_search", max_uses: MAX_SEARCHES }]
      : DATA_TOOLS;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let resp: Anthropic.Message;
    try {
      resp = await client.messages.create({
        model: CHAT_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt(),
        tools: buildTools(),
        messages,
      });
    } catch (err) {
      // If the org hasn't enabled web search, keep working with just the data tools.
      if (useSearch && err instanceof Anthropic.APIError && /web.?search/i.test(err.message)) {
        useSearch = false;
        round--;
        continue;
      }
      throw err;
    }

    usage.inputTokens += resp.usage.input_tokens;
    usage.outputTokens += resp.usage.output_tokens;
    usage.searches += resp.usage.server_tool_use?.web_search_requests ?? 0;

    if (resp.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: resp.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of resp.content) {
        if (block.type !== "tool_use") continue;
        const out = await runDataTool(supabase, block.name, (block.input ?? {}) as Record<string, unknown>);
        results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out) });
      }
      messages.push({ role: "user", content: results });
      continue;
    }

    if (resp.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: resp.content });
      continue;
    }

    const reply = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return { reply: reply || "Sorry, I couldn't put together an answer. Try rephrasing?", usage };
  }

  return { reply: "That took more steps than I allow in one go - try a more specific question.", usage };
}
