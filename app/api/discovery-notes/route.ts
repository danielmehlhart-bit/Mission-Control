import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const FIELDS = [
  "title", "call_date", "contact_id", "status",
  "kontext_buerotyp", "kontext_team", "kontext_projektarten", "kontext_ablaeufe",
  "pain_1", "pain_2", "pain_3",
  "konkreter_fall_ausloeser", "konkreter_fall_beteiligte", "konkreter_fall_ablauf",
  "konkreter_fall_reibung", "konkreter_fall_folge",
  "auswirkung_haeufigkeit", "auswirkung_zeitaufwand", "auswirkung_betroffene", "auswirkung_folge",
  "workarounds_tools", "workarounds_loesungen", "workarounds_warum_unzureichend",
  "prioritaet_hoechste", "prioritaet_warum_jetzt",
  "anforderungen_must_have", "anforderungen_no_go", "anforderungen_nutzer",
  "naechster_schritt", "offene_fragen", "hypothese_produkt",
  "score_pain_identifiziert", "score_konkreter_fall", "score_impact_quantifiziert",
  "score_prioritaet", "score_nicht_gepitcht", "score_naechster_schritt",
] as const;

const camelToSnake: Record<string, string> = {
  callDate: "call_date", contactId: "contact_id",
  kontextBuerotyp: "kontext_buerotyp", kontextTeam: "kontext_team",
  kontextProjektarten: "kontext_projektarten", kontextAblaeufe: "kontext_ablaeufe",
  pain1: "pain_1", pain2: "pain_2", pain3: "pain_3",
  konkreterFallAusloeser: "konkreter_fall_ausloeser", konkreterFallBeteiligte: "konkreter_fall_beteiligte",
  konkreterFallAblauf: "konkreter_fall_ablauf", konkreterFallReibung: "konkreter_fall_reibung",
  konkreterFallFolge: "konkreter_fall_folge",
  auswirkungHaeufigkeit: "auswirkung_haeufigkeit", auswirkungZeitaufwand: "auswirkung_zeitaufwand",
  auswirkungBetroffene: "auswirkung_betroffene", auswirkungFolge: "auswirkung_folge",
  workaroundsTools: "workarounds_tools", workaroundsLoesungen: "workarounds_loesungen",
  workaroundsWarumUnzureichend: "workarounds_warum_unzureichend",
  prioritaetHoechste: "prioritaet_hoechste", prioritaetWarumJetzt: "prioritaet_warum_jetzt",
  anforderungenMustHave: "anforderungen_must_have", anforderungenNoGo: "anforderungen_no_go",
  anforderungenNutzer: "anforderungen_nutzer",
  naechsterSchritt: "naechster_schritt", offeneFragen: "offene_fragen",
  hypotheseProdukt: "hypothese_produkt",
  scorePainIdentifiziert: "score_pain_identifiziert", scoreKonkreterFall: "score_konkreter_fall",
  scoreImpactQuantifiziert: "score_impact_quantifiziert", scorePrioritaet: "score_prioritaet",
  scoreNichtGepitcht: "score_nicht_gepitcht", scoreNaechsterSchritt: "score_naechster_schritt",
};

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function rowToNote(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const id = searchParams.get("id");
  const db = getDb();

  if (id) {
    const row = db.prepare("SELECT * FROM discovery_notes WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return NextResponse.json({ discoveryNote: row ? rowToNote(row) : null });
  }

  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
  const rows = db.prepare("SELECT * FROM discovery_notes WHERE account_id = ? ORDER BY created_at DESC").all(accountId) as Record<string, unknown>[];
  return NextResponse.json({ discoveryNotes: rows.map(rowToNote) });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
  const db = getDb();
  const id = `dn_${Date.now()}`;
  db.prepare(`
    INSERT INTO discovery_notes (id, account_id, title, call_date, contact_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, body.accountId, body.title || "Discovery Call", body.callDate || null, body.contactId || null);
  const row = db.prepare("SELECT * FROM discovery_notes WHERE id = ?").get(id) as Record<string, unknown>;
  return NextResponse.json({ discoveryNote: rowToNote(row) });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  const db = getDb();

  const sets: string[] = ["updated_at = datetime('now')"];
  const vals: unknown[] = [];

  for (const [key, value] of Object.entries(body)) {
    const col = camelToSnake[key] || key;
    if (FIELDS.includes(col as typeof FIELDS[number])) {
      sets.push(`${col} = ?`);
      vals.push(value ?? null);
    }
  }

  vals.push(id);
  db.prepare(`UPDATE discovery_notes SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  db.prepare("DELETE FROM discovery_notes WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
