import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONTHLY_CAP_USD, costOf, currentMonthKey, runChat, type ChatMessage } from "@/lib/chat";
import { monthlySpend } from "@/lib/chatUsage";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let messages: ChatMessage[];
  try {
    const body = await request.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let spent: number;
  try {
    spent = await monthlySpend(user.id);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Chat is unavailable right now." }, { status: 503 });
  }
  if (spent >= MONTHLY_CAP_USD) {
    return NextResponse.json(
      {
        error: `You've reached this month's chat limit ($${MONTHLY_CAP_USD.toFixed(2)}). It resets on the 1st.`,
        spentUsd: spent,
        capUsd: MONTHLY_CAP_USD,
      },
      { status: 429 }
    );
  }

  try {
    const { reply, usage } = await runChat(supabase, messages);
    const cost = costOf(usage);

    const admin = createAdminClient();
    const month = currentMonthKey();
    const { data: row } = await admin
      .from("chat_usage")
      .select("input_tokens,output_tokens,searches,cost_usd")
      .eq("user_id", user.id)
      .eq("month", month)
      .maybeSingle();
    const { error: saveError } = await admin.from("chat_usage").upsert({
      user_id: user.id,
      month,
      input_tokens: Number(row?.input_tokens ?? 0) + usage.inputTokens,
      output_tokens: Number(row?.output_tokens ?? 0) + usage.outputTokens,
      searches: Number(row?.searches ?? 0) + usage.searches,
      cost_usd: Number(row?.cost_usd ?? 0) + cost,
    });

    if (saveError) console.error("chat usage not saved:", saveError.message);

    return NextResponse.json({ reply, spentUsd: spent + cost, capUsd: MONTHLY_CAP_USD });
  } catch (err) {
    console.error("chat failed:", err);
    return NextResponse.json({ error: "Something went wrong answering that. Please try again." }, { status: 500 });
  }
}
