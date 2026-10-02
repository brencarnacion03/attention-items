import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MONTHLY_CAP_USD } from "@/lib/chat";
import { monthlySpend } from "@/lib/chatUsage";
import { TabBar } from "@/components/TabBar";
import { ChatClient } from "./ChatClient";

export default async function ChatPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const spent = await monthlySpend(user.id).catch(() => 0);

  return (
    <main className="mx-auto max-w-2xl p-4 pb-28 sm:p-8 sm:pb-28">
      <h1 className="font-display text-2xl font-semibold text-ink-950">Ask</h1>
      <p className="mt-1 text-sm text-ink-500">
        Questions about your bills, spending and goals, or anything you&apos;d look up online. General info, not
        financial advice.
      </p>

      <ChatClient initialSpentUsd={spent} capUsd={MONTHLY_CAP_USD} />

      <TabBar active="chat" />
    </main>
  );
}
