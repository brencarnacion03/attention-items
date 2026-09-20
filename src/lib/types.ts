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

export type IncomeFrequency = "weekly" | "biweekly";

export interface RecurringIncome {
  id: string;
  user_id: string;
  title: string | null;
  amount: number;
  frequency: IncomeFrequency;
  start_date: string;
  created_at: string;
}

/** A single income entry as shown on the calendar - either a manually-added
 * one-time entry, or one occurrence of a recurring paycheck projected onto
 * the current month. */
export interface IncomeDisplayEntry {
  id: string;
  title: string | null;
  amount: number;
  date: string;
  recurring: boolean;
  /** id of the row to delete: an income_entries.id, or a recurring_income.id for a recurring entry (removes the whole series). */
  removeId: string;
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

export interface GoalContribution {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  contributed_at: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  cover_image_url: string | null;
  cover_icon: string | null;
  created_at: string;
}
