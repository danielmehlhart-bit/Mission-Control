import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PRIMARY = process.env.DB_PATH ?? "/data/mc.db";
const DB_FALLBACK = "/tmp/mc.db";

function resolveDbPath(): string {
  try {
    const dir = path.dirname(DB_PRIMARY);
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return DB_PRIMARY;
  } catch {
    return DB_FALLBACK;
  }
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dbPath = resolveDbPath();
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      client     TEXT NOT NULL DEFAULT '',
      status     TEXT NOT NULL DEFAULT 'active',
      description TEXT DEFAULT '',
      contact_id TEXT,
      repo       TEXT,
      color      TEXT NOT NULL DEFAULT '#6366f1',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS people (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      company    TEXT NOT NULL DEFAULT '',
      role       TEXT,
      email      TEXT,
      phone      TEXT,
      project    TEXT,
      notes      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      project    TEXT NOT NULL DEFAULT 'Allgemein',
      status     TEXT NOT NULL DEFAULT 'todo',
      notes      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      done_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS project_notes (
      project_id TEXT PRIMARY KEY,
      content    TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id            TEXT PRIMARY KEY,
      project_id    TEXT NOT NULL,
      title         TEXT NOT NULL,
      type          TEXT NOT NULL DEFAULT 'call',
      date          TEXT NOT NULL,
      duration_min  INTEGER,
      participants  TEXT NOT NULL DEFAULT '[]',
      notes         TEXT,
      summary       TEXT,
      drive_link    TEXT,
      action_items  TEXT NOT NULL DEFAULT '[]',
      status        TEXT NOT NULL DEFAULT 'planned',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Opportunity fields auf projects (migration-safe: ignoriert falls schon existiert)
  `);

  // Spalten nachträglich hinzufügen (ALTER TABLE IF NOT EXISTS column nicht in SQLite → try/catch)
  const addCol = (sql: string) => { try { db.exec(sql); } catch {} };
  addCol("ALTER TABLE projects ADD COLUMN stage TEXT NOT NULL DEFAULT 'lead'");
  addCol("ALTER TABLE projects ADD COLUMN opportunity_value TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec("SELECT 1"); // flush

  // Seed Projekte falls Tabelle leer
  const projectCount = (db.prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number }).c;
  if (projectCount === 0) {
    const insert = db.prepare(`
      INSERT INTO projects (id, name, client, status, description, repo, color)
      VALUES (@id, @name, @client, @status, @description, @repo, @color)
    `);
    const seedProjects = db.transaction(() => {
      insert.run({ id: "1", name: "ModulAI", client: "HAM Architekten", status: "active", description: "Multi-Tenant AI-Plattform für Architekturbüros", repo: "danielmehlhart-bit/modulai", color: "#8B5CF6" });
      insert.run({ id: "2", name: "Architekt Connect", client: "Weber Architekten", status: "active", description: "PM-Tool für Architekturbüros (Pilot: Weber)", repo: "danielmehlhart-bit/architekt-connect", color: "#3B82F6" });
      insert.run({ id: "3", name: "BPP CRM", client: "BPP", status: "active", description: "Internes CRM für ~300 Mitglieder", repo: "danielmehlhart-bit/photobpp-organizer", color: "#F59E0B" });
      insert.run({ id: "4", name: "Concord", client: "Intern", status: "active", description: "Persönliches Leadership OS", repo: "danielmehlhart-bit/concordv3", color: "#10B981" });
      insert.run({ id: "5", name: "Hamm-Architekten — Workflow-Modul", client: "HAM Architekten", status: "active", description: "Discovery abgeschlossen 04.03. · 8 Kern-Features · Ziel: +20% Effizienz · ~120–160h, 6–8 Wochen", repo: "", color: "#EC4899" });
      insert.run({ id: "6", name: "Mission Control", client: "Intern", status: "active", description: "Daniels persönliches Ops-Dashboard", repo: "danielmehlhart-bit/Mission-Control", color: "#06B6D4" });
      insert.run({ id: "7", name: "Raab Immobilien", client: "Raab Immobilien", status: "active", description: "Discovery-Phase — Eduard Raab Call Mo 10.03.", repo: "", color: "#F97316" });
    });
    seedProjects();
  }

  // Migration helper — läuft nur einmal pro ID
  const runMigration = (id: string, fn: () => void) => {
    const already = db.prepare("SELECT id FROM _migrations WHERE id = ?").get(id);
    if (!already) { fn(); db.prepare("INSERT INTO _migrations (id) VALUES (?)").run(id); }
  };

  // Seed Notes für Raab Immobilien (Projekt-ID 7) falls noch keine Note vorhanden
  const raabNote = db.prepare("SELECT project_id FROM project_notes WHERE project_id = '7'").get();
  if (!raabNote) {
    const raabBriefingContent = JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "🗓️ Discovery Call · Mo 10.03.2026 · 10:00 Uhr" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "italic" }], text: "Briefing: Eduard Raab (Raam Immobilien) — Discovery Playbook" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Company-Hypothese" }] },
        { type: "paragraph", content: [{ type: "text", text: "Bauträger und/oder Immobilienbestandshalter mit Fokus auf Vermietung. Wahrscheinlich kleines Team (3–8 MA). Hohe Affinität für Prozessoptimierung." }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Geschäft: Bauträger, Kauf/Sanierung/Verkauf, Eigenbestand (~100 Einheiten)" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Tech-Stack: Wahrscheinlich rudimentär (Excel, E-Mail). Offen für Tools wie EverReal/Immoware24." }] }] },
        ] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Ziele des Gesprächs" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Problem verstehen, nicht Lösung verkaufen — immer zurück zum \"Was genau ist das Problem dahinter?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Pains quantifizieren: Den Kunden SELBST rechnen lassen. Was kostet der Status Quo in Stunden, Euros, verpassten Chancen?" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Die \"EverReal-Lücke\" finden: Wo hören Standard-Tools auf und beginnt der manuelle Schmerz?" }] }] },
        ] },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Die goldene Frage: " }, { type: "text", text: "\"Klingt, als hätten Sie sich schon intensiv mit EverReal und Immoware24 beschäftigt. Nehmen wir mal an, Sie hätten beide morgen im Einsatz. Welches Problem wäre dann immer noch nicht gelöst? Wo wäre immer noch manuelle Arbeit nötig?\"" }] }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Discovery Framework (SPICED)" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Block 1: Situation" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Erzählen Sie mal, wie läuft ein Mieterwechsel bei Ihnen heute von A–Z ab?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Welche Tools/Systeme nutzen Sie dafür aktuell?\"" }] }] },
        ] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Block 2: Pain" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Was sind die größten Zeitfresser oder Nerv-Faktoren?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Wie viele Stunden pro Woche frisst [Pain Point] ungefähr?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Was kostet Sie eine Stunde Ihrer Zeit, grob? → Lass ihn auf Jahreskosten hochrechnen.\"" }] }] },
        ] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Block 3: Impact" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Was bedeutet das für Ihr Geschäft, wenn das so weitergeht?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Haben Sie schon mal versucht, das Problem zu lösen? Was ist passiert?\"" }] }] },
        ] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Block 4: Critical Event" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Was hat sich verändert, dass das Thema gerade jetzt auf dem Tisch liegt?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Was passiert, wenn Sie das in den nächsten 6 Monaten nicht lösen?\"" }] }] },
        ] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Block 5: Decision Process" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Wenn wir die perfekte Lösung hätten – wie würde der Entscheidungsprozess bei Ihnen aussehen?\"" }] }] },
        ] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Hypothetische Pains (zum Einwerfen)" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Doppelte Dateneingabe: Mieterdaten aus Selbstauskunft müssen manuell in 3 verschiedene Systeme übertragen werden." }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Kommunikations-Chaos: Bis alle Dokumente vom neuen Mieter da sind, 15 E-Mails — trotzdem fehlt die Hälfte." }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Fehlender Onboarding-Prozess: Nach Vertragsunterschrift unklar, wer dem Mieter welche Infos gibt. Jedes Mal ad-hoc." }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Leerstand durch langsame Prozesse: Zwischen Kündigung und Neuvermietung X Wochen Verlust." }] }] },
        ] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "✅ Checkliste für den Call" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Company Research erfolgt" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Hypothesen über Pains im Kopf" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Die 10 Discovery-Fragen parat" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Du redest 20%, Eduard redet 80%" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Ihn den Business Case selbst rechnen lassen" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Nach Critical Event fragen" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Decision Process klären" }] }] },
        ] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "📋 Post-Call (innerhalb 2 Stunden!)" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "SPICED Scorecard in Meeting-Notizen ausfüllen" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Follow-Up Email mit quantifiziertem Impact entwerfen" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Konkreten nächsten Termin vorschlagen" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Lead auf Mission Control aktualisieren" }] }] },
        ] },
      ],
    });
    db.prepare("INSERT OR IGNORE INTO project_notes (project_id, content, updated_at) VALUES (?, ?, datetime('now'))")
      .run("7", raabBriefingContent);
  }

  // Migration: Meeting-Prep 10.03. für Raab (überschreibt bestehende Notes einmalig)
  runMigration("raab_meeting_prep_20260310", () => {
    const meetingPrepContent = JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "📋 Discovery Call Prep — Mo 10.03.2026 · 10:00 Uhr" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "italic" }], text: "Eduard Raab · Raab Immobilien · 60 Min · SPICED Framework" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Ablauf" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "0–5 Min: " }, { type: "text", text: "Ankommen, Small Talk. \"Ich möchte verstehen wie Sie heute arbeiten — bevor ich irgendwas von uns erzähle.\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "5–20 Min: " }, { type: "text", text: "Situation — Status Quo ohne Wertung" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "20–40 Min: " }, { type: "text", text: "Pain + Impact — ihn selbst rechnen lassen (Stunden × Stundensatz × 52)" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "40–52 Min: " }, { type: "text", text: "Critical Event + Decision Process" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "52–60 Min: " }, { type: "text", text: "Zusammenfassen + konkreten nächsten Schritt vereinbaren" }] }] },
        ] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "SPICED — Fragen" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "S — Situation" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Wie läuft ein Mieterwechsel bei Ihnen heute von A–Z ab?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Welche Tools/Systeme nutzen Sie dafür?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Wie groß ist Ihr Team — wer macht was?\"" }] }] },
        ] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "P — Pain (ihn rechnen lassen!)" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Was sind die größten Zeitfresser?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Wie viele Stunden/Woche frisst [Pain Point]?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Was kostet Sie eine Stunde grob?\" → Jahreskosten gemeinsam hochrechnen" }] }] },
        ] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "I — Impact" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Was bedeutet das für Ihr Geschäft, wenn das so weitergeht?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Haben Sie schon mal versucht, das zu lösen? Was ist passiert?\"" }] }] },
        ] },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Die goldene Frage: " }, { type: "text", text: "\"Nehmen wir an, Sie hätten EverReal & Immoware24 morgen im Einsatz. Welches Problem wäre dann immer noch nicht gelöst?\"" }] }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "C — Critical Event" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Was hat sich verändert, dass das Thema jetzt auf dem Tisch liegt?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Was passiert, wenn Sie das in 6 Monaten nicht lösen?\"" }] }] },
        ] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "D — Decision Process" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Wenn wir die perfekte Lösung hätten — wie würde der Entscheidungsprozess aussehen?\"" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "\"Wer muss noch mit ins Boot?\"" }] }] },
        ] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "✅ Pre-Call Checklist" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Company Research erfolgt" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Du redest 20%, Eduard 80%" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Ihn den Business Case selbst rechnen lassen" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Nach Critical Event fragen" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Decision Process klären" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Konkreten nächsten Termin am Ende vereinbaren" }] }] },
        ] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "📋 Post-Call (innerhalb 2h!)" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "SPICED Scorecard in Meeting-Notizen ausfüllen" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Follow-Up Email mit quantifiziertem Impact" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Nächsten Termin vorschlagen (Prototyp / Proposal)" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Lead in Mission Control updaten (Stage + Opportunity Value)" }] }] },
        ] },
      ],
    });
    db.prepare("INSERT OR REPLACE INTO project_notes (project_id, content, updated_at) VALUES (?, ?, datetime('now'))")
      .run("7", meetingPrepContent);
  });

  // Seed People falls Tabelle leer
  const peopleCount = (db.prepare("SELECT COUNT(*) as c FROM people").get() as { c: number }).c;
  if (peopleCount === 0) {
    const insert = db.prepare(`
      INSERT INTO people (id, name, company, role, email, project)
      VALUES (@id, @name, @company, @role, @email, @project)
    `);
    const seedPeople = db.transaction(() => {
      insert.run({ id: "1", name: "Alex Hamm", company: "HAM Architekten", role: "Inhaber", email: "a.hamm@hammarchitekten.de", project: "HAM / ModulAI" });
      insert.run({ id: "2", name: "Stavros Gavalas", company: "HAM Architekten", role: "Mitarbeiter", email: "a.gavalas@hammarchitekten.de", project: "HAM / ModulAI" });
      insert.run({ id: "3", name: "Kim Weber", company: "Weber Architekten", role: "Projektleiterin", email: "", project: "Architekt Connect" });
      insert.run({ id: "4", name: "Paul Weber", company: "Weber Architekten", role: "Inhaber", email: "", project: "Architekt Connect" });
      insert.run({ id: "5", name: "Sebastian Weißmann", company: "BPP", role: "Geschäftsführer", email: "seba@bpp.photography", project: "BPP" });
      insert.run({ id: "6", name: "Eduard Raab", company: "Raab Immobilien", role: "Inhaber", email: "e.raab@raabimmobilien.com", project: "Raab Immobilien" });
      insert.run({ id: "7", name: "W. Specht", company: "Raab Immobilien", role: "", email: "w.specht@raabimmobilien.com", project: "Raab Immobilien" });
    });
    seedPeople();
  }
}
