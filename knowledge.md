# Mission Control - Knowledge Base

## Overview
OpenClaw Mission Control is a Linear-style operations console for managing OpenClaw deployments.

## Tech Stack
- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS + shadcn/ui
- **Language:** TypeScript
- **Deployment:** Docker + Coolify

## Features
- **Home Dashboard:** System status overview
- **Task Board:** Kanban-style task management (local state)
- **Docs Browser:** View HTML briefings from workspace
- **Memory Viewer:** Read MEMORY.md and daily logs
- **Cron Jobs:** List scheduled jobs (placeholder)

## Architecture
```
app/
├── layout.tsx          # Main layout with AppShell
├── page.tsx            # Home dashboard
├── tasks/page.tsx      # Task board (Kanban)
├── docs/page.tsx       # Docs browser
├── memory/page.tsx     # Memory viewer
├── cron/page.tsx       # Cron jobs list
└── api/
    ├── briefings/      # API for HTML briefings
    └── memory/         # API for memory files

components/
├── app-shell.tsx       # Sidebar navigation
└── ui/                 # shadcn/ui components

lib/
└── fs.ts               # File system utilities
```

## API Routes
- `GET /api/briefings` - List HTML briefings
- `GET /api/briefings?file=path` - Read specific briefing
- `GET /api/memory` - List memory files
- `GET /api/memory?file=path` - Read specific memory file

## Environment Variables
- `BRIEFINGS_DIR` - Directory for HTML briefings (default: workspace)
- `MEMORY_DIR` - Directory for memory files (default: workspace)

## Security
- Path traversal protection in `lib/fs.ts`
- Read-only file access
- Max directory depth limited to 2

## Deployment
1. Build Docker image: `docker build -t mission-control .`
2. Run with docker-compose: `docker-compose up -d`
3. Deploy to Coolify via Git integration

## Future Enhancements
- WebSocket for live updates
- Database integration (Postgres)
- Auth system (role-based access)
- Task persistence
- Real cron job integration