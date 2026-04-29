# Mission Control Voice Mode (Backend-first) Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a Mission Control voice system that lets Daniel start context-specific calls (Main, Sales Support, LUMA, Fitness) with immediate access to the right session context, while implementing backend state, routing, hooks, and observability before the frontend UI.

**Architecture:** Add a backend-first voice orchestration layer inside Mission Control. Persist voice profiles, voice sessions, state transitions, context bindings, and events in SQLite; expose narrow API routes for lifecycle actions; implement a deterministic session state machine and hook pipeline in `lib/voice/*`; add transcript/context hydration hooks against existing Mission Control entities first, with Telegram/history hydration as adapters. Frontend comes later and only consumes these APIs.

**Tech Stack:** Next.js 14 App Router, TypeScript, SQLite via `better-sqlite3`, existing JWT auth, server-side route handlers, optional external STT/TTS/Realtime providers behind adapters.

---

## Product shape to optimize for

The user experience we are designing for is:

1. Daniel clicks **Call Hermes**, **Call Sales Support**, **Call LUMA**, or **Call Fitness**.
2. The backend resolves a **voice profile**.
3. That profile loads:
   - a stable base session identity
   - fresh context sources
   - profile-specific behavior and tool scope
4. A voice session starts in a known state.
5. Daniel can immediately ask a question without re-explaining context.
6. During the call, the system can switch context explicitly (e.g. “geh in Sales Support”).
7. Transcript, summary, and key artifacts are persisted for later reuse.

This plan intentionally prioritizes **deterministic backend state** over audio transport polish.

---

## Core backend concepts

### 1. Voice profiles
Fixed callable contexts such as:
- `main`
- `sales_support`
- `luma`
- `fitness`

A profile defines:
- label
- color/icon metadata
- default base session key
- default context sources
- optional account/project/deal bindings
- prompt prelude / persona hints
- allowed context-jump targets

### 2. Voice sessions
A concrete runtime call instance. One row per call.

### 3. Voice state machine
Deterministic states:
- `idle`
- `booting`
- `hydrating_context`
- `ready`
- `listening`
- `thinking`
- `speaking`
- `awaiting_user`
- `switching_context`
- `paused`
- `ending`
- `completed`
- `failed`

### 4. Voice events
Append-only event log for observability and replay:
- session started
- hydration started/completed/failed
- transcript chunk received
- user turn committed
- assistant turn generated
- tts started/completed
- context switch requested/applied
- session ended
- provider error

### 5. Hook pipeline
Server-side hooks run on key transitions. Examples:
- `beforeSessionCreate`
- `beforeHydration`
- `hydrateProfileContext`
- `hydrateFreshContext`
- `beforeAssistantTurn`
- `afterAssistantTurn`
- `beforeContextSwitch`
- `afterSessionEnd`

### 6. Context sources
Abstract sources that can contribute structured context:
- Mission Control account data
- deals
- activities
- discovery notes
- account notes
- recent meetings
- recent tasks
- recent briefings
- later: Telegram thread snapshot
- later: Hermes session summary lookup

---

## Recommended directory/file layout

### New files to create
- `lib/voice/types.ts`
- `lib/voice/state-machine.ts`
- `lib/voice/service.ts`
- `lib/voice/hooks.ts`
- `lib/voice/context-router.ts`
- `lib/voice/context-sources.ts`
- `lib/voice/providers.ts`
- `lib/voice/session-store.ts`
- `lib/voice/default-profiles.ts`
- `app/api/voice/profiles/route.ts`
- `app/api/voice/sessions/route.ts`
- `app/api/voice/sessions/[id]/route.ts`
- `app/api/voice/sessions/[id]/events/route.ts`
- `app/api/voice/sessions/[id]/transcript/route.ts`
- `app/api/voice/sessions/[id]/context-switch/route.ts`
- `app/api/voice/sessions/[id]/complete-turn/route.ts`

### Existing files to modify
- `lib/db.ts`
- `middleware.ts` (only to confirm new routes stay protected; do not alter auth logic)
- `knowledge.md` (after implementation, not during plan)
- later frontend phase only:
  - `components/app-shell.tsx`
  - `app/page.tsx` or new voice page/component

---

## Database design

Add these tables in `lib/db.ts`.

### `voice_profiles`
Purpose: stable callable contexts.

