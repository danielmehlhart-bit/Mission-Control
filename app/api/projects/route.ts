import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export type Project = {
  id: string;
  name: string;
  client: string;
  status: "active" | "paused" | "done";
  stage?: string;
  opportunityValue?: string;
  description?: string;
  contactId?: string;
  repo?: string;
  color: string;
  accountId?: string;
  dealId?: string;
  accountName?: string;
};

const VALID_STAGES = ["lead", "discovery", "proposal", "solution-engineering", "rollout", "live", "closed-won", "closed-lost"];

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    client: row.client as string,
    status: row.status as "active" | "paused" | "done",
    stage: (row.stage as string) ?? "lead",
    ...(row.opportunity_value ? { opportunityValue: row.opportunity_value as string } : {}),
    ...(row.description ? { description: row.description as string } : {}),
    ...(row.contact_id ? { contactId: row.contact_id as string } : {}),
    ...(row.repo ? { repo: row.repo as string } : {}),
    color: row.color as string,
    ...(row.account_id ? { accountId: row.account_id as string } : {}),
    ...(row.deal_id ? { dealId: row.deal_id as string } : {}),
    ...(row.account_name ? { accountName: row.account_name as string } : {}),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const db = getDb();
  let sql = "SELECT p.*, a.name as account_name FROM projects p LEFT JOIN accounts a ON p.account_id = a.id";
  const params: unknown[] = [];
  if (accountId) { sql += " WHERE p.account_id = ?"; params.push(accountId); }
  sql += " ORDER BY p.created_at ASC";
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return NextResponse.json({ projects: rows.map(rowToProject) });
}

export async function POST(req: Request) {
  const { name, client, status, stage, opportunityValue, description, contactId, repo, color, accountId, dealId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const db = getDb();
  const id = Date.now().toString();
  const validStatus = ["active", "paused", "done"].includes(status) ? status : "active";
  const validStage = VALID_STAGES.includes(stage) ? stage : "lead";
  db.prepare(`
    INSERT INTO projects (id, name, client, status, stage, opportunity_value, description, contact_id, repo, color, account_id, deal_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, name.trim(), client ?? "", validStatus, validStage, opportunityValue ?? null, description ?? "", contactId ?? null, repo ?? null, color ?? "#6366f1", accountId ?? null, dealId ?? null);
  const project = rowToProject(db.prepare("SELECT p.*, a.name as account_name FROM projects p LEFT JOIN accounts a ON p.account_id = a.id WHERE p.id = ?").get(id) as Record<string, unknown>);
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
  const { name, client, status, stage, opportunityValue, description, contactId, repo, color, accountId, dealId } = await req.json();
  if (name !== undefined) db.prepare("UPDATE projects SET name = ? WHERE id = ?").run(name.trim(), id);
  if (client !== undefined) db.prepare("UPDATE projects SET client = ? WHERE id = ?").run(client, id);
  if (status !== undefined && ["active", "paused", "done"].includes(status))
    db.prepare("UPDATE projects SET status = ? WHERE id = ?").run(status, id);
  if (stage !== undefined && VALID_STAGES.includes(stage))
    db.prepare("UPDATE projects SET stage = ? WHERE id = ?").run(stage, id);
  if (opportunityValue !== undefined)
    db.prepare("UPDATE projects SET opportunity_value = ? WHERE id = ?").run(opportunityValue, id);
  if (description !== undefined) db.prepare("UPDATE projects SET description = ? WHERE id = ?").run(description, id);
  if (contactId !== undefined) db.prepare("UPDATE projects SET contact_id = ? WHERE id = ?").run(contactId, id);
  if (repo !== undefined) db.prepare("UPDATE projects SET repo = ? WHERE id = ?").run(repo, id);
  if (color !== undefined) db.prepare("UPDATE projects SET color = ? WHERE id = ?").run(color, id);
  if (accountId !== undefined) db.prepare("UPDATE projects SET account_id = ? WHERE id = ?").run(accountId, id);
  if (dealId !== undefined) db.prepare("UPDATE projects SET deal_id = ? WHERE id = ?").run(dealId, id);
  const project = rowToProject(db.prepare("SELECT p.*, a.name as account_name FROM projects p LEFT JOIN accounts a ON p.account_id = a.id WHERE p.id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ project });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  getDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
