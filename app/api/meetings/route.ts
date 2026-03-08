import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type MeetingRow = {
  id: string; project_id: string; title: string; type: string; date: string;
  duration_min: number | null; participants: string; notes: string | null;
  summary: string | null; drive_link: string | null; action_items: string;
  status: string; created_at: string;
};

function rowToMeeting(r: MeetingRow) {
  return {
    id: r.id, projectId: r.project_id, title: r.title, type: r.type,
    date: r.date, durationMin: r.duration_min,
    participants: JSON.parse(r.participants ?? "[]"),
    notes: r.notes, summary: r.summary, driveLink: r.drive_link,
    actionItems: JSON.parse(r.action_items ?? "[]"),
    status: r.status, createdAt: r.created_at,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const db = getDb();
  const rows = projectId
    ? db.prepare("SELECT * FROM meetings WHERE project_id = ? ORDER BY date DESC").all(projectId) as MeetingRow[]
    : db.prepare("SELECT * FROM meetings ORDER BY date DESC").all() as MeetingRow[];
  return NextResponse.json({ meetings: rows.map(rowToMeeting) });
}

export async function POST(req: Request) {
  const { projectId, title, type, date, durationMin, participants, notes, summary, driveLink, actionItems } = await req.json();
  if (!projectId || !title || !date) return NextResponse.json({ error: "projectId, title, date required" }, { status: 400 });
  const db = getDb();
  const id = Date.now().toString();
  db.prepare(`
    INSERT INTO meetings (id, project_id, title, type, date, duration_min, participants, notes, summary, drive_link, action_items, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', datetime('now'))
  `).run(id, projectId, title, type ?? "call", date, durationMin ?? null,
    JSON.stringify(participants ?? []), notes ?? null, summary ?? null,
    driveLink ?? null, JSON.stringify(actionItems ?? []));
  const meeting = rowToMeeting(db.prepare("SELECT * FROM meetings WHERE id = ?").get(id) as MeetingRow);
  return NextResponse.json({ meeting });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  if (!db.prepare("SELECT id FROM meetings WHERE id = ?").get(id))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { title, type, date, durationMin, participants, notes, summary, driveLink, actionItems, status } = await req.json();
  if (title !== undefined) db.prepare("UPDATE meetings SET title = ? WHERE id = ?").run(title, id);
  if (type !== undefined) db.prepare("UPDATE meetings SET type = ? WHERE id = ?").run(type, id);
  if (date !== undefined) db.prepare("UPDATE meetings SET date = ? WHERE id = ?").run(date, id);
  if (durationMin !== undefined) db.prepare("UPDATE meetings SET duration_min = ? WHERE id = ?").run(durationMin, id);
  if (participants !== undefined) db.prepare("UPDATE meetings SET participants = ? WHERE id = ?").run(JSON.stringify(participants), id);
  if (notes !== undefined) db.prepare("UPDATE meetings SET notes = ? WHERE id = ?").run(notes, id);
  if (summary !== undefined) db.prepare("UPDATE meetings SET summary = ? WHERE id = ?").run(summary, id);
  if (driveLink !== undefined) db.prepare("UPDATE meetings SET drive_link = ? WHERE id = ?").run(driveLink, id);
  if (actionItems !== undefined) db.prepare("UPDATE meetings SET action_items = ? WHERE id = ?").run(JSON.stringify(actionItems), id);
  if (status !== undefined) db.prepare("UPDATE meetings SET status = ? WHERE id = ?").run(status, id);
  const meeting = rowToMeeting(db.prepare("SELECT * FROM meetings WHERE id = ?").get(id) as MeetingRow);
  return NextResponse.json({ meeting });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  getDb().prepare("DELETE FROM meetings WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