Suggested fields:
- `id TEXT PRIMARY KEY`
- `slug TEXT NOT NULL UNIQUE`
- `label TEXT NOT NULL`
- `description TEXT`
- `status TEXT NOT NULL DEFAULT 'active'`
- `color TEXT`
- `icon TEXT`
- `base_session_key TEXT NOT NULL`
- `default_prompt TEXT`
- `context_binding_json TEXT NOT NULL DEFAULT '{}'`
- `context_sources_json TEXT NOT NULL DEFAULT '[]'`
- `allowed_switch_targets_json TEXT NOT NULL DEFAULT '[]'`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`

### `voice_sessions`
Purpose: one row per call instance.

Suggested fields:
- `id TEXT PRIMARY KEY`
- `profile_id TEXT NOT NULL`
- `state TEXT NOT NULL`
- `transport TEXT NOT NULL DEFAULT 'web'`
- `base_session_key TEXT NOT NULL`
- `resolved_context_json TEXT NOT NULL DEFAULT '{}'`
- `last_user_transcript TEXT`
- `last_assistant_text TEXT`
- `last_error TEXT`
- `started_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `ended_at TEXT`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`

### `voice_session_events`
Purpose: append-only event stream.

Suggested fields:
- `id TEXT PRIMARY KEY`
- `session_id TEXT NOT NULL`
- `event_type TEXT NOT NULL`
- `from_state TEXT`
- `to_state TEXT`
- `payload_json TEXT NOT NULL DEFAULT '{}'`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`

### `voice_turns`
Purpose: canonical transcript turns.

Suggested fields:
- `id TEXT PRIMARY KEY`
- `session_id TEXT NOT NULL`
- `speaker TEXT NOT NULL` (`user` / `assistant` / `system`)
- `text TEXT NOT NULL`
- `source TEXT NOT NULL DEFAULT 'voice'`
- `sequence_no INTEGER NOT NULL`
- `metadata_json TEXT NOT NULL DEFAULT '{}'`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`

### `voice_profile_bindings`
Purpose: optional normalized profile links instead of overloading JSON.

Suggested fields:
- `id TEXT PRIMARY KEY`
- `profile_id TEXT NOT NULL`
- `binding_type TEXT NOT NULL` (`account` / `project` / `deal` / `topic` / `telegram_chat` / `telegram_thread` / `custom`)
- `binding_value TEXT NOT NULL`
- `metadata_json TEXT NOT NULL DEFAULT '{}'`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`

### Migration rule
Use the existing `_migrations` pattern; do not rely only on `CREATE TABLE IF NOT EXISTS` when backfilling seed profiles or adding indexes.

---

## State machine design

Implement this as pure backend logic in `lib/voice/state-machine.ts`.

### Allowed transitions

```text
idle -> booting
booting -> hydrating_context | failed
hydrating_context -> ready | failed
ready -> listening | ending
listening -> thinking | switching_context | ending | failed
thinking -> speaking | awaiting_user | failed
speaking -> awaiting_user | listening | ending | failed
awaiting_user -> listening | switching_context | ending
switching_context -> hydrating_context | awaiting_user | failed
paused -> listening | ending
ending -> completed | failed
```

### Rules
- Every transition must be validated centrally.
- Invalid transitions must hard-fail and emit a `voice.invalid_transition` event.
- State changes must be persisted transactionally with event emission.
- Hook execution should be associated with transitions, not scattered across routes.

### Why this matters
This lets us support:
- push-to-talk later
- streaming later
- retries later
- debugging/replay now

---

## Hook system design

Implement hooks in `lib/voice/hooks.ts` as a simple registry, not a heavy framework.

### Hook names for MVP
- `beforeSessionCreate`
- `afterSessionCreate`
- `beforeHydration`
- `hydrateProfileContext`
- `hydrateFreshContext`
- `afterHydration`
- `beforeTurnCommit`
- `beforeAssistantGenerate`
- `afterAssistantGenerate`
- `beforeContextSwitch`
- `afterContextSwitch`
- `beforeSessionEnd`
- `afterSessionEnd`
- `onProviderError`

### Required hook behavior
- Input: typed session context + payload
- Output: partial patch object(s), not direct DB writes where possible
- Hooks should be composable and ordered
- Hook failures must be captured into `voice_session_events`
- A failed non-critical hook should not always kill the session; classify hooks as `required` vs `best_effort`

