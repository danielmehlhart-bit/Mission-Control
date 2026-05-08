# Mission Control Voice Rebuild — 07 Work Orders & Artifacts

**Status:** Draft for Fixblock V2  
**Source:** Manual QA after Call Mode V1 deploy; TC09 failure  
**Purpose:** Define the product and technical model for turning longer voice requests into persisted work orders instead of fake promises.

---

## 1. Problem Statement

Daniel wants to say things like:

- “Mach mir daraus ein Review-Dokument.”
- “Bereite mir einen Follow-up-Text vor.”
- “Bau daraus eine Aufgabe.”
- “Schick mir danach den Link.”

In V1, Hermes can discuss these requests but cannot reliably execute them after the call. The safe V2 solution is a persisted **Voice Work Order**.

A work order is not the final output itself. It is a verifiable, stored instruction packet that can later be executed by Hermes/Codex/cron/manual workflow.

---

## 2. Product Goal

When Daniel asks for a longer output during a voice call, Hermes should:

1. classify the request as a work-order intent,
2. capture the goal and relevant context,
3. persist a work order linked to the voice session,
4. confirm briefly in voice,
5. show the work order in the call-end handoff.

The core trust rule:

> It is better to say “Work Order angelegt” than to falsely say “Dokument fertig”.

---

## 3. Scope for Fixblock V2

### In scope

- DB-backed work-order model
- API route to create/list work orders for a voice session
- Realtime tool callable by Voice: `voice_create_work_order`
- UI display after call end: number/list of created work orders
- Events for creation/failure
- Tests around persistence and voice tool execution
- Guardrail integration so Hermes uses work orders for long tasks

### Out of scope for this block

- Fully autonomous execution of work orders
- Creating final documents/files from work orders
- Sending completed outputs to Telegram
- Scheduling cron jobs automatically
- Web research integration

These can be later iterations.

---

## 4. Work Order Intent Criteria

Create a work order when Daniel asks for something that is:

- longer than a normal spoken answer,
- requires a deliverable after the call,
- should be visible/persistent later,
- involves document creation, structured review, task creation, email draft, artifact generation, or follow-up package,
- cannot be completed safely inside a short voice response.

Examples:

| User asks | Work order? | Notes |
|---|---:|---|
| “Fass mir das kurz zusammen” | No | spoken answer enough |
| “Erstelle daraus ein ausführliches Review-Dokument” | Yes | artifact-style output |
| “Schick mir nachher einen Link” | Yes, but do not claim link exists | link only after later execution |
| “Mach daraus eine Aufgabe” | Yes or gated task creation | task side effect may require confirmation |
| “Poste das in Telegram” | Handoff/send flow, not generic work order | see spec 08 |
| “Recherchiere das live” | Not this work order unless research is unavailable and user wants later research | research spec later |

---

## 5. Data Model

Add table in `lib/db.ts`:

```sql
CREATE TABLE IF NOT EXISTS voice_work_orders (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  profile_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  requested_output TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  priority TEXT NOT NULL DEFAULT 'normal',
  source_turn_id TEXT,
  context_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
```

