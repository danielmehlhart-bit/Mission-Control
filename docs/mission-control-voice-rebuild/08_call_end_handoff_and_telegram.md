# Mission Control Voice Rebuild — 08 Call-End Handoff & Telegram

**Status:** Draft for Fixblock V2  
**Source:** Manual QA after Call Mode V1 deploy; TC10 partial pass  
**Purpose:** Turn “Handoff bereit” from a static label into a verifiable call-end artifact and optional Telegram handoff flow.

---

## 1. Problem Statement

Call Mode V1 currently completes sessions and writes a `VOICE_CALL_MEMORY_V1` memory summary. The UI then shows:

> Handoff bereit

However, Daniel cannot verify what exactly is ready, where it is stored, whether it was posted to Telegram, or what decisions/outputs/work orders came out of the call.

For trust, “Handoff bereit” must become a concrete object/action, not just a message.

---

## 2. Product Goal

At call end, Mission Control should prepare a compact, verifiable handoff package:

- transcript summary
- decisions
- produces / requested outputs
- work orders created during the call
- tags/topic
- memory path
- Telegram target based on profile
- optional action to post/open/send to Telegram

For V2, the minimum goal is:

> The UI clearly shows what was prepared and what was or was not sent.

---

## 3. Current State

Implemented:

- session state transitions to `completed`
- `VOICE_CALL_MEMORY_V1` memory summary written through `/memory-summary`
- event `voice.memory_summary_written`
- UI static message “Handoff bereit”
- Telegram profile bindings exist for `sales_support` and `luma` handoff URLs

Not fully implemented:

- structured handoff object
- explicit `voice.handoff_prepared` event
- decisions / produces / tags extraction
- actual Telegram send action
- visible memory path / handoff details in UI
- clear distinction between “prepared” and “sent”

---

## 4. Handoff States

Use explicit handoff states, separate from voice session lifecycle.

| State | Meaning |
|---|---|
| `not_started` | call still active or no handoff requested |
| `preparing` | memory summary / extraction is running |
| `prepared` | handoff package exists locally |
| `send_pending_confirmation` | Telegram send available but needs Daniel confirmation |
| `sent` | Telegram message posted successfully |
| `failed` | preparation or send failed |
| `not_supported` | target/action unavailable |

For Fixblock V2, `prepared` is required; `sent` is optional only if a real Telegram send path is safe and available.

---

## 5. Handoff Package Model

Recommended table:

```sql
CREATE TABLE IF NOT EXISTS voice_handoffs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  profile_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared',
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  memory_path TEXT,
  telegram_chat_id TEXT,
  telegram_thread_id TEXT,
  telegram_url TEXT,
  decisions_json TEXT NOT NULL DEFAULT '[]',
  produces_json TEXT NOT NULL DEFAULT '[]',
  work_order_ids_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  payload_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);
```

