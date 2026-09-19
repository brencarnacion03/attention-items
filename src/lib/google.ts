import { google } from "googleapis";
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

/** Fetches upcoming events on the primary calendar as classification candidates. */
export async function fetchCalendarCandidates(accessToken: string, maxResults = 25): Promise<RawCandidate[]> {
  const calendar = google.calendar({ version: "v3", auth: authClientFor(accessToken) });

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const list = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: in30Days.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults,
  });

  const events = list.data.items ?? [];

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
