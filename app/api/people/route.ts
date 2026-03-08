import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export type Person = {
  id: string;
  name: string;
  company: string;
  role?: string;
  email?: string;
  phone?: string;
  project?: string;
  notes?: string;
};

function rowToPerson(row: Record<string, unknown>): Person {
  return {
    id: row.id as string,
    name: row.name as string,
    company: row.company as string,
    ...(row.role ? { role: row.role as string } : {}),
    ...(row.email ? { email: row.email as string } : {}),
    ...(row.phone ? { phone: row.phone as string } : {}),
    ...(row.project ? { project: row.project as string } : {}),
    ...(row.notes ? { notes: row.notes as string } : {}),
  };
}

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM people ORDER BY name ASC").all() as Record<string, unknown>[];
  return NextResponse.json({ people: rows.map(rowToPerson) });
}

export async function POST(req: Request) {
  const { name, company, role, email, phone, project, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const db = getDb();
  const id = Date.now().toString();
  db.prepare(`
    INSERT INTO people (id, name, company, role, email, phone, project, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, name.trim(), company ?? "", role ?? null, email ?? null, phone ?? null, project ?? null, notes ?? null);
  const person = rowToPerson(db.prepare("SELECT * FROM people WHERE id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ person });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const db = getDb();
  if (!db.prepare("SELECT id FROM people WHERE id = ?").get(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { name, company, role, email, phone, project, notes } = await req.json();
  if (name !== undefined) db.prepare("UPDATE people SET name = ? WHERE id = ?").run(name.trim(), id);
  if (company !== undefined) db.prepare("UPDATE people SET company = ? WHERE id = ?").run(company, id);
  if (role !== undefined) db.prepare("UPDATE people SET role = ? WHERE id = ?").run(role, id);
  if (email !== undefined) db.prepare("UPDATE people SET email = ? WHERE id = ?").run(email, id);
  if (phone !== undefined) db.prepare("UPDATE people SET phone = ? WHERE id = ?").run(phone, id);
  if (project !== undefined) db.prepare("UPDATE people SET project = ? WHERE id = ?").run(project, id);
  if (notes !== undefined) db.prepare("UPDATE people SET notes = ? WHERE id = ?").run(notes, id);
  const person = rowToPerson(db.prepare("SELECT * FROM people WHERE id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ person });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  getDb().prepare("DELETE FROM people WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