### Initial hook bundles
1. **Profile hydration hooks**
2. **Recent activity hydration hooks**
3. **Transcript persistence hooks**
4. **Summary generation hook** (stub initially)
5. **Context-switch hook**

---

## Context hydration strategy

Build this in two passes.

### Pass A — stable profile context
Hydrates from the selected voice profile:
- base session key
- linked account/project/deal
- default prompt prelude
- allowed switch targets

### Pass B — fresh operational context
Hydrates current state from Mission Control sources:
- latest activities for linked account/project
- recent discovery notes
- account notes summary pointer
- open deals
- upcoming calendar events
- recent tasks
- recent briefings matched by project/account

### Output shape
Create a normalized payload in `resolved_context_json`, for example:

```json
{
  "profile": {"id": "vp_luma", "slug": "luma", "label": "LUMA"},
  "bindings": {
    "accountId": "acc_123",
    "projectId": "proj_123"
  },
  "sources": [
    {"type": "account", "count": 1},
    {"type": "activities", "count": 12},
    {"type": "discovery_notes", "count": 2},
    {"type": "tasks", "count": 6}
  ],
  "contextSummary": "Short machine-generated hydration summary...",
  "switchTargets": ["main", "sales_support"]
}
```

### Important rule
Do **not** make raw UI components responsible for assembling context. Context assembly belongs entirely in backend services.

---

## Provider abstraction

Do not bind business logic directly to ElevenLabs/OpenAI/WebRTC.

Implement provider adapters in `lib/voice/providers.ts`.

### Interfaces
- `SpeechToTextProvider`
- `TextToSpeechProvider`
- `RealtimeConversationProvider` (future-facing)
- `AgentTurnProvider`

### MVP reality
The backend-first phase can stub actual audio transport and focus on:
- text turn completion endpoint
- transcript ingestion endpoint
- assistant turn generation endpoint

That lets us validate state/context before live audio.

---

## API design

All routes remain protected by existing JWT middleware.

### `GET /api/voice/profiles`
Returns callable voice profiles for the future frontend buttons.

Response:
- profile id
- slug
- label
- description
- color
- icon
- status

### `POST /api/voice/sessions`
Creates a new voice session for a profile.

Input:
```json
{
  "profileId": "vp_luma",
  "transport": "web"
}
```

Behavior:
- validate profile
- create session in `booting`
- emit event
- run hydration
- move to `ready`
- return session + resolved context summary

### `GET /api/voice/sessions/[id]`
Returns full session envelope:
- current state
- profile
- context summary
- recent turns
- last error

### `POST /api/voice/sessions/[id]/transcript`
Used later by frontend audio pipeline to append transcript chunks or final user turn.

Input:
```json
{
  "text": "Schau mal bitte in LUMA rein",
  "isFinal": true,
  "metadata": {"provider": "openai-realtime"}
}
```

### `POST /api/voice/sessions/[id]/complete-turn`
Canonical backend turn endpoint for MVP.

Input:
```json
{
  "userText": "Was ist der aktuelle Stand bei LUMA?"
}
```

Behavior:
- transition to `thinking`
- persist user turn
- run assistant generation hook/provider
- persist assistant turn
- transition to `awaiting_user`
- return assistant text plus state

### `POST /api/voice/sessions/[id]/context-switch`
Input:
```json
{
  "targetProfileSlug": "sales_support",
  "reason": "user_request"
}
```

Behavior:
- validate allowed target
- transition to `switching_context`
- re-run hydration against new profile/bindings
- append system turn summarizing switch
- return updated state/context

### `GET /api/voice/sessions/[id]/events`
For observability/debugging.

---

## Seed profile design

Create default seed profiles via migration or startup seed logic.

### `main`
- label: `Call Hermes`
- purpose: general context
- bindings: minimal
- switch targets: all

### `sales_support`
- label: `Call Sales Support`
- bindings: default linked sales account(s) or sales task/project space
- sources: activities, deals, discovery notes, account notes
- switch targets: `main`, `luma`

### `luma`
- label: `Call LUMA`
- bindings: LUMA account/project
- sources: tasks, project notes, briefings, activities, optionally repo metadata later
- switch targets: `main`, `sales_support`

### `fitness`
- label: `Call Fitness`
- bindings: none initially or future custom memory source
- switch targets: `main`

Store these in DB, not in frontend constants.

---

