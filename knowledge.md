# Mission Control - Knowledge Base
_Letzte Aktualisierung: 2026-03-10_

## Overview
Daniels persönliches Ops-Dashboard — Linear-Style Console für Tasks, Projekte, Briefings, People, Meetings.

## Tech Stack
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS + inline styles (Design-System: dark, `#141720` Hintergrund)
- **Database:** SQLite via `better-sqlite3` (persistent in `/data/mc.db`, Coolify Volume)
- **Auth:** JWT (jose, HS256, httpOnly Cookie `mc_auth`, 30d Expiry)
- **Deployment:** Docker + Coolify (Hetzner CX22, mc.mehlhart.de)
- **Autodeploy:** git push origin master → GitHub Action → Coolify (~3–5 Min)

## Features (Stand: 2026-03-10)

| Route | Feature |
|-------|---------|
| `/login` | JWT Login-Form, rate-limited (5 Versuche / 15 Min / IP) |
| `/` | Home: Greeting, Quick-Actions, Capture Pill, Briefings-Card (datierte Dateien, NEU-Badge) |
| `/tasks` | Task Board: CRUD, Edit-Modal mit Notizen, Projekt-Filter-Chips (dynamisch), Capture Pill |
| `/projects` | Projektkarten: Status, Tasks-Count, Stage/Opportunity, Deep-Link zu Briefings + Notes |
| `/projects/[id]` | Projekt-Detail: Notes-Editor (TipTap), Meetings-Liste, zugehörige Tasks |
| `/people` | People CRUD: Add/Edit/Delete Modal, Projekt-Zuordnung |
| `/docs` | Docs Browser: Split-Pane, Projekt-Filter + Kategorie-Tabs, Deep-Link via URL-Param, iframe-Preview |
| `/memory` | Memory Viewer: MEMORY.md + Daily Logs |
| `/hatti` | mc-commands.json anzeigen |
| `/cron` | Cron-Übersicht (Experimental) |
| Mobile | Bottom-Nav für ≤640px |

## Architektur

```
app/
├── page.tsx                   # Home
├── login/page.tsx             # JWT Login
├── tasks/page.tsx             # Task Board
├── projects/page.tsx          # Projekt-Übersicht
├── projects/[id]/page.tsx     # Projekt-Detail (Notes + Meetings + Tasks)
├── projects/[id]/edit-modal.tsx
├── people/page.tsx            # People CRUD
├── docs/page.tsx              # Docs Browser (Split-Pane)
├── memory/page.tsx            # Memory Viewer
├── hatti/page.tsx             # Hatti Commands
├── cron/page.tsx              # Cron-Übersicht
└── api/
    ├── auth/login/            # POST (setzt mc_auth Cookie)
    ├── auth/logout/           # POST (löscht mc_auth Cookie)
    ├── briefings/             # GET list/file (force-dynamic)
    ├── tasks/                 # GET/POST/PATCH/DELETE
    ├── projects/              # GET/POST/PATCH/DELETE
    ├── people/                # GET/POST/PATCH/DELETE
    ├── meetings/              # GET/POST/PATCH/DELETE
    ├── notes/                 # GET/POST (Projekt-Notes, TipTap JSON)
    ├── memory/                # GET list/file
    └── hatti/                 # GET mc-commands.json

components/
├── app-shell.tsx              # Sidebar/Bottom-Nav
└── capture-pill.tsx           # Quick-Task-Input (lädt projects[] dynamisch)

lib/
├── db.ts                      # SQLite-Singleton, Schema-Init, Seed, Migrations
├── fs.ts                      # Filesystem-Zugriff (BRIEFINGS_DIR, MEMORY_DIR)
├── categories.ts              # Briefing-Kategorisierung (morning/projekt/security/...)
├── projects.ts                # briefingMatchesProject() — Keyword-Matching Dateiname↔Projekt
└── utils.ts                   # Shared Utilities

middleware.ts                  # JWT-Verifikation (jose), hard-fail ohne MC_JWT_SECRET
```

## Datenbank (SQLite)

**Pfad:** `/data/mc.db` (Coolify Volume), Fallback `/tmp/mc.db`
**Mode:** WAL (`journal_mode = WAL`) + `foreign_keys = ON`

| Tabelle | Felder (Auswahl) |
|---------|------------------|
| `projects` | id, name, client, status, description, contact_id, repo, color, stage, opportunity_value |
| `people` | id, name, company, role, email, phone, project, notes |
| `tasks` | id, title, project, status, notes, created_at, done_at |
| `project_notes` | project_id (PK), content (TipTap JSON), updated_at |
| `meetings` | id, project_id, title, type, date, duration_min, participants, notes, summary, drive_link, action_items, status |
| `_migrations` | id, applied_at |

Seed-Daten werden beim ersten Start automatisch angelegt (Projekte + People). Migrations laufen idempotent via `_migrations`-Tabelle.