Recommended indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_voice_work_orders_session_created
  ON voice_work_orders(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_work_orders_status_created
  ON voice_work_orders(status, created_at DESC);
```

### Status values

| Status | Meaning |
|---|---|
| `created` | captured from voice, not executed yet |
| `queued` | ready for later autonomous/manual execution |
| `running` | execution started |
| `done` | result exists |
| `failed` | execution failed |
| `cancelled` | Daniel or system cancelled |

For V2, `created` is enough as default.

---

## 6. Work Order Payload

A work order should contain enough context to be useful later, but not raw unbounded session context.

Required fields:

- `title`: short human-readable label
- `goal`: what Daniel wants
- `requestedOutput`: e.g. `review_document`, `telegram_draft`, `email_draft`, `task`, `summary`, `unknown`
- `sessionId`
- `profileSlug`
- `sourceTurnId` if known
- recent transcript excerpt
- latest assistant response if relevant
- relevant Memory/Telegram/source references if known

Suggested `context_json`:

```json
{
  "voiceSessionId": "vs_...",
  "profileSlug": "luma",
  "createdFrom": "voice_call",
  "sourceUserText": "Erstelle mir daraus bitte ein ausführliches Review-Dokument...",
  "recentTranscript": [
    { "speaker": "user", "text": "..." },
    { "speaker": "assistant", "text": "..." }
  ],
  "handoffTarget": {
    "type": "telegram",
    "chatId": "-1003998265477",
    "threadId": "24"
  }
}
```

---

## 7. Service/API Surface

### Service functions

Create or extend a module such as:

- `lib/voice/work-orders.ts`

Recommended functions:

```ts
createVoiceWorkOrder(input): VoiceWorkOrder
listVoiceWorkOrdersForSession(sessionId): VoiceWorkOrder[]
updateVoiceWorkOrderStatus(input): VoiceWorkOrder
serializeVoiceWorkOrder(order): SerializedVoiceWorkOrder
```

### API routes

Recommended routes:

- `POST /api/voice/sessions/[id]/work-orders`
- `GET /api/voice/sessions/[id]/work-orders`

The POST route must validate explicit fields and must not spread arbitrary request bodies into DB writes.

### Realtime tool

Add tool definition:

- `voice_create_work_order`

Suggested schema:

```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "goal": { "type": "string" },
    "requestedOutput": {
      "type": "string",
      "enum": ["review_document", "telegram_draft", "email_draft", "task", "summary", "other"]
    },
    "priority": {
      "type": "string",
      "enum": ["low", "normal", "high"]
    }
  },
  "required": ["title", "goal", "requestedOutput"],
  "additionalProperties": false
}
```

Tool result should include:

```json
{
  "tool": "voice_create_work_order",
  "created": true,
  "workOrderId": "vwo_...",
  "status": "created",
  "title": "..."
}
```

---

## 8. Events

Emit events for observability:

| Event | When |
|---|---|
| `voice.work_order_create_started` | tool/API request accepted |
| `voice.work_order_created` | row persisted successfully |
| `voice.work_order_create_failed` | validation/persistence failed |
| `voice.work_order_status_changed` | later status transitions |

The voice agent may only say “Work Order angelegt” after `voice.work_order_created` exists.

---

## 9. UI Requirements

### During call

Daniel does not need a heavy status UI.

Allowed:

- short spoken confirmation
- optional one-line status: “Work Order angelegt”

Not needed:

- detailed queue progress during call
- complex task board

### After call end

The Handoff section should show:

- `1 Work Order angelegt`
- title(s)
- status (`created`)
- possibly a details button

Example:

```text
Handoff bereit
1 Work Order angelegt:
• Review-Dokument aus Voice Call — created
```

---

## 10. Guardrail Integration

Update realtime instructions:

- For long deliverable requests, call `voice_create_work_order` if available.
- If the tool succeeds, say the work order was created.
- If the tool fails, say it was not created.
- Do not say a document/file/link exists unless a later artifact execution path produced it.

---

## 11. Acceptance Criteria

1. Asking “Erstelle mir daraus ein Dokument” creates a persisted `voice_work_orders` row.
2. The session detail API can return/list work orders for the session without exposing raw internal context.
3. A `voice.work_order_created` event is recorded.
4. The call-end UI displays created work orders.
5. Hermes no longer claims a final document/link exists in the same turn.
6. Tests cover create/list and realtime tool execution.
7. TC09 can be retested as green if a work order is created and visible after call end.

---

## 12. Implementation Notes for Codex

Relevant files likely to change:

- `lib/db.ts`
- `lib/voice/types.ts`
- `lib/voice/tools.ts`
- `lib/voice/service.ts` only if session helpers are needed
- `lib/voice/work-orders.ts` new
- `app/api/voice/sessions/[id]/work-orders/route.ts` new
- `app/api/voice/sessions/[id]/tools/execute/route.ts`
- `components/voice/voice-console.tsx`
- `tests/voice/*.test.ts*`

Keep V2 simple. Persist the order; do not try to execute it yet.