## Backend-first delivery phases

## Phase 0 — inspection and guardrails

### Task 1: Confirm repo conventions and current schemas
**Objective:** Start from real Mission Control structure, not assumptions.

**Files:**
- Read: `AGENTS.md`
- Read: `knowledge.md`
- Read: `lib/db.ts`
- Read: `app/api/activities/route.ts`
- Read: `app/accounts/[id]/page.tsx`

**Step 1: Verify current schema entry points**
Run: inspect `lib/db.ts` and note where new tables/migrations must be inserted.

**Step 2: Verify protected API behavior**
Read `middleware.ts` and confirm new `/api/voice/*` routes require no auth exception.

**Step 3: Record constraints**
Write down that auth must not be changed and no hardcoded project/account lists may live in components.

---

## Phase 1 — schema and typed backend foundation

### Task 2: Add voice tables to SQLite schema
**Objective:** Persist profiles, sessions, events, turns, and bindings.

**Files:**
- Modify: `lib/db.ts`
- Test: manual API smoke tests after build

**Step 1: Add `CREATE TABLE IF NOT EXISTS` blocks**
Add the five voice tables near the existing schema definitions.

**Step 2: Add indexes**
Add indexes for:
- `voice_sessions(profile_id, started_at)`
- `voice_session_events(session_id, created_at)`
- `voice_turns(session_id, sequence_no)`
- `voice_profile_bindings(profile_id, binding_type)`

**Step 3: Add seed migration for default profiles**
Use `runMigration("seed_voice_profiles_20260429", ...)`.

**Step 4: Add helper update columns if needed**
If you need `updated_at` semantics, use explicit update queries in services; do not overcomplicate with triggers in MVP.

**Step 5: Verify schema boots cleanly**
Run: `npm run build`
Expected: build passes.

---

### Task 3: Add voice domain types
**Objective:** Centralize state, payload, and profile typing.

**Files:**
- Create: `lib/voice/types.ts`

**Step 1: Define literal unions**
Create types for:
- `VoiceSessionState`
- `VoiceEventType`
- `VoiceProfileSlug`
- `VoiceBindingType`

**Step 2: Define domain objects**
Add interfaces for:
- `VoiceProfile`
- `VoiceSession`
- `VoiceSessionEvent`
- `VoiceTurn`
- `ResolvedVoiceContext`

**Step 3: Define route payload types**
Add input/output types for each voice API route.

**Step 4: Verify imports compile**
Run: `npm run build`
Expected: no type errors.

---

### Task 4: Add session-store helpers
**Objective:** Keep SQL out of route handlers.

**Files:**
- Create: `lib/voice/session-store.ts`

**Step 1: Add read helpers**
Implement helpers like:
- `getVoiceProfileById`
- `getVoiceProfileBySlug`
- `listVoiceProfiles`
- `getVoiceSession`
- `listVoiceSessionEvents`
- `listVoiceTurns`

**Step 2: Add write helpers**
Implement helpers like:
- `createVoiceSession`
- `appendVoiceEvent`
- `appendVoiceTurn`
- `updateVoiceSessionState`
- `updateVoiceSessionContext`

**Step 3: Ensure metadata JSON parsing is centralized**
No repeated `JSON.parse` in route handlers.

**Step 4: Verify by importing into a no-op route scaffold**
Run: `npm run build`
Expected: pass.

---

## Phase 2 — deterministic state machine and hook engine

### Task 5: Implement state machine rules
**Objective:** Enforce legal transitions centrally.

**Files:**
- Create: `lib/voice/state-machine.ts`

**Step 1: Encode transition map**
Implement an `ALLOWED_TRANSITIONS` map.

**Step 2: Add validation helper**
Implement:
- `canTransition(from, to)`
- `assertTransition(from, to)`

**Step 3: Add transition result shape**
Return a structured object with from/to, timestamp, and optional reason.

**Step 4: Verify with lightweight self-check function**
Add a small exported helper that can be exercised in implementation tests later.

---

### Task 6: Implement hook registry
**Objective:** Make lifecycle augmentation explicit and composable.

**Files:**
- Create: `lib/voice/hooks.ts`

**Step 1: Define hook context**
Include session, profile, resolved context, db/store access, and payload.

**Step 2: Define registry API**
Implement:
- `registerVoiceHook(name, hook)`
- `runVoiceHooks(name, ctx)`

