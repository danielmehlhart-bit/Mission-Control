import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const FIELDS = [
  "title", "call_date", "contact_id", "status",
  // 1. Kontext
  "kontext_buerotyp", "kontext_team", "kontext_projektarten", "kontext_ablaeufe",
  // 2. Pain Landscape
  "pain_kernpain", "pain_woran_zeigt_sich", "pain_weitere_signale", "pain_einordnung",
  // (legacy pain_1/2/3 still accepted)
  "pain_1", "pain_2", "pain_3",
  // 3. Konkreter Fall
  "konkreter_fall_ausloeser", "konkreter_fall_beteiligte", "konkreter_fall_ablauf",
  "konkreter_fall_reibung", "konkreter_fall_doppelt", "konkreter_fall_folge",
  "konkreter_fall_soll_ablauf",
  // 4. Impact
  "auswirkung_haeufigkeit", "auswirkung_zeitaufwand", "auswirkung_betroffene",
  "auswirkung_folge", "auswirkung_warum_jetzt", "auswirkung_dringlichkeit", "auswirkung_schmerzstaerke",
  // 5. Workarounds
  "workarounds_tools", "workarounds_loesungen", "workarounds_ausprobiert",
  "workarounds_warum_nicht", "workarounds_kein_standard",
  // (legacy)
  "workarounds_warum_unzureichend",
  // 6. Priorisierung
  "prioritaet_hoechste", "prioritaet_warum_jetzt", "prioritaet_nice_to_have", "prioritaet_testbar_14_tage",
  // 7. Testbare Hypothese
  "hypothese_problem", "hypothese_minimal", "hypothese_no_go", "hypothese_wer_nutzt", "hypothese_workflow",
  // (legacy)
  "anforderungen_must_have", "anforderungen_no_go", "anforderungen_nutzer",
  "hypothese_produkt",
  // 8. Test Readiness
  "test_bereitschaft", "test_beispiel", "test_unterlagen", "test_erfolgskriterium", "test_naechster_schritt",
  // (legacy)
  "naechster_schritt", "offene_fragen",
  // 9. Scorecard
  "score_pain_identifiziert", "score_konkreter_fall", "score_impact_quantifiziert",
  "score_root_cause", "score_prioritaet", "score_nicht_gepitcht",
  "score_testfall", "score_naechster_schritt",
] as const;

const camelToSnake: Record<string, string> = {
  callDate: "call_date", contactId: "contact_id",
  // 1. Kontext
  kontextBuerotyp: "kontext_buerotyp", kontextTeam: "kontext_team",
  kontextProjektarten: "kontext_projektarten", kontextAblaeufe: "kontext_ablaeufe",
  // 2. Pain Landscape
  painKernpain: "pain_kernpain", painWoranZeigtSich: "pain_woran_zeigt_sich",
  painWeitereSignale: "pain_weitere_signale", painEinordnung: "pain_einordnung",
  // 3. Konkreter Fall
  konkreterFallAusloeser: "konkreter_fall_ausloeser", konkreterFallBeteiligte: "konkreter_fall_beteiligte",
  konkreterFallAblauf: "konkreter_fall_ablauf", konkreterFallReibung: "konkreter_fall_reibung",
  konkreterFallDoppelt: "konkreter_fall_doppelt", konkreterFallFolge: "konkreter_fall_folge",
  konkreterFallSollAblauf: "konkreter_fall_soll_ablauf",
  // 4. Impact
  auswirkungHaeufigkeit: "auswirkung_haeufigkeit", auswirkungZeitaufwand: "auswirkung_zeitaufwand",
  auswirkungBetroffene: "auswirkung_betroffene", auswirkungFolge: "auswirkung_folge",
  auswirkungWarumJetzt: "auswirkung_warum_jetzt",
  auswirkungDringlichkeit: "auswirkung_dringlichkeit", auswirkungSchmerzstaerke: "auswirkung_schmerzstaerke",
  // 5. Workarounds
  workaroundsTools: "workarounds_tools", workaroundsLoesungen: "workarounds_loesungen",
  workaroundsAusprobiert: "workarounds_ausprobiert", workaroundsWarumNicht: "workarounds_warum_nicht",
  workaroundsKeinStandard: "workarounds_kein_standard",
  // 6. Priorisierung
  prioritaetHoechste: "prioritaet_hoechste", prioritaetWarumJetzt: "prioritaet_warum_jetzt",
  prioritaetNiceToHave: "prioritaet_nice_to_have", prioritaetTestbar14Tage: "prioritaet_testbar_14_tage",
  // 7. Testbare Hypothese
  hypotheseProblem: "hypothese_problem", hypotheseMinimal: "hypothese_minimal",
  hypotheseNoGo: "hypothese_no_go", hypotheseWerNutzt: "hypothese_wer_nutzt",
  hypotheseWorkflow: "hypothese_workflow",
  // 8. Test Readiness
  testBereitschaft: "test_bereitschaft", testBeispiel: "test_beispiel",
  testUnterlagen: "test_unterlagen", testErfolgskriterium: "test_erfolgskriterium",
  testNaechsterSchritt: "test_naechster_schritt",
  // 9. Scorecard
  scorePainIdentifiziert: "score_pain_identifiziert", scoreKonkreterFall: "score_konkreter_fall",
  scoreImpactQuantifiziert: "score_impact_quantifiziert", scoreRootCause: "score_root_cause",
  scorePrioritaet: "score_prioritaet", scoreNichtGepitcht: "score_nicht_gepitcht",
  scoreTestfall: "score_testfall", scoreNaechsterSchritt: "score_naechster_schritt",
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
