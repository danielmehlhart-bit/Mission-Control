# Mission Control - Knowledge Base
_Letzte Aktualisierung: 2026-03-08_

## Overview
Daniels persönliches Ops-Dashboard — Linear-Style Console für Tasks, Projekte, Briefings, People.

## Tech Stack
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS + inline styles (Design-System: dark, #141720 Hintergrund)
- **Deployment:** Docker + Coolify (Hetzner CX22, mc.mehlhart.de)
- **Autodeploy:** git push origin master → GitHub Action → Coolify

## Features (Stand: 2026-03-08)

| Route | Feature |
|-------|---------|
| `/` | Home: Greeting, Quick-Actions, Capture Pill, Briefings-Card (datierte Dateien, NEU-Badge) |
| `/tasks` | Task Board: CRUD, Edit-Modal mit Notizen, Projekt-Filter-Chips (dynamisch), Capture Pill |
| `/projects` | Projektkarten: Status, Tasks-Count, Deep-Link zu Briefings (`/docs?project=Name`) |
| `/people` | People CRUD: Add/Edit/Delete Modal, Projekt-Zuordnung |
| `/docs` | Docs Browser: Split-Pane, Projekt-Filter + Kategorie-Tabs, Deep-Link via URL-Param, iframe-Preview |
| `/memory` | Memory Viewer: MEMORY.md + Daily Logs |
| `/hatti` | mc-commands.json anzeigen |
| Mobile | Bottom-Nav für ≤640px |

## Architektur

```
app/
├── page.tsx              # Home
├── tasks/page.tsx        # Task Board
├── projects/page.tsx     # Projekt-Übersicht
├── people/page.tsx       # People CRUD
├── docs/page.tsx         # Docs Browser (Split-Pane)
├── memory/page.tsx       # Memory Viewer
├── hatti/page.tsx        # Hatti Commands
└── api/
    ├── briefings/        # GET list/file (force-dynamic)
    ├── tasks/            # GET/POST/PATCH/DELETE
    ├── projects/         # GET/POST/PATCH/DELETE (Seed-Daten + JSON-File)
    └── memory/           # GET list/file

components/
├── app-shell.tsx         # Sidebar/Bottom-Nav
└── capture-pill.tsx      # Quick-Task-Input (nimmt projects[] als Prop)

lib/
├── fs.ts                 # Filesystem-Zugriff (BRIEFINGS_DIR, MEMORY_DIR)
├── categories.ts         # Briefing-Kategorisierung (morning/projekt/security/...)
└── projects.ts           # briefingMatchesProject() — Keyword-Matching Dateiname↔Projekt
```

## API Routes

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/briefings` | GET | Liste aller HTML-Briefings (force-dynamic) |
| `/api/briefings?file=path` | GET | Briefing-Inhalt |
| `/api/briefings?file=path&raw=1` | GET | Rohes HTML (für iframe) |
| `/api/tasks` | GET/POST/PATCH/DELETE | Task CRUD |
| `/api/projects` | GET/POST/PATCH/DELETE | Projekt CRUD (JSON-File + Seed) |
| `/api/memory` | GET | Memory-Dateien |

## Projekt-Matching (lib/projects.ts)
`briefingMatchesProject(filename, projectName)` — extrahiert Keywords (>3 Zeichen) aus Projektnamen und prüft ob im Dateinamen vorhanden. Automatisch für neue Projekte.

## Environment Variables
| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `BRIEFINGS_DIR` | `/workspace` | Briefings-Verzeichnis im Container |
| `MEMORY_DIR` | `/workspace` | Memory-Verzeichnis im Container |
| `PROJECTS_FILE` | `/data/briefings/projects.json` | Projekte-Datei (persistent) |

## Deployment-Flow
```
Pi /home/hartner/mission-control/briefings/ (neue HTML-Dateien)
  → mc-watcher.service (inotifywait, auto-push)
    → GitHub (master)
      → Coolify (rebuild Docker-Image, ~3-5 Min)
        → mc.mehlhart.de live
```

## Bekannte Einschränkungen
- Projekte-JSON liegt in `/data/briefings/projects.json` im Container — bei neuem Deploy bleibt er erhalten (Coolify Volume), bei komplettem Wipe weg
- Briefing-Matching ist keyword-basiert, kein explizites Tagging
- Keine Echtzeit-Updates (kein WebSocket) — fetch on mount
