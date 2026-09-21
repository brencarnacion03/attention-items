import { google, type calendar_v3, type gmail_v1 } from "googleapis";
import type { RawCandidate } from "./types";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

/** Exchanges a stored Google refresh token for a short-lived access token. */
export async function getAccessToken(refreshToken: string): Promise<string> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Google did not return an access token for this refresh token.");
  }
  return credentials.access_token;
}

function authClientFor(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

function headerValue(headers: { name?: string | null; value?: string | null }[] | undefined, name: string) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Fetches recent inbox messages (excluding promotions/social) as classification candidates. */
export async function fetchGmailCandidates(accessToken: string, maxResults = 25): Promise<RawCandidate[]> {
  const gmail = google.gmail({ version: "v1", auth: authClientFor(accessToken) });

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "newer_than:14d -category:promotions -category:social -in:chats",
  });

  const messages = list.data.messages ?? [];

  const candidates = await Promise.all(
    messages.map(async (m) => {
      if (!m.id) return null;
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: m.id,
        format: "metadata",
        metadataHeaders: ["Subject", "Date", "From"],
      });

      const headers = msg.data.payload?.headers ?? [];
      const subject = headerValue(headers, "Subject") || "(no subject)";
      const from = headerValue(headers, "From");
      const dateHeader = headerValue(headers, "Date");

      const candidate: RawCandidate = {
        source: "gmail",
        source_id: m.id,
        heading: subject,
        detail: `From: ${from}\n${msg.data.snippet ?? ""}`,
        contextDate: dateHeader ? new Date(dateHeader).toISOString() : null,
      };
      return candidate;
    })
  );

  return candidates.filter((c): c is RawCandidate => c !== null);
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

/** Walks a (possibly multipart) Gmail message body looking for a part of the given mime type. */
function findPart(part: gmail_v1.Schema$MessagePart | undefined, mimeType: string): string | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) return decodeBase64Url(part.body.data);
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

export interface GmailMessageDetail {
  subject: string;
  from: string;
  body: string;
}

/** Fetches one message's full body (for drafting a reply) - the classification
 * pass only ever reads the snippet, so this is a separate, on-demand fetch. */
export async function fetchGmailMessageDetail(accessToken: string, messageId: string): Promise<GmailMessageDetail> {
  const gmail = google.gmail({ version: "v1", auth: authClientFor(accessToken) });
  const msg = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });

  const headers = msg.data.payload?.headers ?? [];
  const subject = headerValue(headers, "Subject") || "(no subject)";
  const from = headerValue(headers, "From");

  const plainText = findPart(msg.data.payload, "text/plain");
  const html = plainText ? null : findPart(msg.data.payload, "text/html");
  const body = plainText ?? (html ? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : msg.data.snippet ?? "");

  return { subject, from, body: body.slice(0, 6000) };
}

/** Fetches upcoming events on the primary calendar as classification candidates.
 * Pages through results (Google caps each page at 100) so events further down
 * the list, or later in the window, aren't silently dropped. */
export async function fetchCalendarCandidates(accessToken: string, maxTotal = 100): Promise<RawCandidate[]> {
  const calendar = google.calendar({ version: "v3", auth: authClientFor(accessToken) });

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;

  do {
    const list = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: in90Days.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: Math.min(100, maxTotal - events.length),
      pageToken,
    });
    events.push(...(list.data.items ?? []));
    pageToken = list.data.nextPageToken ?? undefined;
  } while (pageToken && events.length < maxTotal);

  return events
    .filter((e) => e.id && e.status !== "cancelled")
    .map((e) => {
      const start = e.start?.dateTime ?? e.start?.date ?? null;
      const candidate: RawCandidate = {
        source: "calendar",
        source_id: e.id!,
        heading: e.summary || "(no title)",
        detail: [e.description, e.location].filter(Boolean).join("\n"),
        contextDate: start ? new Date(start).toISOString() : null,
      };
      return candidate;
    });
}
