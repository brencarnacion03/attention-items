export type ItemSource = "gmail" | "calendar" | "manual";
export type ItemType =
  | "bill"
  | "renewal"
  | "appointment"
  | "deadline"
  | "reservation"
  | "document";
export type Urgency = "red" | "yellow" | "green" | "blue";
export type ItemStatus = "new" | "handled" | "dismissed";

export interface AttentionItem {
  id: string;
  user_id: string;
  source: ItemSource;
  source_id: string;
  type: ItemType;
  title: string;
  due_date: string | null;
  amount: number | null;
  event_time: string | null;
  address: string | null;
  urgency: Urgency;
  status: ItemStatus;
  auto_handleable: boolean;
  created_at: string;
}

export interface RawCandidate {
  source: ItemSource;
  source_id: string;
  /** Subject line (Gmail) or event summary (Calendar). */
  heading: string;
  /** Snippet/body preview (Gmail) or description/location (Calendar). */
  detail: string;
  /** ISO date the email was received or the event occurs/starts. */
  contextDate: string | null;
}

export interface Classification {
  isAttentionItem: boolean;
  type: ItemType | null;
  title: string | null;
  due_date: string | null;
  urgency: Urgency | null;
  auto_handleable: boolean;
}

export interface IncomeEntry {
  id: string;
  user_id: string;
  title: string | null;
  amount: number;
  received_date: string;
  created_at: string;
}

export interface RecurringBill {
  id: string;
  user_id: string;
  title: string;
  type: ItemType;
  day_of_month: number;
  amount: number | null;
  event_time: string | null;
  address: string | null;
  email_reminder: boolean;
  reminder_days_before: number;
  last_reminded_for: string | null;
  created_at: string;
}
