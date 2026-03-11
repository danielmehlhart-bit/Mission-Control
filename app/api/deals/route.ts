import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export type Deal = {
  id: string;
  accountId: string;
  accountName?: string;
  accountColor?: string;
  title: string;
  value?: number;
  stage: string;
  probability: number;
  expectedClose?: string;
  notes?: string;
  createdAt: string;
  closedAt?: string;
};

const VALID_STAGES = ["lead", "qualified", "discovery", "proposal", "negotiation", "closed-won", "closed-lost"];

function rowToDeal(row: Record<string, unknown>): Deal {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    ...(row.account_name ? { accountName: row.account_name as string } : {}),
    ...(row.account_color ? { accountColor: row.account_color as string } : {}),
    title: row.title as string,
    ...(row.value != null ? { value: row.value as number } : {}),
    stage: row.stage as string,
    probability: (row.probability as number) ?? 0,
    ...(row.expected_close ? { expectedClose: row.expected_close as string } : {}),
    ...(row.notes ? { notes: row.notes as string } : {}),
    createdAt: row.created_at as string,
    ...(row.closed_at ? { closedAt: row.closed_at as string } : {}),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const stage = searchParams.get("stage");
  const db = getDb();
  let sql = `
    SELECT d.*, a.name as account_name, a.color as account_color
    FROM deals d
    LEFT JOIN accounts a ON d.account_id = a.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (accountId) { sql += " AND d.account_id = ?"; params.push(accountId); }
  if (stage) { sql += " AND d.stage = ?"; params.push(stage); }
  sql += " ORDER BY d.created_at DESC";
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return NextResponse.json({ deals: rows.map(rowToDeal) });
}

export async function POST(req: Request) {
  const { accountId, title, value, stage, probability, expectedClose, notes } = await req.json();
  if (!accountId || !title?.trim()) return NextResponse.json({ error: "accountId and title required" }, { status: 400 });
  const db = getDb();
  const id = `deal_${Date.now()}`;
  const validStage = VALID_STAGES.includes(stage) ? stage : "lead";
  db.prepare(`
    INSERT INTO deals (id, account_id, title, value, stage, probability, expected_close, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, accountId, title.trim(), value ?? null, validStage, probability ?? 0, expectedClose ?? null, notes ?? null);
  // Log activity for deal creation
  db.prepare(`
    INSERT INTO activities (id, type, title, account_id, deal_id, created_at)
    VALUES (?, 'stage-change', ?, ?, ?, datetime('now'))
  `).run(`act_${Date.now()}`, `Deal created: ${title.trim()}`, accountId, id);
  const deal = rowToDeal(db.prepare("SELECT d.*, a.name as account_name, a.color as account_color FROM deals d LEFT JOIN accounts a ON d.account_id = a.id WHERE d.id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ deal });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const db = getDb();
  const existing = db.prepare("SELECT * FROM deals WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { title, value, stage, probability, expectedClose, notes, accountId } = await req.json();
  if (title !== undefined) db.prepare("UPDATE deals SET title = ? WHERE id = ?").run(title.trim(), id);
  if (value !== undefined) db.prepare("UPDATE deals SET value = ? WHERE id = ?").run(value, id);
  if (stage !== undefined && VALID_STAGES.includes(stage)) {
    const oldStage = existing.stage as string;
    db.prepare("UPDATE deals SET stage = ? WHERE id = ?").run(stage, id);
    if (stage !== oldStage) {
      // Log stage change activity
      db.prepare(`
        INSERT INTO activities (id, type, title, summary, account_id, deal_id, created_at)
        VALUES (?, 'stage-change', ?, ?, ?, ?, datetime('now'))
      `).run(`act_${Date.now()}`, `Stage: ${oldStage} → ${stage}`, `Deal "${existing.title}" moved from ${oldStage} to ${stage}`, existing.account_id as string, id);
      if (stage === "closed-won" || stage === "closed-lost") {
        db.prepare("UPDATE deals SET closed_at = datetime('now') WHERE id = ?").run(id);
      }
    }
  }
  if (probability !== undefined) db.prepare("UPDATE deals SET probability = ? WHERE id = ?").run(probability, id);
  if (expectedClose !== undefined) db.prepare("UPDATE deals SET expected_close = ? WHERE id = ?").run(expectedClose, id);
  if (notes !== undefined) db.prepare("UPDATE deals SET notes = ? WHERE id = ?").run(notes, id);
  if (accountId !== undefined) db.prepare("UPDATE deals SET account_id = ? WHERE id = ?").run(accountId, id);
  const deal = rowToDeal(db.prepare("SELECT d.*, a.name as account_name, a.color as account_color FROM deals d LEFT JOIN accounts a ON d.account_id = a.id WHERE d.id = ?").get(id) as Record<string, unknown>);
  return NextResponse.json({ deal });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  getDb().prepare("DELETE FROM deals WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
