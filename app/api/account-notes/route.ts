import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

  try {
    const db = getDb();
    const row = db.prepare("SELECT content, updated_at FROM account_notes WHERE account_id = ?").get(accountId) as
      | { content: string; updated_at: string }
      | undefined;
    return NextResponse.json({ content: row?.content ?? null, updatedAt: row?.updated_at ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { accountId, content } = await request.json();
    if (!accountId || content === undefined) {
      return NextResponse.json({ error: "accountId and content required" }, { status: 400 });
    }
    const db = getDb();
    db.prepare(`
      INSERT INTO account_notes (account_id, content, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(account_id) DO UPDATE SET content = excluded.content, updated_at = datetime('now')
    `).run(accountId, typeof content === "string" ? content : JSON.stringify(content));

    const row = db.prepare("SELECT content, updated_at FROM account_notes WHERE account_id = ?").get(accountId) as
      | { content: string; updated_at: string }
      | undefined;
    return NextResponse.json({ content: row?.content ?? null, updatedAt: row?.updated_at ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
