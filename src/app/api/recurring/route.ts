import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { materializeOccurrence, maybeSendReminder } from "@/lib/recurring";
import type { RecurringBill } from "@/lib/types";

/** Daily job: materializes this month's occurrence for every recurring bill and sends due reminders. */
async function runForAllUsers() {
  const admin = createAdminClient();
  const { data: bills } = await admin.from("recurring_bills").select("*");

  let processed = 0;
  for (const bill of (bills ?? []) as RecurringBill[]) {
    const { dueDate } = await materializeOccurrence(admin, bill.user_id, bill, bill.day_of_month);

    const { data: userData } = await admin.auth.admin.getUserById(bill.user_id);
    if (userData?.user?.email) {
      await maybeSendReminder(admin, bill, userData.user.email, dueDate);
    }
    processed += 1;
  }
  return processed;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const isCron = Boolean(process.env.CRON_SECRET) && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const processed = await runForAllUsers();
  return NextResponse.json({ processed });
}

// Vercel Cron sends GET requests.
export async function GET(request: NextRequest) {
  return POST(request);
}
