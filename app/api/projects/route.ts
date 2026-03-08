import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export type Project = {
  id: string;
  name: string;
  client: string;
  status: "active" | "paused" | "done";
  description?: string;
  contactId?: string;
  repo?: string;
  color: string;
};

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    client: row.client as string,
    status: row.status as "active" | "paused" | "done",
    ...(row.description ? { description: row.description as string } : {}),
    ...(row.contact_id ? { contactId: row.contact_id as string } : {}),
    ...(row.repo ? { repo: row.repo as string } : {}),
    color: row.color as string,
  };
}

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM projects ORDER BY created_at ASC").all() as Record<string, unknown>[];
  return NextResponse.json({ projects: rows.map(rowToProject) });
}

export async function POST(req: Request) {
  const { name, client, status, description, contactId, repo, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const db = getDb();
  const id = Date.now().toString();
  const validStatus = ["active", "paused", "done"].includes(status) ? status : "active";
  db.prepare(`
    INSERT INTO projects (id, name, client, status, description, contact_id, repo, color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, name.trim(), client ?? "", validStatus, description ?? "", contactId ?? null, repo ?? null, color ?? "#6366f1");
  const project = rowToProject(db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ project });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const db = getDb();
  if (!db.prepare("SELECT id FROM projects WHERE id = ?").get(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { name, client, status, description, contactId, repo, color } = await req.json();
  if (name !== undefined) db.prepare("UPDATE projects SET name = ? WHERE id = ?").run(name.trim(), id);
  if (client !== undefined) db.prepare("UPDATE projects SET client = ? WHERE id = ?").run(client, id);
  if (status !== undefined && ["active", "paused", "done"].includes(status))
    db.prepare("UPDATE projects SET status = ? WHERE id = ?").run(status, id);
  if (description !== undefined) db.prepare("UPDATE projects SET description = ? WHERE id = ?").run(description, id);
  if (contactId !== undefined) db.prepare("UPDATE projects SET contact_id = ? WHERE id = ?").run(contactId, id);
  if (repo !== undefined) db.prepare("UPDATE projects SET repo = ? WHERE id = ?").run(repo, id);
  if (color !== undefined) db.prepare("UPDATE projects SET color = ? WHERE id = ?").run(color, id);
  const project = rowToProject(db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ project });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  getDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
