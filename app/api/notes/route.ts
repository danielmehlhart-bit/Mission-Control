import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const db = getDb();
  const row = db.prepare("SELECT content, updated_at FROM project_notes WHERE project_id = ?").get(projectId) as { content: string; updated_at: string } | undefined;
  return NextResponse.json({ content: row?.content ?? null, updatedAt: row?.updated_at ?? null });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const { content } = await req.json();
  const db = getDb();
  db.prepare(`
    INSERT INTO project_notes (project_id, content, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(project_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
  `).run(projectId, content);
  return NextResponse.json({ ok: true });
}
