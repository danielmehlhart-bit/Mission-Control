import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export type Task = {
  id: string;
  title: string;
  project: string;
  status: "todo" | "done";
  createdAt: string;
  doneAt?: string;
  notes?: string;
};

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    project: row.project as string,
    status: row.status as "todo" | "done",
    createdAt: row.created_at as string,
    ...(row.done_at ? { doneAt: row.done_at as string } : {}),
    ...(row.notes ? { notes: row.notes as string } : {}),
  };
}

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM tasks
    ORDER BY
      CASE status WHEN 'todo' THEN 0 ELSE 1 END,
      created_at DESC
  `).all() as Record<string, unknown>[];
  return NextResponse.json({ tasks: rows.map(rowToTask) });
}

export async function POST(req: Request) {
  const { title, project, notes } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const db = getDb();
  const id = Date.now().toString();
  db.prepare(`
    INSERT INTO tasks (id, title, project, status, notes, created_at)
    VALUES (?, ?, ?, 'todo', ?, datetime('now'))
  `).run(id, title.trim(), project ?? "Allgemein", notes?.trim() ?? null);
  const task = rowToTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ task });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const db = getDb();
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, project, notes, status } = await req.json();
  if (status !== undefined) {
    const doneAt = status === "done" ? "datetime('now')" : null;
    db.prepare(`UPDATE tasks SET status = ?, done_at = ${doneAt ? doneAt : "NULL"} WHERE id = ?`)
      .run(status, id);
  }
  if (title !== undefined) db.prepare("UPDATE tasks SET title = ? WHERE id = ?").run(title.trim(), id);
  if (project !== undefined) db.prepare("UPDATE tasks SET project = ? WHERE id = ?").run(project, id);
  if (notes !== undefined) db.prepare("UPDATE tasks SET notes = ? WHERE id = ?").run(notes, id);

  const task = rowToTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ task });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  getDb().prepare("DELETE FROM tasks WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
