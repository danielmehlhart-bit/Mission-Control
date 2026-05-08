# Prompt — Generate `03_business_logic.md`

Use this prompt to generate the next Mission Control Voice Rebuild spec file accurately.

---

## Task

Create the file:

`/home/hartner/mission-control/docs/mission-control-voice-rebuild/03_business_logic.md`

This file is the **Business Logic Spec** for Mission Control Voice Rebuild V1.

Use the existing source documents:

1. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/01-big-picture-vision.md`
2. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/02-extraction.md`
3. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/03-open-questions.md`

Important naming note: Daniel may refer to `02_open_questions.md`, but the current questions file is actually `03-open-questions.md`.

---

## Goal

Turn the resolved questions and extracted requirements into a precise **business logic layer** for Mission Control Voice V1.

Do **not** implement code.  
Do **not** design frontend screens in detail.  
Do **not** write the state machine spec yet.  
This document should define the rules that the later state machine, backend, context router, tools, and UI must obey.

---

## Required output structure

Write `03_business_logic.md` with this structure:

```markdown
# Mission Control Voice Rebuild — 03 Business Logic

**Status:** Draft zur Durchsicht  
**Quelle:** `01-big-picture-vision.md`, `02-extraction.md`, `03-open-questions.md`  
**Zweck:** Business-Regeln für Mission Control Voice V1 definieren.

---

## 1. Scope of V1

## 2. Core Entities and Concepts

## 3. Profile Selection Logic

## 4. Telegram Context Logic

## 5. Context Retrieval Logic

## 6. Intent Classification Logic

## 7. Research Logic

## 8. Call Conversation Logic

## 9. Work Order Logic

## 10. Call-End Logic

## 11. Telegram Handoff Logic

## 12. Source and Evidence Logic

## 13. Safety and Side-Effect Logic

## 14. Assumptions

## 15. New Open Questions

## 16. Acceptance Criteria
```

You may add subheadings where useful, but keep this top-level structure.

---

## Resolved decisions that must be reflected

Use these decisions from `03-open-questions.md` as binding for V1:

1. V1 must include **Research**, **Telegram context**, and **Call Handoff**.
2. V1 profiles are:
   - `main` / Hauptchat / Hermes
   - `sales_support`
   - `luma`
3. Telegram is **not primarily its own V1 profile**. It is a **context source for all profiles**.
4. Hands-free automatic listening/speaking is required for the target MVP.
5. Required V1 context sources:
   - current Telegram session
   - recent Telegram messages
   - Daily Logs
   - Hermes Session Search
   - Mission-Control-Memory
6. Standard retrieval window is **current day** unless Daniel explicitly asks for older context.
7. The selected voice profile determines the primary Telegram context automatically.
8. After every call, artifacts must be created with:
   - decisions
   - produces / created or triggered outputs
   - date/time
   - topic/tags
9. Intent classification is required.
10. A short search phrase like **„Ich schau kurz nach.“** is accepted.
11. Web Research may use:
   - Web Search
   - Perplexity
12. Research should prefer:
   - German Leitmedien / large publishers
   - public broadcasters like Tagesschau / ARD / ZDF
   - for US/international topics: major American / international outlets
13. Voice answers should include only a short source mention, e.g.:
   - „Nachgeschaut bei tagesschau.de und CNN.“
14. Direct source links should be available afterward for verification.
15. Call end must create:
   - transcript
   - summary artifact
   - memory entry
   - Telegram handoff
16. Hermes may create files/tasks when Daniel clearly instructs it.
17. Unclear or external/irreversible side effects should become draft / needs-review.
18. Mobile Call UI should remain minimal, max. about 4–5 main buttons, including Mute.
19. Live transcript is not primary UI, but must be stored.
20. Daniel wants to interrupt Hermes by speaking over it.
21. OpenAI Realtime is acceptable/good as the primary voice technology direction.
22. Long tool tasks should be handled pragmatically:
   - short retrieval/research synchronously in-call
   - longer tasks asynchronously as Work Orders with handoff
23. There are no hard content limits for Voice Context, but relevance / need-to-know prioritization remains required.

---

## Business logic requirements

The spec must define concrete rules for:

### Profile selection

- What happens when Daniel starts a call from `main`, `sales_support`, or `luma`.
- How the selected profile determines default context sources.
- How profile mismatch or out-of-profile questions should be handled.

### Telegram context

Define the intended V1 behavior for a **Telegram Context Bridge**:

- profile → Telegram chat/topic mapping
- current/recent message lookup
- fresh context via Hermes Session Search
- durable context via Mission-Control-Memory / Daily Logs
- fallback behavior if no Telegram context is found

### Retrieval

Define the difference between:

- current-day default retrieval
- explicit historical retrieval
- profile-bound retrieval
- cross-profile retrieval
- missing context handling

### Intent classification

Use at least these intent classes:

- `normal_conversation`
- `context_retrieval`
- `telegram_context_retrieval`
- `mission_control_lookup`
- `web_research`
- `work_order`
- `clarification`

For each intent, define:

- trigger examples
- expected behavior
- output style
- whether tools/context are required

### Research

Define business rules for:

- when to use Web Search
- when to use Perplexity
- source priority
- short spoken source mentions
- storing direct links for later
- uncertainty handling

### Work Orders

Define the Work Order lifecycle:

- `drafted`
- `queued`
- `running`
- `needs_review`
- `completed`
- `failed`

Define when a voice request becomes a Work Order, and what fields it must store.

### Call end

Define the mandatory call-end pipeline:

1. store transcript
2. create summary artifact
3. create memory entry
4. extract decisions
5. extract produces / outputs
6. assign topic/tags
7. set Telegram handoff reference
8. expose direct links / artifacts for follow-up

### Telegram handoff

Define how Telegram can later refer to the just-ended call:

- `voice_session_id`
- profile/chat binding
- `memory_path`
- topic/tags
- time proximity

### Side effects

Define what Hermes may do automatically and what requires review.

Use this baseline:

- internal files/specs/summaries/draft tasks may be created if Daniel clearly asks
- external irreversible actions require explicit confirmation
- unclear requests become drafts or questions

---

## Assumptions policy

Create a dedicated `## 14. Assumptions` section.

Every assumption must be explicit and formatted like:

```markdown
- **A01:** Assumption text.  
  **Reason:** Why this assumption is needed.  
  **Risk if wrong:** What breaks if this is wrong.
```

Do not hide assumptions inside prose.

---

## New unknowns policy

If you discover an unknown while writing the Business Logic Spec:

1. Add it to `## 15. New Open Questions` inside `03_business_logic.md`.
2. Also update `/home/hartner/mission-control/docs/mission-control-voice-rebuild/03-open-questions.md` with a new section:

```markdown
## 10. New Questions from Business Logic Spec

### Q27 — ...
...
```

Continue numbering from the existing Q01–Q26.

Only add genuinely blocking or meaningful questions. Do not invent fake questions.

---

## Quality bar

The generated `03_business_logic.md` must be:

- specific enough that a later State Machine Spec can be derived from it
- not implementation-heavy
- not frontend-heavy
- grounded in the resolved decisions
- explicit about assumptions
- clear about what happens when context is missing
- clear about when Hermes may act vs. when it must ask / draft / defer

---

## Stop condition

After writing `03_business_logic.md` and updating `03-open-questions.md` if needed:

1. Verify both files exist and are non-empty.
2. Stop.
3. Report only:
   - created/updated file paths
   - whether new questions were added
   - any assumptions count

Do not paste the full file contents unless Daniel asks.
