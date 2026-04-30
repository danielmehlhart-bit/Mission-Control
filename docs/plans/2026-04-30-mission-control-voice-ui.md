# Mission Control Voice UI Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a visible Mission Control voice workspace with call buttons, session creation, text-turn simulation, and event/session visibility on top of the already-live voice backend.

**Architecture:** Build a dedicated `/voice` route with a client-side console that talks to the existing `/api/voice/*` endpoints. Keep backend context assembly untouched; the UI should only orchestrate profile selection, session loading, text-turn submission, context switching, and event refresh. Add lightweight presentational tests using `react-dom/server` so UI states are covered without introducing a new test framework.

**Tech Stack:** Next.js 14 App Router, React 18 client components, existing inline-style design system, node:test + `tsx` for render tests.

---

## Task 1: Add UI tests first for visible voice workspace states

**Objective:** Lock the basic visible contract before writing the UI.

**Files:**
- Create: `tests/voice/voice-ui.test.tsx`
- Create later to satisfy tests: `components/voice/voice-console.tsx`

**Test coverage target:**
- Empty state renders voice title and profile buttons
- Active session state renders context summary, transcript turns, switch targets, and composer controls
- Loading/error states render the expected status copy

**Run:**
- `npx --yes tsx --test tests/voice/voice-ui.test.tsx`

---

## Task 2: Build the visible voice console component

**Objective:** Implement a reusable client component that renders the voice workspace and talks to the existing API.

**Files:**
- Create: `components/voice/voice-console.tsx`

**Requirements:**
- Fetch profiles from `/api/voice/profiles`
- Fetch recent sessions from `/api/voice/sessions`
- Create a web session from a selected profile
- Show active session state, profile badge, context summary, turns, and recent events
- Allow text input to call `/api/voice/sessions/[id]/complete-turn`
- Allow context switching via `/api/voice/sessions/[id]/context-switch`
- Provide refresh/reconnect actions and concise loading/error states
- Keep styling consistent with Mission Control dark design

**Run:**
- `npx --yes tsx --test tests/voice/voice-ui.test.tsx`

---

## Task 3: Expose the workspace in the app shell

**Objective:** Make the UI discoverable from Mission Control.

**Files:**
- Create: `app/voice/page.tsx`
- Modify: `components/app-shell.tsx`
- Modify: `app/page.tsx`

**Requirements:**
- Add a dedicated `/voice` page using the new console component
- Add `Voice` navigation entry in top nav and bottom nav
- Add a clear quick action from home into the voice workspace

**Run:**
- `npm run build`

---

## Task 4: Verify end-to-end behavior and ship

**Objective:** Confirm the visible UI works against the live backend and deploy it.

**Files:**
- No new product files required unless fixes surface during QA

**Verification:**
- `npx --yes tsx --test tests/voice/*.test.ts*`
- `npm run build`
- Browser QA on Mission Control after push:
  - `/voice` loads
  - Call buttons are visible
  - Session creation works
  - Text turn produces assistant output
  - Context switching updates the session panel

**Deploy:**
- `git add -A`
- `git commit -m "feat: add visible voice workspace"`
- `git push origin master`