**Step 3: Support `required` vs `best_effort` hooks**
Required failures bubble; best-effort failures log events.

**Step 4: Add event emission integration**
Failures should create `voice.hook_failed` events.

---

## Phase 3 — context router and hydration

### Task 7: Implement context source loaders
**Objective:** Load reusable pieces of Mission Control context.

**Files:**
- Create: `lib/voice/context-sources.ts`

**Step 1: Add account source**
Return core account metadata.

**Step 2: Add activities source**
Return recent activities for account/project/deal.

**Step 3: Add discovery notes source**
Return recent discovery notes for bound account.

**Step 4: Add tasks source**
Return recent/open tasks for bound project/account where possible.

**Step 5: Add briefings source**
Return recent matched briefings by filename/project/account association.

**Step 6: Add calendar source**
Return upcoming events from `/api/calendar`-equivalent logic via shared server code, not HTTP fetch.

---

### Task 8: Implement context router
**Objective:** Turn profile + bindings into resolved session context.

**Files:**
- Create: `lib/voice/context-router.ts`
- Create: `lib/voice/default-profiles.ts`

**Step 1: Resolve profile bindings**
Map profile slug to base session key and source list.

**Step 2: Run stable hydration**
Assemble fixed profile context.

**Step 3: Run fresh hydration**
Fan out to source loaders and build `resolved_context_json`.

**Step 4: Build compact context summary string**
This summary is what later gets injected into assistant generation.

**Step 5: Add context-switch resolver**
Support switching by target profile slug.

---

## Phase 4 — voice service orchestration

### Task 9: Implement service layer
**Objective:** Keep route handlers thin and stateful behavior centralized.

**Files:**
- Create: `lib/voice/service.ts`

**Step 1: Implement `createSessionForProfile()`**
Behavior:
- create row in `booting`
- emit event
- transition to `hydrating_context`
- run hydration hooks/router
- persist context
- transition to `ready`

**Step 2: Implement `commitUserTurn()`**
Behavior:
- validate session state
- append transcript/user turn
- emit event

**Step 3: Implement `generateAssistantTurn()`**
Behavior:
- transition to `thinking`
- build assistant request payload from context + recent turns
- call provider stub/adapter
- persist assistant turn
- transition to `awaiting_user`

**Step 4: Implement `switchSessionContext()`**
Behavior:
- transition to `switching_context`
- resolve target profile
- hydrate
- append system note
- transition to `awaiting_user`

**Step 5: Implement `endSession()`**
Behavior:
- transition to `ending`
- run end hooks
- mark `completed`

---

## Phase 5 — protected API routes

### Task 10: Add profiles route
**Objective:** Expose button-ready voice profile list.

**Files:**
- Create: `app/api/voice/profiles/route.ts`

**Step 1: Add GET handler**
Return active profiles ordered by `sort_order`.

**Step 2: Verify route auth remains protected**
Manual browser/API check while authenticated.

---

### Task 11: Add sessions collection route
**Objective:** Create and list sessions.

**Files:**
- Create: `app/api/voice/sessions/route.ts`

**Step 1: Add POST handler**
Validate `profileId` and `transport`.

**Step 2: Call service layer**
No inline SQL in handler.

**Step 3: Optionally add GET handler**
List recent sessions for observability/debugging.

---

### Task 12: Add per-session routes
**Objective:** Expose session state, events, transcripts, and context switch.

**Files:**
- Create: `app/api/voice/sessions/[id]/route.ts`
- Create: `app/api/voice/sessions/[id]/events/route.ts`
- Create: `app/api/voice/sessions/[id]/transcript/route.ts`
- Create: `app/api/voice/sessions/[id]/context-switch/route.ts`
- Create: `app/api/voice/sessions/[id]/complete-turn/route.ts`

**Step 1: Add GET session envelope**
Return session + turns + summary.

**Step 2: Add transcript POST**
Append user transcript chunks/final text.

**Step 3: Add complete-turn POST**
Use the backend assistant turn flow.

**Step 4: Add context-switch POST**
Switch by target profile slug.

**Step 5: Add events GET**
Return ordered event log.

---

## Phase 6 — provider stubs and later realtime integration

### Task 13: Add provider interfaces and stubs
**Objective:** Keep transport vendor-neutral.

**Files:**
- Create: `lib/voice/providers.ts`

