# Mission Control Voice Rebuild — 06 Capability Truth & Guardrails

**Status:** Draft for Fixblock V2  
**Source:** Manual QA after Call Mode V1 deploy; TC06–TC10 feedback  
**Purpose:** Make Voice honest about what it can actually do, especially for side effects such as documents, Telegram posts, work orders, and research.

---

## 1. Problem Statement

In Call Mode V1, Hermes can conduct a voice call, retrieve grounded memory/context, persist transcripts, and write a call memory summary. However, during manual QA Daniel observed a critical trust issue:

- Hermes sometimes says it will do something later, e.g. create a document or send a Telegram ping.
- The current implementation does not always have a real tool/API/event path for that side effect.
- This creates a false promise: Daniel hears a commitment, but no artifact or message appears afterward.

This is not primarily a UI issue. It is a **capability truth** issue.

The voice agent must only claim capabilities that are actually available in the current runtime. If a capability is missing, it must say so clearly and offer the nearest safe fallback.

---

## 2. QA Evidence

### TC06 — Barge-in

**Result:** Green.  
The current implementation can be treated as passing when Hermes stops/cancels active response and returns to listening. The code uses OpenAI Realtime `interrupt_response: true` plus explicit `response.cancel` on `input_audio_buffer.speech_started`.

### TC07 — Context Retrieval

**Result:** Green.  
The production DB shows `voice.tool_call_started` / `voice.tool_call_completed` events for memory tools. Hermes can ground answers through `hermes_memory_search` and `hermes_memory_read`.

### TC08 — Live Research

**Result:** Yellow / expected limitation.  
Hermes says it cannot do full live research yet and does not fake it. That is correct current behavior.

Current realtime tools:

- `hermes_memory_search`
- `hermes_memory_read`

Not currently available:

- web search
- Perplexity
- browser-backed source lookup
- current news retrieval

### TC09 — Work Orders / Documents / Later Outputs

**Result:** Red.  
Hermes may verbally promise that it will build or send something, but the runtime lacks a real work-order/artifact execution path.

### TC10 — Call-End Handoff

**Result:** Yellow.  
The session becomes `completed` and a `VOICE_CALL_MEMORY_V1` summary is written, but the UI message `Handoff bereit` is not yet a verifiable Telegram handoff or structured artifact pipeline.

---

## 3. Capability Classes

Every voice response involving an action must fall into one of these classes.

| Class | Meaning | Hermes may say |
|---|---|---|
| Available | Tool/API exists and can be called now | “Ich mache das jetzt.” only after calling or while calling the tool |
| Available but gated | Tool exists but requires Daniel confirmation | “Ich bereite es als Entwurf vor / soll ich es senden?” |
| Persisted work order | Long task can be stored as a work order | “Ich lege dafür einen Auftrag an.” only if persisted successfully |
| Not implemented | No runtime path exists | “Das kann ich aus dem Call heraus noch nicht direkt.” |
| Failed | Tool/API attempted but failed | “Ich konnte es gerade nicht ausführen; Fehler kurz: …” |

The voice agent must never treat “planned in spec” as “available in runtime”.

---

## 4. Current Capability Matrix

| Capability | Current status | Allowed behavior |
|---|---|---|
| Natural voice call | Available | Normal spoken conversation |
| Barge-in | Available enough for V1 | Stop/cancel active response and listen |
| Mute flag | Available | Muted overlay, no user turns while muted |
| Memory/context retrieval | Available | Use `hermes_memory_search` / `hermes_memory_read` |
| Reading current Telegram live history | Limited | Only if synchronized into recent context or memory |
| Live web/news research | Not implemented | Say it cannot do live research yet; do not invent |
| Create document/artifact | Not implemented until Work Orders exist | Do not claim creation; offer work-order fallback after V2 |
| Send Telegram message | Not implemented from Voice V1 | Do not claim sending; offer handoff/deep link/future action |
| Call memory summary | Available | Persist `VOICE_CALL_MEMORY_V1` summary |
| Structured decisions/produces/tags | Not fully implemented | Do not claim complete structured extraction unless stored |
| Telegram handoff posting | Not implemented | Show handoff readiness only; no “posted” claim |

---

## 5. Forbidden Claims

Hermes must not say these unless the corresponding tool/API completed successfully:

