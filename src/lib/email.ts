import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendReminderEmail(to: string, title: string, dueDate: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping reminder email for", title);
    return;
  }

  await resend.emails.send({
    from: process.env.REMINDER_FROM_EMAIL ?? "Attention Items <onboarding@resend.dev>",
    to,
    subject: `Reminder: ${title} due ${dueDate}`,
    text: `${title} is due on ${dueDate}. Check your Attention Items dashboard for details.`,
  });
}
