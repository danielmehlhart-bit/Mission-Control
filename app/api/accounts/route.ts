import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export type Account = {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  status: string;
  color: string;
  notes?: string;
  createdAt: string;
  contactCount?: number;
  dealCount?: number;
  projectCount?: number;
  lastActivityAt?: string;
  pipelineValue?: number;
};

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    name: row.name as string,
    ...(row.domain ? { domain: row.domain as string } : {}),
    ...(row.industry ? { industry: row.industry as string } : {}),
    ...(row.size ? { size: row.size as string } : {}),
    status: row.status as string,
    color: row.color as string,
    ...(row.notes ? { notes: row.notes as string } : {}),
    createdAt: row.created_at as string,
    ...(row.contact_count !== undefined ? { contactCount: row.contact_count as number } : {}),
    ...(row.deal_count !== undefined ? { dealCount: row.deal_count as number } : {}),
    ...(row.project_count !== undefined ? { projectCount: row.project_count as number } : {}),
    ...(row.last_activity_at ? { lastActivityAt: row.last_activity_at as string } : {}),
    ...(row.pipeline_value !== undefined ? { pipelineValue: row.pipeline_value as number } : {}),
  };
}

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM people WHERE account_id = a.id) as contact_count,
      (SELECT COUNT(*) FROM deals WHERE account_id = a.id) as deal_count,
      (SELECT COUNT(*) FROM projects WHERE account_id = a.id) as project_count,
      (SELECT MAX(created_at) FROM activities WHERE account_id = a.id) as last_activity_at,
      (SELECT COALESCE(SUM(value), 0) FROM deals WHERE account_id = a.id AND stage NOT IN ('closed-won', 'closed-lost')) as pipeline_value
    FROM accounts a
    ORDER BY a.name ASC
  `).all() as Record<string, unknown>[];
  return NextResponse.json({ accounts: rows.map(rowToAccount) });
}

export async function POST(req: Request) {
  const { name, domain, industry, size, status, color, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const db = getDb();
  const id = `acc_${Date.now()}`;
  const validStatus = ["prospect", "active", "churned", "paused", "Qualification", "qualification"].includes(status) ? status : "prospect";
  db.prepare(`
    INSERT INTO accounts (id, name, domain, industry, size, status, color, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, name.trim(), domain ?? null, industry ?? null, size ?? null, validStatus, color ?? "#6366f1", notes ?? null);
  const account = rowToAccount(db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ account });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const db = getDb();
  if (!db.prepare("SELECT id FROM accounts WHERE id = ?").get(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { name, domain, industry, size, status, color, notes } = await req.json();
  if (name !== undefined) db.prepare("UPDATE accounts SET name = ? WHERE id = ?").run(name.trim(), id);
  if (domain !== undefined) db.prepare("UPDATE accounts SET domain = ? WHERE id = ?").run(domain, id);
  if (industry !== undefined) db.prepare("UPDATE accounts SET industry = ? WHERE id = ?").run(industry, id);
  if (size !== undefined) db.prepare("UPDATE accounts SET size = ? WHERE id = ?").run(size, id);
  if (status !== undefined && ["prospect", "active", "churned", "paused", "Qualification", "qualification"].includes(status))
    db.prepare("UPDATE accounts SET status = ? WHERE id = ?").run(status, id);
  if (color !== undefined) db.prepare("UPDATE accounts SET color = ? WHERE id = ?").run(color, id);
  if (notes !== undefined) db.prepare("UPDATE accounts SET notes = ? WHERE id = ?").run(notes, id);
  const account = rowToAccount(db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ account });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  getDb().prepare("DELETE FROM accounts WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
