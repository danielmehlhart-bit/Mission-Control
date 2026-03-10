# AGENTS.md — Mission Control

Dieses Dokument ist für KI-Coding-Agents (Claude Code, Codex, etc.) bestimmt.
Lies es vollständig bevor du irgendwas änderst.

## Was ist Mission Control?

Daniels persönliches Ops-Dashboard. Next.js 14, TypeScript, SQLite, JWT-Auth.
Live auf mc.mehlhart.de via Coolify auf Hetzner CX22.
**Autodeploy:** `git push origin master` → GitHub Action → Coolify.

Vollständige Architektur, DB-Schema, API-Routes und Feature-Liste → **`knowledge.md`** (lies sie!).

---

## Pflichtregeln für jeden Agent

### 1. Kein Hardcode von Projektlisten, Farben, Namen
Projekte, People und Tasks kommen **immer** aus der SQLite-DB via `/api/projects` etc.
Keine `const PROJECTS = [...]` Arrays in Komponenten. Niemals.

### 2. Neue Features → DB first
Neue Entitäten brauchen:
- Tabelle in `lib/db.ts` (in `initSchema()`)
- Migration in `_migrations`-Pattern falls Spalte nachträglich
- API-Route unter `app/api/<feature>/route.ts`
- Dann Komponente

### 3. Auth nicht anfassen ohne expliziten Auftrag
`middleware.ts` und `app/api/auth/` sind sicherheitskritisch.
Keine Änderungen ohne explizite Anweisung von Daniel.
Hard-fail-Prinzip: fehlt `MC_JWT_SECRET` → App blockiert, kein Fallback.

### 4. Security-Basics immer einhalten
- API POST/PATCH: explizite Felder validieren, kein `...body` spread
- Neue API-Routes: in `middleware.ts` prüfen ob Public oder Protected
- Keine Pfade außerhalb von `BRIEFINGS_DIR` / `MEMORY_DIR` lesen

### 5. Design-System einhalten
- Hintergrund: `#141720` (nicht `#000`, nicht `bg-gray-900`)
- Akzentfarben: Projektfarben aus `project.color` (hex, inline style)
- Tailwind-Klassen für Layout, inline styles für dynamische Farben
- Dark-only — kein Light Mode

### 6. Mobile berücksichtigen
Bottom-Nav für ≤640px. Neue Routen → in `app-shell.tsx` prüfen ob Nav-Eintrag nötig.

---

## Typische Aufgaben

### Neue API-Route anlegen
```
app/api/<name>/route.ts
```
```typescript
import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM <table>").all();
  return NextResponse.json(rows);
}
```
Auth wird via `middleware.ts` geprüft — kein manuelles Cookie-Check nötig.

### Neue Tabelle / Migration
In `lib/db.ts` → `initSchema()`:
```typescript
db.exec(`
  CREATE TABLE IF NOT EXISTS my_table (
    id TEXT PRIMARY KEY,
    ...
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
// Nachträgliche Spalte:
addCol("ALTER TABLE my_table ADD COLUMN new_field TEXT");
```

### Seed-Daten
Muster: `if (count === 0) { insert.run(...) }` — nur beim ersten Start.
Für Updates: `runMigration("unique_migration_id_YYYYMMDD", () => { ... })`.

---

## Deployment

```bash
cd /home/hartner/Mission-Control
git add -A
git commit -m "feat: ..."
git push origin master
```

Nach dem Push: GitHub Actions kurz checken → grün = live in ~3–5 Min.

**Coolify:** http://46.224.119.191:8000 · App UUID: `kccsg0gcwkgo44wsk0wwkok0`

---

## Env-Vars (Coolify gesetzt)

| Variable | Zweck |
|----------|-------|
| `MC_JWT_SECRET` | JWT Signing Key (hard-fail wenn fehlt) |
| `MC_PASSWORD` | Login-Passwort |
| `BRIEFINGS_DIR` | Briefings-Verzeichnis im Container |
| `MEMORY_DIR` | Memory-Verzeichnis im Container |
| `DB_PATH` | SQLite-Pfad (default `/data/mc.db`) |

---

## Was du NICHT tun sollst

- ❌ `rm -rf` oder destruktive Datei-Ops ohne Rückfrage
- ❌ Auth-Logik ändern ohne expliziten Auftrag
- ❌ `next.config.mjs` Security-Headers entfernen
- ❌ Projektlisten hardcoden
- ❌ Auf Dateien außerhalb des Repos zugreifen (z.B. `/home/hartner/dashboard/` — das ist ein altes, separates Projekt)
- ❌ `package.json` Dependencies hinzufügen ohne Abwägung (Build-Zeit im Container)

---

## Wenn du fertig bist

1. Alle geänderten Dateien committen (kein WIP-Commit)
2. `git push origin master`
3. In deiner Antwort: Was gebaut, welche Dateien geändert, Commit-Hash
4. Bekannte Einschränkungen oder Tech-Debt nennen
