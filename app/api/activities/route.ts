import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export type Activity = {
  id: string;
  type: string;
  title?: string;
  summary?: string;
  accountId?: string;
  contactId?: string;
  dealId?: string;
  projectId?: string;
  meetingId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

function rowToActivity(row: Record<string, unknown>): Activity {
  let metadata: Record<string, unknown> = {};
  try { metadata = JSON.parse((row.metadata as string) ?? "{}"); } catch {}
  return {
    id: row.id as string,
    type: row.type as string,
    ...(row.title ? { title: row.title as string } : {}),
    ...(row.summary ? { summary: row.summary as string } : {}),
    ...(row.account_id ? { accountId: row.account_id as string } : {}),
    ...(row.contact_id ? { contactId: row.contact_id as string } : {}),
    ...(row.deal_id ? { dealId: row.deal_id as string } : {}),
    ...(row.project_id ? { projectId: row.project_id as string } : {}),
    ...(row.meeting_id ? { meetingId: row.meeting_id as string } : {}),
    metadata,
    createdAt: row.created_at as string,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const dealId = searchParams.get("dealId");
  const projectId = searchParams.get("projectId");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const db = getDb();
  let sql = "SELECT * FROM activities WHERE 1=1";
  const params: unknown[] = [];
  if (accountId) { sql += " AND account_id = ?"; params.push(accountId); }
  if (dealId) { sql += " AND deal_id = ?"; params.push(dealId); }
  if (projectId) { sql += " AND project_id = ?"; params.push(projectId); }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return NextResponse.json({ activities: rows.map(rowToActivity) });
}

export async function POST(req: Request) {
  const { type, title, summary, accountId, contactId, dealId, projectId, meetingId, metadata } = await req.json();
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });
  const db = getDb();
  const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO activities (id, type, title, summary, account_id, contact_id, deal_id, project_id, meeting_id, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, type, title ?? null, summary ?? null, accountId ?? null, contactId ?? null, dealId ?? null, projectId ?? null, meetingId ?? null, JSON.stringify(metadata ?? {}));
  const activity = rowToActivity(db.prepare("SELECT * FROM activities WHERE id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ activity });
}
