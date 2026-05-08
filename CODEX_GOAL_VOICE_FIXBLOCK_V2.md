# Codex Goal Prompt — Mission Control Voice Fixblock V2

Use this with Codex CLI `/goal` or equivalent execution.

```text
You are working in the Mission Control repository.

Repository path:
/home/hartner/mission-control

Read these files first, in this order:

1. /home/hartner/mission-control/AGENTS.md
2. /home/hartner/mission-control/knowledge.md
3. /home/hartner/mission-control/docs/mission-control-voice-rebuild/01-big-picture-vision.md
4. /home/hartner/mission-control/docs/mission-control-voice-rebuild/02-extraction.md
5. /home/hartner/mission-control/docs/mission-control-voice-rebuild/03-open-questions.md
6. /home/hartner/mission-control/docs/mission-control-voice-rebuild/03_business_logic.md
7. /home/hartner/mission-control/docs/mission-control-voice-rebuild/04_state_machine.md
8. /home/hartner/mission-control/docs/mission-control-voice-rebuild/05_frontend_call_ux.md
9. /home/hartner/mission-control/docs/mission-control-voice-rebuild/06_capability_truth_and_guardrails.md
10. /home/hartner/mission-control/docs/mission-control-voice-rebuild/07_work_orders_and_artifacts.md
11. /home/hartner/mission-control/docs/mission-control-voice-rebuild/08_call_end_handoff_and_telegram.md

Goal:
Implement Mission Control Voice Fixblock V2: make voice side effects honest, add persisted voice work orders, and replace the static call-end handoff with a verifiable prepared handoff package.

Background:
Call Mode V1 is deployed and manual QA found:
- TC06 Barge-in: green.
- TC07 Context retrieval: green.
- TC08 Research: correctly says live research is not available; do not implement research in this block.
- TC09 Work Order / document promise: red, because Hermes can promise documents/messages without a real tool path.
- TC10 Handoff: yellow, because session completion + VOICE_CALL_MEMORY_V1 summary exists, but “Handoff bereit” is currently just a static UI message and not a structured/verifiable handoff.

Hard constraints:
- Do not change auth unless absolutely required and justified.
- Do not add secrets, tokens, hostnames, IPs, or credentials to files or output.
- Do not implement live web research in this block.
- Do not claim Telegram send capability unless a real existing safe send path is present and tested.
- Do not expose raw resolvedContext, baseSessionKey, provider errors, or sensitive payloads in public API responses.
- Keep all new POST routes validating explicit fields. Do not use arbitrary `...body` spreads into persistence.
- Follow AGENTS.md: DB first for new entities, protected API route conventions, dark/mobile UI conventions.

Implementation scope:

A) Capability truth / guardrails
- Add a small capability registry, likely `lib/voice/capabilities.ts`, or an equivalent clean mechanism.
- Update realtime instructions in `lib/voice/realtime.ts` so Hermes knows exactly what tools/capabilities are available.
- Explicitly forbid false completion claims: no “I sent it”, “I created the document”, “I posted to Telegram”, “I researched live” unless the corresponding tool/API succeeded.
- The current live research behavior should remain honest: if no web/research tool exists, Hermes must say it cannot do live research yet.

B) Voice work orders
- Add DB schema in `lib/db.ts` for `voice_work_orders` as described in `07_work_orders_and_artifacts.md`, with useful indexes and update handling.
- Add types/serialization as needed.
- Add a module such as `lib/voice/work-orders.ts` with create/list/status helpers.
- Add API route(s):
  - `POST /api/voice/sessions/[id]/work-orders`
  - `GET /api/voice/sessions/[id]/work-orders`
- Add realtime tool `voice_create_work_order` to the voice tool registry and execution path.
- Tool result must be structured and truthful. Hermes may only say the work order was created after persistence succeeds.
- V2 only needs to persist work orders; it does not need to execute them into finished docs.

C) Call-end handoff
- Add DB schema in `lib/db.ts` for `voice_handoffs` as described in `08_call_end_handoff_and_telegram.md`, unless you can justify a simpler persisted approach that still satisfies the acceptance criteria.
- Add module such as `lib/voice/handoffs.ts` with:
  - prepare handoff for session
  - get handoff for session
  - serialize handoff
  - optional send-to-Telegram only if a safe existing send path exists
- The handoff must include at least:
  - session id
  - profile slug
  - title
  - summary
  - memory path if available
  - Telegram target/url if known
  - work order ids
  - status: prepared / failed / not_supported / sent
- Wire call end or memory-summary flow so after ending a call the handoff is prepared and persisted.
- Replace static “Handoff bereit” UI copy in `components/voice/voice-console.tsx` with a structured handoff display:
  - memory path
  - number/list of work orders
  - Telegram target/action status
  - clear wording: prepared vs sent vs not supported
- If auto Telegram send is not implemented, say so explicitly. Provide/open existing Telegram deep links where available, but do not say the system posted anything.

D) Events
Add/persist appropriate voice events, at minimum:
- `voice.work_order_created`
- `voice.work_order_create_failed` if creation fails
- `voice.handoff_prepared`
- `voice.handoff_prepare_failed` if preparation fails
- `voice.telegram_handoff_sent` only if a real send succeeds
- `voice.telegram_handoff_failed` only if an actual send attempt fails

E) Tests
Add or update targeted tests under `tests/voice/*.test.ts*`.
Required coverage:
- capability guardrails/instructions include truthful side-effect rules
- work order create/list persistence
- voice tool execution can create a work order and emits event
- call-end handoff preparation creates a persisted handoff
- handoff serialization does not leak raw resolvedContext/baseSessionKey
- UI or route-level behavior exposes structured handoff status where practical
- existing voice tests still pass

Verification commands:

Run:
```bash
cd /home/hartner/mission-control
npx --yes tsx --test tests/voice/*.test.ts*
npm run build
```

Expected known local warnings may include missing `MC_JWT_SECRET` or `MC_PASSWORD`; do not treat those as voice failures if build exits 0.

Git workflow:
- Make changes on the current branch unless instructed otherwise.
- Do not commit unless Daniel explicitly asks.
- At the end, report:
  - files changed
  - tests run and results
  - any known limitations
  - exact manual QA retest steps for TC08, TC09, TC10

Definition of done:
- No fake side-effect promises from voice instructions.
- Work order requests create a persisted, visible work order.
- Call end produces a verifiable handoff object/status, not only static copy.
- TC09 is ready to retest as green for “work order created”, not “document finished”.
- TC10 is ready to retest as green for “handoff prepared and verifiable”; Telegram send only green if actually implemented.
```
