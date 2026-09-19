import Anthropic from "@anthropic-ai/sdk";
import type { Classification, RawCandidate } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const CLASSIFY_TOOL: Anthropic.Tool = {
  name: "classify_attention_item",
  description:
    "Record whether this email or calendar event is a personal life-admin item that needs the user's attention.",
  input_schema: {
    type: "object",
    properties: {
      is_attention_item: {
        type: "boolean",
        description:
          "True only for bills, renewals, appointments, deadlines, reservations, or expiring documents that require the user to do or remember something. False for newsletters, receipts for completed purchases, marketing, social notifications, FYI-only calendar events, etc.",
      },
      type: {
        type: "string",
        enum: ["bill", "renewal", "appointment", "deadline", "reservation", "document"],
        description: "Required when is_attention_item is true.",
      },
      title: {
        type: "string",
        description:
          "Short human-readable label for the dashboard, e.g. 'Pay Con Edison bill' or 'Dentist appointment'. Required when is_attention_item is true.",
      },
      due_date: {
        type: "string",
        description:
          "ISO date (YYYY-MM-DD) the item is due, expires, or occurs. Omit if there is no clear date.",
      },
      urgency: {
        type: "string",
        enum: ["red", "yellow", "green", "blue"],
        description:
          "red = due within 3 days or overdue. yellow = due within 2 weeks. green = due later or no fixed deadline. blue = informational / low stakes. Required when is_attention_item is true.",
      },
      auto_handleable: {
        type: "boolean",
        description:
          "True if this is the kind of item a future automation could plausibly act on directly (e.g. drafting a reply, adding a calendar hold) without the user doing original thinking. Default false.",
      },
    },
    required: ["is_attention_item"],
  },
};

const SYSTEM_PROMPT = `You triage a single Gmail message or Google Calendar event for a personal life-admin dashboard. Decide if it is something the user needs to act on or remember: a bill, a subscription/policy renewal, an appointment, a deadline, a reservation, or a document that is expiring. Ignore newsletters, marketing, social notifications, order confirmations for things already completed, and purely informational calendar invites with no action needed. Always respond by calling the classify_attention_item tool exactly once.`;

export async function classifyCandidate(candidate: RawCandidate): Promise<Classification> {
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: "tool", name: "classify_attention_item" },
    messages: [
      {
        role: "user",
        content: [
          `Source: ${candidate.source}`,
          `Date: ${candidate.contextDate ?? "unknown"}`,
          `Heading: ${candidate.heading}`,
          `Detail: ${candidate.detail.slice(0, 2000)}`,
        ].join("\n"),
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse) {
    return { isAttentionItem: false, type: null, title: null, due_date: null, urgency: null, auto_handleable: false };
  }

  const input = toolUse.input as {
    is_attention_item: boolean;
    type?: Classification["type"];
    title?: string;
    due_date?: string;
    urgency?: Classification["urgency"];
    auto_handleable?: boolean;
  };

  if (!input.is_attention_item) {
    return { isAttentionItem: false, type: null, title: null, due_date: null, urgency: null, auto_handleable: false };
  }

  return {
    isAttentionItem: true,
    type: input.type ?? "document",
    title: input.title ?? candidate.heading,
    due_date: input.due_date ?? null,
    urgency: input.urgency ?? "blue",
    auto_handleable: input.auto_handleable ?? false,
  };
}