- “Ich schicke dir das jetzt auf Telegram.”
- “Ich habe dir den Ping geschickt.”
- “Ich erstelle dir das Dokument und schicke dir nachher den Link.”
- “Ich habe ein Review-Dokument erstellt.”
- “Ich poste das in den LUMA-Chat.”
- “Ich recherchiere live im Web.” when no research tool is connected.
- “Ich habe Quellen geprüft.” unless a real research/source tool returned sources.
- “Der Handoff ist in Telegram angekommen.” unless an event such as `voice.telegram_handoff_sent` exists.

---

## 6. Required Safe Fallback Language

### 6.1 Missing Telegram send capability

Use:

> “Direkt aus dem Voice Call kann ich noch nicht in Telegram posten. Ich kann den Handoff hier vorbereiten, damit du ihn danach übernehmen kannst.”

After V2 handoff tooling exists, use:

> “Ich bereite den Telegram-Handoff vor. Senden mache ich erst, wenn du es bestätigst.”

### 6.2 Missing document/artifact capability

Before Work Orders are implemented:

> “Ein Dokument kann ich aus dem Call heraus noch nicht automatisch erstellen. Ich kann dir die Struktur jetzt zusammenfassen.”

After Work Orders are implemented:

> “Ich lege dafür einen Work Order an und hänge ihn an diesen Call.”

Only after persistence succeeds:

> “Der Work Order ist angelegt.”

### 6.3 Missing live research

Use:

> “Live-Web-Recherche kann ich in diesem Voice Call noch nicht. Ich kann nur Memory und vorhandenen Kontext prüfen und sage klar, wenn ich nichts Belegtes finde.”

### 6.4 Tool failure

Use:

> “Ich wollte das gerade ausführen, aber der Tool-Schritt ist fehlgeschlagen. Ich habe es nicht erledigt.”

Never hide failures behind confident completion language.

---

## 7. Side-Effect Rule

A side effect is any action that changes state outside the spoken call:

- creating a work order
- creating a document
- sending a Telegram message
- posting to a topic
- creating/updating a task
- writing a structured artifact
- scheduling a later job

Rule:

> Hermes may only claim a side effect has happened if the side-effect tool returned success and a corresponding persisted event exists.

Required event examples:

- `voice.work_order_created`
- `voice.artifact_created`
- `voice.telegram_handoff_sent`
- `voice.telegram_handoff_failed`
- `voice.side_effect_blocked`

---

## 8. Runtime Guardrail Requirements

### 8.1 Instructions guardrail

Update realtime instructions so Hermes knows the available tool set at runtime.

The system instructions should include a compact capability block:

```text
Current voice tools available: hermes_memory_search, hermes_memory_read, voice_create_work_order?, voice_prepare_handoff?, voice_send_telegram_handoff?
If a requested action has no available tool, say clearly that you cannot do it from the voice call yet.
Never claim to have sent, created, posted, scheduled, or researched something unless a tool call succeeded.
```

### 8.2 Tool availability should be explicit

The realtime instruction builder should not hardcode future capabilities as available. It should derive available capabilities from registered tool definitions or a shared capability registry.

Recommended module:

- `lib/voice/capabilities.ts`

Suggested shape:

```ts
export type VoiceCapabilityStatus = "available" | "not_implemented" | "gated";

export type VoiceCapability = {
  key: string;
  label: string;
  status: VoiceCapabilityStatus;
  toolName?: string;
  safeFallback: string;
};
```

### 8.3 Response-level guardrail

For V2, a prompt/instruction guard may be enough. Longer term, if tool calls return structured results, the voice tool execution route can also validate that side-effect claims only appear after a side-effect event.

---

## 9. Acceptance Criteria

1. If Daniel asks “Schick mir einen Ping auf Telegram”, Hermes does **not** claim it was sent unless a real send tool succeeds.
2. If Daniel asks “Erstelle mir daraus ein Dokument”, Hermes either creates a real work order or says the capability is not implemented.
3. If Daniel asks for live research before research tools exist, Hermes says it cannot do live web research and does not invent sources.
4. The realtime instruction text contains an explicit capability truth guardrail.
5. Tests cover at least one missing-side-effect prompt and assert that the resulting instructions forbid false completion claims.
6. Manual QA for TC09 no longer produces false promises.

---

## 10. Implementation Notes for Codex

Relevant current files:

- `lib/voice/realtime.ts`
- `lib/voice/tools.ts`
- `components/voice/voice-console.tsx`
- `app/api/voice/sessions/[id]/tools/execute/route.ts`
- `tests/voice/*.test.ts*`

Do not implement research in this spec. Do not add external dependencies for this guardrail iteration unless absolutely necessary.
