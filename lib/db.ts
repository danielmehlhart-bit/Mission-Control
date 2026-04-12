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

    CREATE TABLE IF NOT EXISTS accounts (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      domain     TEXT,
      industry   TEXT,
      size       TEXT,
      status     TEXT NOT NULL DEFAULT 'prospect',
      color      TEXT NOT NULL DEFAULT '#6366f1',
      notes      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deals (
      id               TEXT PRIMARY KEY,
      account_id       TEXT NOT NULL,
      title            TEXT NOT NULL,
      value            INTEGER,
      stage            TEXT NOT NULL DEFAULT 'lead',
      probability      INTEGER DEFAULT 0,
      expected_close   TEXT,
      notes            TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at        TEXT
    );

    CREATE TABLE IF NOT EXISTS activities (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL,
      title      TEXT,
      summary    TEXT,
      account_id TEXT,
      contact_id TEXT,
      deal_id    TEXT,
      project_id TEXT,
      meeting_id TEXT,
      metadata   TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Spalten nachträglich hinzufügen (ALTER TABLE IF NOT EXISTS column nicht in SQLite → try/catch)
  const addCol = (sql: string) => { try { db.exec(sql); } catch {} };
  addCol("ALTER TABLE projects ADD COLUMN stage TEXT NOT NULL DEFAULT 'lead'");
  addCol("ALTER TABLE projects ADD COLUMN opportunity_value TEXT");
  addCol("ALTER TABLE projects ADD COLUMN account_id TEXT");
  addCol("ALTER TABLE projects ADD COLUMN deal_id TEXT");
  addCol("ALTER TABLE people ADD COLUMN account_id TEXT");
  addCol("ALTER TABLE people ADD COLUMN contact_role TEXT DEFAULT 'contact'");
  addCol("ALTER TABLE meetings ADD COLUMN account_id TEXT");
  addCol("ALTER TABLE meetings ADD COLUMN deal_id TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS meeting_notes (
      id               TEXT PRIMARY KEY,
      calendar_event_id TEXT NOT NULL UNIQUE,
      title            TEXT,
      content          TEXT NOT NULL DEFAULT '{}',
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

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
      insert.run({ id: "7", name: "Waldemar Specht", company: "Raab Immobilien", role: "Geschäftspartner / Operations", email: "w.specht@raabimmobilien.com", project: "Raab Immobilien" });
    });
    seedPeople();
  }

  // Migration: Create accounts from existing projects and link data
  runMigration("create_accounts_from_projects", () => {
    // Collect unique clients from projects
    const projects = db.prepare("SELECT id, name, client, color, stage, opportunity_value FROM projects").all() as {
      id: string; name: string; client: string; color: string; stage: string; opportunity_value: string | null;
    }[];
    const clientMap = new Map<string, { id: string; color: string }>();
    for (const p of projects) {
      const clientKey = p.client.trim();
      if (!clientKey || clientMap.has(clientKey)) continue;
      const accountId = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const status = clientKey === "Intern" ? "active" : "prospect";
      db.prepare("INSERT INTO accounts (id, name, status, color) VALUES (?, ?, ?, ?)").run(accountId, clientKey, status, p.color);
      clientMap.set(clientKey, { id: accountId, color: p.color });
    }
    // Link projects to accounts
    for (const p of projects) {
      const acc = clientMap.get(p.client.trim());
      if (acc) {
        db.prepare("UPDATE projects SET account_id = ? WHERE id = ?").run(acc.id, p.id);
      }
    }
    // Link people to accounts by company name
    const people = db.prepare("SELECT id, company FROM people").all() as { id: string; company: string }[];
    for (const person of people) {
      const acc = clientMap.get(person.company.trim());
      if (acc) {
        db.prepare("UPDATE people SET account_id = ? WHERE id = ?").run(acc.id, person.id);
      }
    }
    // Create deals from projects that have a non-default stage
    for (const p of projects) {
      if (p.client === "Intern") continue;
      const acc = clientMap.get(p.client.trim());
      if (!acc) continue;
      const dealId = `deal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const value = p.opportunity_value ? parseInt(p.opportunity_value) : null;
      // Map old project stages to deal stages
      const stageMap: Record<string, string> = {
        lead: "lead", discovery: "discovery", proposal: "proposal",
        "solution-engineering": "proposal", rollout: "negotiation",
        live: "closed-won", "closed-won": "closed-won", "closed-lost": "closed-lost",
      };
      const dealStage = stageMap[p.stage] ?? "lead";
      db.prepare("INSERT INTO deals (id, account_id, title, value, stage, probability, notes) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(dealId, acc.id, p.name, value, dealStage, dealStage === "closed-won" ? 100 : dealStage === "closed-lost" ? 0 : 50, p.name);
      db.prepare("UPDATE projects SET deal_id = ? WHERE id = ?").run(dealId, p.id);
    }
    // Link meetings to accounts via their project
    const meetings = db.prepare("SELECT id, project_id FROM meetings").all() as { id: string; project_id: string }[];
    for (const m of meetings) {
      const proj = projects.find(p => p.id === m.project_id);
      if (proj) {
        const acc = clientMap.get(proj.client.trim());
        if (acc) {
          db.prepare("UPDATE meetings SET account_id = ? WHERE id = ?").run(acc.id, m.id);
        }
      }
    }
  });

  // Migration: modulAI + Weber Tasks 11.03.2026
  runMigration("modulai_weber_tasks_20260311", () => {
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, title, project, status, notes, created_at)
      VALUES (?, ?, ?, 'todo', ?, datetime('now'))
    `);
    insertTask.run(Date.now().toString() + "a", "modulAI UX: Aufgaben-Zuweisung als Picklist — Rechtsklick-Verwirrung beheben", "modulAI", null);
    insertTask.run((Date.now() + 1).toString() + "b", "modulAI Bug: Phasen können nicht editiert werden", "modulAI", null);
    insertTask.run((Date.now() + 2).toString() + "c", "modulAI Feature: Analyse & Zeiterfassung verknüpfen für Deckungskostenermittlung", "modulAI", null);
    insertTask.run((Date.now() + 3).toString() + "d", "Weber: Datei-Anhänge im Review-Loop ermöglichen", "Architekt Connect", null);
  });

  // Migration: Raab Tasks nach Discovery Call 10.03.2026
  runMigration("raab_tasks_post_discovery_20260310", () => {
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, title, project, status, notes, created_at)
      VALUES (?, ?, 'Raab Immobilien', 'todo', ?, datetime('now'))
    `);
    insertTask.run(Date.now().toString() + "1", "Demo-Zugang modulAI einrichten — Immobilien-Dummy-Daten für Eduard + Waldemar", "Priorität: SOFORT. Momentum nicht verlieren. Wohnungen, Mieterwechsel, Schadensmeldungen als Dummy-Daten.");
    insertTask.run((Date.now() + 1).toString() + "2", "Call-Summary an Eduard Raab + Waldemar Specht senden", "Priorität: Diese Woche. Zusammenfassung aus Discovery Call 10.03.2026 — Briefing liegt unter mc.mehlhart.de/briefings.");
    insertTask.run((Date.now() + 2).toString() + "3", "Solution Design Sprint terminieren — 2×2h vor Ort, Angebot 1.500€ ausarbeiten", "Ergebnis des Sprints: Fundierte Analyse + Mockup-Designs → gehören dann Eduard + Waldemar.");
  });

  // Migration: Discovery Notes table for structured call prep
  runMigration("create_discovery_notes_table", () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS discovery_notes (
        id              TEXT PRIMARY KEY,
        account_id      TEXT NOT NULL,
        title           TEXT NOT NULL DEFAULT '',
        call_date       TEXT,
        contact_id      TEXT,
        status          TEXT NOT NULL DEFAULT 'draft',

        kontext_buerotyp     TEXT DEFAULT '',
        kontext_team         TEXT DEFAULT '',
        kontext_projektarten TEXT DEFAULT '',
        kontext_ablaeufe     TEXT DEFAULT '',

        pain_1  TEXT DEFAULT '',
        pain_2  TEXT DEFAULT '',
        pain_3  TEXT DEFAULT '',

        konkreter_fall_ausloeser   TEXT DEFAULT '',
        konkreter_fall_beteiligte  TEXT DEFAULT '',
        konkreter_fall_ablauf      TEXT DEFAULT '',
        konkreter_fall_reibung     TEXT DEFAULT '',
        konkreter_fall_folge       TEXT DEFAULT '',

        auswirkung_haeufigkeit TEXT DEFAULT '',
        auswirkung_zeitaufwand TEXT DEFAULT '',
        auswirkung_betroffene  TEXT DEFAULT '',
        auswirkung_folge       TEXT DEFAULT '',

        workarounds_tools     TEXT DEFAULT '',
        workarounds_loesungen TEXT DEFAULT '',
        workarounds_warum_unzureichend TEXT DEFAULT '',

        prioritaet_hoechste    TEXT DEFAULT '',
        prioritaet_warum_jetzt TEXT DEFAULT '',

        anforderungen_must_have TEXT DEFAULT '',
        anforderungen_no_go     TEXT DEFAULT '',
        anforderungen_nutzer    TEXT DEFAULT '',

        naechster_schritt TEXT DEFAULT '',
        offene_fragen     TEXT DEFAULT '',
        hypothese_produkt TEXT DEFAULT '',

        score_pain_identifiziert   INTEGER,
        score_konkreter_fall       INTEGER,
        score_impact_quantifiziert INTEGER,
        score_prioritaet           INTEGER,
        score_nicht_gepitcht       INTEGER,
        score_naechster_schritt    INTEGER,

        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  });

  // Migration: Align discovery_notes with HTML template (pre gtm discovery.html)
  runMigration("align_discovery_html_template", () => {
    const add = (sql: string) => { try { db.exec(sql); } catch {} };
    // Sektion 2: Pain Landscape (neue Struktur)
    add("ALTER TABLE discovery_notes ADD COLUMN pain_kernpain TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN pain_woran_zeigt_sich TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN pain_weitere_signale TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN pain_einordnung TEXT DEFAULT ''");
    // Sektion 3: Konkreter Fall (+2)
    add("ALTER TABLE discovery_notes ADD COLUMN konkreter_fall_doppelt TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN konkreter_fall_soll_ablauf TEXT DEFAULT ''");
    // Sektion 4: Impact (+3)
    add("ALTER TABLE discovery_notes ADD COLUMN auswirkung_warum_jetzt TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN auswirkung_dringlichkeit INTEGER");
    add("ALTER TABLE discovery_notes ADD COLUMN auswirkung_schmerzstaerke INTEGER");
    // Sektion 5: Workarounds (+3)
    add("ALTER TABLE discovery_notes ADD COLUMN workarounds_ausprobiert TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN workarounds_warum_nicht TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN workarounds_kein_standard TEXT DEFAULT ''");
    // Sektion 6: Priorisierung (+2)
    add("ALTER TABLE discovery_notes ADD COLUMN prioritaet_nice_to_have TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN prioritaet_testbar_14_tage TEXT DEFAULT ''");
    // Sektion 7: Testbare Hypothese (5 neue Felder)
    add("ALTER TABLE discovery_notes ADD COLUMN hypothese_problem TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN hypothese_minimal TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN hypothese_no_go TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN hypothese_wer_nutzt TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN hypothese_workflow TEXT DEFAULT ''");
    // Sektion 8: Test Readiness (5 neue Felder)
    add("ALTER TABLE discovery_notes ADD COLUMN test_bereitschaft TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN test_beispiel TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN test_unterlagen TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN test_erfolgskriterium TEXT DEFAULT ''");
    add("ALTER TABLE discovery_notes ADD COLUMN test_naechster_schritt TEXT DEFAULT ''");
    // Scorecard +2
    add("ALTER TABLE discovery_notes ADD COLUMN score_root_cause INTEGER");
    add("ALTER TABLE discovery_notes ADD COLUMN score_testfall INTEGER");
  });

  // Migration: ModulAI Task — Evaluierung Feature Talk to your Data (11.03.2026)
  runMigration("modulai_talk_to_data_eval_20260311", () => {
    db.prepare(`
      INSERT INTO tasks (id, title, project, status, notes, created_at)
      VALUES (?, ?, 'ModulAI', 'todo', ?, datetime('now'))
    `).run(
      Date.now().toString() + "_ttd",
      "Evaluierung Feature: Talk to your Data",
      "Welche Daten sollen ansprechbar sein? RAG vs. structured query? Machbarkeit + Aufwand einschätzen."
    );
  });

  // Migration: Raab Kontakte mit Discovery-Call-Infos anreichern (10.03.2026)
  runMigration("raab_contacts_enrich_20260310", () => {
    db.prepare(`UPDATE people SET
      name = 'Eduard Raab',
      role = 'Inhaber / Geschäftsführer',
      notes = 'Projektentwickler, ~50 MA, 10 Gesellschaften in Holding. Strategischer Denker. Entscheidet allein. Traum: "Kündigung eintragen → alles läuft automatisch bis Schlüsselübergabe." Will SAP in gut und schön. Kontaktiert via Alex Hamm (Architekt). Discovery Call 10.03.2026 — sehr qualifizierter Lead. Nächster Schritt: Demo-Zugang modulAI + Solution Design Sprint 1.500€.'
      WHERE id = '6'`).run();
    db.prepare(`UPDATE people SET
      name = 'Waldemar Specht',
      role = 'Geschäftspartner / Operations & Prozessoptimierung',
      notes = 'Wirtschaftsingenieur + Kaufmann. Begleitet Eduard seit seinem ersten Hausbau — kennt das Unternehmen von Grund auf. Hat den Vermietungsprozess mit aufgebaut. Verantwortlich für alle internen Prozesse: Posteingang, Schadensprozess, Mitarbeiterplanung. Operativer Kopf neben Eduard. Identifiziert sich stark mit Effizienz & Nachhaltung — sein wichtigstes Wort. Sitzt aktuell neben Eduard im gleichen Büro. Hat im Call direkt 3 neue Mitarbeiter als Live-Beispiel für das Chaos beim Steuerbüro genannt. Key Quote: "Viel besser wäre, wenn wir irgendjemanden fragen könnten, wie bei ChatGPT — drückst du Enter und es kommt eine Antwort." Discovery Call 10.03.2026.'
      WHERE id = '7'`).run();
    // Projekt: Stage auf "discovery" updaten, Opportunity Value setzen
    db.prepare(`UPDATE projects SET
      description = 'Discovery abgeschlossen 10.03.2026 · 50 MA, 10 Gesellschaften · Prio 1: E-Mail-Triage + Task-Management · Prio 2: Kündigung→Neuvermietung-Automatisierung · Pain: 20h/Woche = ~20.800€/Jahr · Nächster Schritt: Demo-Zugang + Solution Design Sprint (1.500€)',
      stage = 'discovery',
      opportunity_value = '1500'
      WHERE id = '7'`).run();
    // Post-Call Projekt-Notes: Discovery-Ergebnisse
    const postCallNotes = JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "✅ Discovery Call Ergebnisse — 10.03.2026" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "italic" }], text: "Eduard Raab + Waldemar Specht · Ca. 60 Min · Sehr qualifizierter Lead" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Company Snapshot" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Firma: " }, { type: "text", text: "Raab Immobilien — Projektentwickler Bestandsimmobilien" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Größe: " }, { type: "text", text: "~50 Mitarbeiter, 10 Gesellschaften in Holding" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Wertschöpfung: " }, { type: "text", text: "Entwicklung → Bau → Vermarktung → Verwaltung (alles aus einer Hand)" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Tech-Stack: " }, { type: "text", text: "Excel, Server-Ordner, Trello (ungenutzt), ImmoClou, EverReal (ansatzweise)" }] }] },
        ] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Pain Points (priorisiert)" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "🔴 PRIO 1 — Interne Kommunikation + Aufgabenmanagement" }] },
        { type: "paragraph", content: [{ type: "text", text: "E-Mail-Chaos, Fragen werden 3x gestellt. Trello-Adoption gescheitert. Aus jeder E-Mail soll automatisch Task mit Zuständigkeit + Prozessschritten entstehen. KI-E-Mail-Triage als Traumlösung." }] },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "italic" }], text: "\"Jede E-Mail ist entweder Stamp oder Aufgabe. Keiner schreibt eine E-Mail und sagt 'Hey Waldemar, mein Sonnenschein.'\" — Eduard Raab" }] }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "🟡 PRIO 2 — Kündigung → Neuvermietung" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "20h/Woche · €20/h · ~€20.800/Jahr (konservativ)" }] },
        { type: "paragraph", content: [{ type: "text", text: "Manuell: Bilder sammeln, Excel, Copy-Paste-Beschreibungen, Besichtigungstermine die platzen. Vision: Kündigung eintragen → alles automatisch bis Schlüsselübergabe." }] },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "italic" }], text: "\"Das einzige, was tatsächlich bei uns im Haus passieren muss: Wir setzen einen Fleck und sagen OK, die Kündigung ist da.\" — Eduard Raab" }] }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "🟢 PRIO 3 — Baustellenmanagement" }] },
        { type: "paragraph", content: [{ type: "text", text: "Mitarbeiterplanung, Zeiterfassung, Materialbeschaffung — alles manuell. Voice-Input für Bestellvorschläge als Zukunftsvision." }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "🟢 PRIO 4 — HR / Onboarding" }] },
        { type: "paragraph", content: [{ type: "text", text: "Live-Beispiel: 3 neue MAs, Steuerberater-Rückfrage landet beim falschen Mitarbeiter → 4 Personen 20-40 Min gebunden. Kein strukturiertes Onboarding." }] },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "italic" }], text: "\"Wir brauchen ein SAP in gut und schön.\" — Eduard Raab" }] }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "🎯 Nächste Schritte" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "SOFORT: " }, { type: "text", text: "Demo-Zugang modulAI einrichten (mit Immobilien-Dummy-Daten!)" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "DIESE WOCHE: " }, { type: "text", text: "Call-Zusammenfassung an Eduard + Waldemar schicken" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "NÄCHSTER TERMIN: " }, { type: "text", text: "Solution Design Sprint (2×2h vor Ort) für €1.500 — Ergebnis: fundierte Analyse + Mockup-Designs" }] }] },
        ] },
      ],
    });
    db.prepare("INSERT OR REPLACE INTO project_notes (project_id, content, updated_at) VALUES (?, ?, datetime('now'))")
      .run("7", postCallNotes);
  });

  // Migration: GTM fields on accounts (icp_score, source, linkedin_url, employee_count)
  runMigration("accounts_gtm_fields_20260412", () => {
    const cols = (db.prepare("PRAGMA table_info(accounts)").all() as { name: string }[]).map(r => r.name);
    if (!cols.includes("icp_score"))     db.exec("ALTER TABLE accounts ADD COLUMN icp_score TEXT");
    if (!cols.includes("source"))        db.exec("ALTER TABLE accounts ADD COLUMN source TEXT");
    if (!cols.includes("linkedin_url"))  db.exec("ALTER TABLE accounts ADD COLUMN linkedin_url TEXT");
    if (!cols.includes("employee_count")) db.exec("ALTER TABLE accounts ADD COLUMN employee_count INTEGER");
  });

  // Migration: Account Notes table (TipTap rich text)
  runMigration("create_account_notes_table", () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS account_notes (
        account_id TEXT PRIMARY KEY,
        content    TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  });
}
