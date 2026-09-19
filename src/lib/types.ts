export type ItemSource = "gmail" | "calendar";
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
