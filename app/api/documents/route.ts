import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export type Document = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function rowToDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM documents ORDER BY updated_at DESC").all() as Record<string, unknown>[];
  return NextResponse.json({ documents: rows.map(rowToDocument) });
}

export async function POST(req: Request) {
  const { title, content } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const db = getDb();
  const id = Date.now().toString();
  db.prepare(`
    INSERT INTO documents (id, title, content, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, title.trim(), content ?? "{}");
  const doc = rowToDocument(db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ document: doc });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const db = getDb();
  const existing = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, content } = await req.json();
  if (title !== undefined) db.prepare("UPDATE documents SET title = ?, updated_at = datetime('now') WHERE id = ?").run(title.trim(), id);
  if (content !== undefined) db.prepare("UPDATE documents SET content = ?, updated_at = datetime('now') WHERE id = ?").run(content, id);

  const doc = rowToDocument(db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ document: doc });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  getDb().prepare("DELETE FROM documents WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
