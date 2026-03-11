import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const calEventId = req.nextUrl.searchParams.get("calEventId");
  if (!calEventId) return NextResponse.json({ note: null }, { status: 400 });

  const db = getDb();
  const note = db
    .prepare("SELECT * FROM meeting_notes WHERE calendar_event_id = ?")
    .get(calEventId) as { id: string; calendar_event_id: string; title: string | null; content: string; updated_at: string } | undefined;

  return NextResponse.json({ note: note ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { calEventId: string; title?: string; content: string };
  if (!body.calEventId) return NextResponse.json({ error: "calEventId required" }, { status: 400 });

  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM meeting_notes WHERE calendar_event_id = ?")
    .get(body.calEventId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE meeting_notes SET title = ?, content = ?, updated_at = datetime('now') WHERE calendar_event_id = ?"
    ).run(body.title ?? null, body.content, body.calEventId);
    return NextResponse.json({ ok: true, id: existing.id });
  } else {
    const id = randomUUID();
    db.prepare(
      "INSERT INTO meeting_notes (id, calendar_event_id, title, content) VALUES (?, ?, ?, ?)"
    ).run(id, body.calEventId, body.title ?? null, body.content);
    return NextResponse.json({ ok: true, id });
  }
}