Recommended indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_voice_handoffs_session_created
  ON voice_handoffs(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_handoffs_status_created
  ON voice_handoffs(status, created_at DESC);
```

Alternative: If Codex judges a new table too heavy for V2, a serialized `handoff` object in the response/UI is acceptable only if events and memory path are still persisted. Prefer the table.

---

## 6. Handoff Content

### Required fields

- `title`
- `summary`
- `memoryPath`
- `profileSlug`
- `sessionId`
- `telegramTarget` if known
- `workOrderIds`
- `status`

### Best-effort fields

- `decisions`
- `produces`
- `tags`
- `transcriptExcerpt`

### Extraction Rules

V2 extraction can be heuristic and conservative.

- If no clear decisions exist, store `[]` and show “Keine expliziten Entscheidungen erkannt.”
- If no produces exist, store work orders and requested outputs only.
- Do not invent decisions.
- Do not invent sent status.

---

## 7. Telegram Binding Rules

Profile bindings from previous specs:

| Profile | Telegram target |
|---|---|
| `main` | Daniel DM `485318478` |
| `sales_support` | Chat `-1003998265477`, Topic/Message `23`, URL `https://t.me/c/3998265477/23` |
| `luma` | Chat `-1003998265477`, Topic/Message `24`, URL `https://t.me/c/3998265477/24` |

### Main profile

For `main`, direct Telegram DM send may be technically possible from Hermes outside Mission Control, but Mission Control V2 should not assume it can send unless a send integration exists.

### Sales/LUMA topics

The UI can safely show an “Open Telegram” deep link if a `handoffUrl` exists. It must not claim posting happened unless a send API succeeded.

---

## 8. Send vs Open vs Prepared

Distinguish three actions:

1. **Prepared**  
   Handoff package exists in Mission Control. No Telegram side effect.

2. **Open Telegram**  
   UI opens the relevant Telegram topic URL. Still no post was sent by the system.

3. **Send to Telegram**  
   System posts a formatted handoff message through a real Telegram-send capability. Requires success event.

For Fixblock V2, acceptable implementation:

- Always prepare handoff.
- Show `Open Telegram` link where available.
- Only implement actual send if the repo already has a safe, authenticated send path. Otherwise mark as not supported and do not claim sent.

---

## 9. API Surface

Recommended service/module:

- `lib/voice/handoffs.ts`

Functions:

```ts
prepareVoiceHandoff(input): VoiceHandoff
getVoiceHandoffForSession(sessionId): VoiceHandoff | null
serializeVoiceHandoff(handoff): SerializedVoiceHandoff
sendVoiceHandoffToTelegram(input): VoiceHandoff // optional, only with real send path
```

Routes:

- `POST /api/voice/sessions/[id]/handoff`
- `GET /api/voice/sessions/[id]/handoff`
- optional: `POST /api/voice/sessions/[id]/handoff/telegram-send`

The existing call-end flow should trigger preparation after session end or as part of the existing `memory-summary` call.

---

## 10. Events

Required events:

| Event | When |
|---|---|
| `voice.handoff_prepare_started` | preparation starts |
| `voice.handoff_prepared` | handoff package persisted |
| `voice.handoff_prepare_failed` | preparation fails |
| `voice.telegram_handoff_opened` | optional UI event if tracked |
| `voice.telegram_handoff_send_started` | actual send starts |
| `voice.telegram_handoff_sent` | actual send succeeds |
| `voice.telegram_handoff_failed` | actual send fails |

The UI should rely on persisted status/events, not optimistic copy.

---

## 11. UI Requirements

Replace static block:

```text
Handoff bereit
Die aktuelle Implementierung schreibt den Call als VOICE_CALL_MEMORY_V1...
```

With structured state:

```text
Handoff bereit
Memory: mem:2026-05-08.md
Work Orders: 1
Telegram: LUMA Telegram öffnen
Status: vorbereitet, nicht gesendet
```

If no actual send exists:

```text
Telegram-Handoff vorbereitet. Automatisches Senden ist in dieser Version noch nicht aktiv.
```

If send exists and succeeds:

```text
Telegram-Handoff gesendet · LUMA Telegram
```

---

## 12. Call-End Pipeline

Target V2 flow:

1. Daniel ends call.
2. UI stops mic/audio.
3. API marks session `completed`.
4. Memory summary is written.
5. Handoff package is prepared and persisted.
6. Work orders for session are attached to handoff.
7. UI reloads session detail and displays handoff details.
8. Optional: Daniel taps `Open Telegram` or `Send to Telegram` if available.

Important: Step 5 must not be a silent best-effort if the UI says “ready”. If preparation fails, the UI must say so.

---

## 13. Acceptance Criteria

1. Ending a call creates a verifiable handoff package or a clear failure state.
2. The UI shows memory path and whether Telegram was merely opened/prepared/sent.
3. Work orders created during the call appear in the handoff section.
4. `voice.handoff_prepared` is persisted on success.
5. `voice.telegram_handoff_sent` is only emitted after a real send succeeds.
6. Hermes does not claim a Telegram post happened without the send event.
7. TC10 can be retested as green when Daniel can verify the handoff package and its status.

---

## 14. Implementation Notes for Codex

Likely files:

- `lib/db.ts`
- `lib/voice/handoffs.ts` new
- `lib/voice/service.ts`
- `lib/voice/session-store.ts`
- `lib/voice/call-mode.ts`
- `app/api/voice/sessions/[id]/handoff/route.ts` new
- optional `app/api/voice/sessions/[id]/handoff/telegram-send/route.ts`
- `components/voice/voice-console.tsx`
- `tests/voice/*.test.ts*`

Do not expose raw `resolvedContext`. Do not add secrets to docs or logs. If actual Telegram send requires credentials not already present, implement prepared/open-only flow and mark send as `not_supported`.
