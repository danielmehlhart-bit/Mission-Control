/**
 * Google Calendar utility — token refresh + event fetching
 * Uses native fetch(), no extra npm packages.
 */

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string;       // ISO dateTime or date
  end: string;
  attendees: string[]; // email addresses
  location?: string;
  description?: string;
};

// ── Token Cache ───────────────────────────────────────────────────────────────
let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

async function refreshAccessToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiresAt) return _cachedToken;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google OAuth credentials not configured");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  _cachedToken = data.access_token;
  _tokenExpiresAt = now + (data.expires_in - 60) * 1000;
  return _cachedToken;
}

// ── Fetch Events ──────────────────────────────────────────────────────────────
export async function getUpcomingEvents(days = 30): Promise<CalendarEvent[]> {
  const token = await refreshAccessToken();
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";

  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    maxResults: "100",
    singleEvents: "true",
    orderBy: "startTime",
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Calendar API error: ${err}`);
  }

  const data = await res.json() as { items?: GoogleCalendarItem[] };
  return (data.items ?? []).map(normalizeEvent);
}

// ── Internal types ────────────────────────────────────────────────────────────
type GoogleCalendarItem = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email: string; responseStatus?: string }[];
  location?: string;
  description?: string;
};

function normalizeEvent(item: GoogleCalendarItem): CalendarEvent {
  return {
    id: item.id,
    summary: item.summary ?? "(kein Titel)",
    start: item.start?.dateTime ?? item.start?.date ?? "",
    end: item.end?.dateTime ?? item.end?.date ?? "",
    attendees: (item.attendees ?? []).map(a => a.email).filter(Boolean),
    location: item.location,
    description: item.description,
  };
}