## API Routes

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/auth/login` | POST | Login (setzt mc_auth JWT Cookie, rate-limited) |
| `/api/auth/logout` | POST | Logout (löscht mc_auth Cookie) |
| `/api/briefings` | GET | Liste aller HTML-Briefings (force-dynamic) |
| `/api/briefings?file=path` | GET | Briefing-Inhalt |
| `/api/briefings?file=path&raw=1` | GET | Rohes HTML (für iframe) |
| `/api/tasks` | GET/POST/PATCH/DELETE | Task CRUD |
| `/api/projects` | GET/POST/PATCH/DELETE | Projekt CRUD |
| `/api/people` | GET/POST/PATCH/DELETE | People CRUD |
| `/api/meetings` | GET/POST/PATCH/DELETE | Meetings CRUD |
| `/api/notes?projectId=X` | GET/POST | Projekt-Notes (TipTap JSON) |
| `/api/memory` | GET | Memory-Dateien |
| `/api/hatti` | GET | mc-commands.json |

## Auth & Security

- **JWT:** `jose` (Edge Runtime kompatibel), HS256, httpOnly Cookie `mc_auth`, 30d Expiry
- **Env:** `MC_JWT_SECRET` (min. 32 Zeichen, hard-fail wenn fehlt) + `MC_PASSWORD`
- **Rate Limiting:** Login max 5 Versuche / 15 Min / IP (in-memory)
- **Memory-Scope:** `/api/memory` liest nur `memory/` Subdir (kein Workspace-Leak)
- **Allowlist-Validierung:** POST/PATCH-Routes validieren explizite Felder (kein `...body` spread)
- **HTTP Security Headers:** `X-Frame-Options: DENY`, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, CSP (in `next.config.mjs`)
- **Middleware:** Alle Routes außer `/_next/`, `/favicon`, `/login`, `/api/auth/login` sind JWT-geschützt

## Environment Variables

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `BRIEFINGS_DIR` | `/workspace` | Briefings-Verzeichnis im Container |
| `MEMORY_DIR` | `/workspace` | Memory-Verzeichnis im Container |
| `DB_PATH` | `/data/mc.db` | SQLite-Pfad (Coolify Volume) |
| `MC_JWT_SECRET` | — | **Pflicht.** Fehlt → Hard-fail (503) |
| `MC_PASSWORD` | — | **Pflicht.** Login-Passwort |

## Deployment-Flow

```
Lokales Repo (/home/hartner/Mission-Control/)
  → git push origin master
    → GitHub Action (CI)
      → Coolify Webhook → rebuild Docker-Image (~3–5 Min)
        → mc.mehlhart.de live
```

**Coolify:** http://46.224.119.191:8000 · App UUID: `kccsg0gcwkgo44wsk0wwkok0`
**Storage:** Coolify → App → Storages → Directory `/data` (SQLite + Briefings)

## Briefing-Flow (Stand: 2026-03-10)

Briefings werden noch in den Docker-Image-Build gebacken (suboptimal):
```
Pi /home/hartner/mission-control/briefings/ (neue HTML-Dateien)
  → mc-watcher.service (inotifywait, auto-push)
    → GitHub (master)
      → Coolify (rebuild Docker-Image, ~3-5 Min)
        → mc.mehlhart.de live
```
**Geplant:** Briefings über Coolify Volume mounten → kein Rebuild bei neuen Briefings nötig.
**Blocker:** SSH Key Pi → Hetzner noch nicht hinterlegt.

## Projekt-Matching (`lib/projects.ts`)

`briefingMatchesProject(filename, projectName)` — extrahiert Keywords (>3 Zeichen) aus Projektnamen und prüft ob im Dateinamen vorhanden. Automatisch für neue Projekte, kein Hardcode.


## Motion Spec (UI Animation Guidelines)

Mission Control nutzt eine **leichte CSS-first Motion Layer** (kein zusätzlicher Runtime-Overhead).

### Core Tokens
- `--motion-duration-page`: **280ms** (Page Enter)
- `--motion-duration-section`: **220ms** (Section/Card Stagger)
- `--motion-duration-hover`: **160ms** (Hover/Press Feedback)
- `--motion-ease-enter`: `cubic-bezier(0.22, 1, 0.36, 1)`
- `--motion-ease-exit`: `cubic-bezier(0.4, 0, 1, 1)`
- `--motion-distance-page`: **16px** Y-offset
- `--motion-distance-section`: **10px** Y-offset
- `--motion-shadow-rest`: `0 0 0 rgba(0,0,0,0)`
- `--motion-shadow-hover`: `0 14px 26px rgba(0,0,0,0.26)`

### Patterns
- **Page enter:** `page-motion-enter` auf Route-Content anwenden.
- **Section stagger:** Parent `motion-stagger`, Kinder `motion-item`, Delay via `--stagger-index` in ~45ms Steps.
- **Interactive surfaces:** `motion-elevated` für Karten/Buttons (leichter Lift + Shadow), auf Mobile Hover-Effekt deaktiviert.

### Performance + Graceful Degradation
- Nur `transform` + `opacity` animieren (keine layout-thrashing Properties).
- `will-change: transform` nur auf interaktiven Flächen (`motion-elevated`).
- Auf `max-width: 640px` wird Hover-Lift neutralisiert, damit Touch-UX stabil bleibt.
- Bei `prefers-reduced-motion: reduce`: Animationen/Transitions nahezu deaktiviert, Inhalte erscheinen statisch.
- Ziel: konsistente Motion ohne spürbaren FPS-Drop auf mobilen Geräten.

## Bekannte Einschränkungen / Tech-Debt

- Rate Limiter ist in-memory (kein Redis) → verliert State bei Restart
- Middleware redirected API-Routes zu `/login` statt JSON-401 (pragmatisch, nicht RESTful)
- Next.js 14.x hat offene CVEs → Update auf 15.x empfohlen, noch nicht gemacht
- Briefings noch im Image gebacken (Volume-Architektur steht aus, SSH-Key-Blocker)
- `/cron`-Route ist experimentell
