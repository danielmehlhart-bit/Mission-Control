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