**Step 1: Define provider interfaces**
STT/TTS/realtime/agent-turn provider types.

**Step 2: Add a text-only agent turn stub**
During backend phase, this can return deterministic placeholder text or call a later Hermes bridge.

**Step 3: Add config shape for future providers**
Do not wire env vars into business logic yet.

---

## Phase 7 — test and verification plan

### Task 14: Add backend verification checklist
**Objective:** Prove the state model works before any frontend work.

**Files:**
- Use: API routes above

**Step 1: Create session**
Call `POST /api/voice/sessions` with `profileId = vp_luma`.
Expected:
- state ends at `ready`
- context summary present
- events include `booting -> hydrating_context -> ready`

**Step 2: Complete a text turn**
Call `POST /api/voice/sessions/[id]/complete-turn`.
Expected:
- user turn stored
- assistant turn stored
- state returns to `awaiting_user`

**Step 3: Switch context**
Call `POST /api/voice/sessions/[id]/context-switch` to `sales_support`.
Expected:
- state passes through `switching_context`
- profile/bindings/context summary updated
- system event/turn recorded

**Step 4: Read event log**
Call `GET /api/voice/sessions/[id]/events`.
Expected:
- chronological trace exists

**Step 5: End session**
Later route or internal service call should mark `completed` cleanly.

Run: `npm run build`
Expected: pass.

---

## Phase 8 — frontend only after backend is trustworthy

### Task 15: Add minimal operator/debug UI
**Objective:** Start with a developer/operator screen, not the polished call UI.

**Files:**
- Later create: `app/voice/page.tsx` or account-level panel

**Step 1: Add profile buttons**
Render from `GET /api/voice/profiles`, never hardcoded.

**Step 2: Add session inspector**
Show state, context summary, recent turns, event log.

**Step 3: Add manual text-turn box**
This validates the backend loop before microphone streaming.

**Step 4: Add mic/WebRTC later**
Only after text-mode lifecycle is stable.

---

## Recommended implementation order in plain English

1. Add DB tables.
2. Add types.
3. Add store helpers.
4. Add state machine.
5. Add hook registry.
6. Add context source loaders.
7. Add context router.
8. Add voice service orchestration.
9. Add protected API routes.
10. Test the full lifecycle in text-mode.
11. Only then add frontend buttons.
12. Only after that add live audio transport.

---

## Explicit decisions for MVP

### Do now
- fixed voice profiles in DB
- backend-managed state machine
- backend hook pipeline
- context hydration from Mission Control sources
- text-only turn completion route as backend proving ground
- event log for debugging

### Do not do yet
- Telegram-native live calling
- browser audio streaming UI
- complex interruption/barging logic
- generalized workflow builder
- provider-specific optimizations
- cross-session summary generation beyond simple stubs

---

## Open technical questions to resolve during implementation

1. Should `sales_support` and `luma` map to one bound account each, or to a broader source set plus last-active thread memory?
2. Will assistant turn generation call Hermes via subprocess/API bridge, or a lightweight internal provider stub first?
3. Should Telegram thread hydration be phase 2 via a separate adapter table (`telegram_chat_id`, `thread_id`), not phase 1?
4. Do we want a `voice_session_snapshots` table later for compact summaries every N turns?

For MVP, answer them conservatively:
- fixed account/profile bindings first
- text-only assistant stub or simple bridge first
- Telegram hydration later
- snapshots later

---

## Acceptance criteria for backend completion

Backend phase is done when:
- voice profiles are persisted and listable
- a session can be created for `main`, `sales_support`, `luma`, and `fitness`
- session lifecycle follows the state machine
- context hydration produces a non-empty structured summary
- a text turn can be completed end-to-end
- a context switch can be executed during a session
- all key lifecycle steps appear in the event log
- no frontend hardcodes business context
- `npm run build` passes

---

## Suggested first commit sequence

1. `feat: add voice session schema and seed profiles`
2. `feat: add voice domain types and store helpers`
3. `feat: add voice state machine and hook registry`
4. `feat: add voice context router and source loaders`
5. `feat: add voice service orchestration and api routes`
6. `feat: add voice backend verification screen`

---

## Handoff note

This feature should be built as **backend orchestration first, frontend shell second, audio transport third**. If that order is respected, the eventual Mission Control call buttons become simple consumers of a stable system instead of hiding state bugs behind glossy UI.
