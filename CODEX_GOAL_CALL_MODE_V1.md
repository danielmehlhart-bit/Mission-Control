# Codex `/goal` Prompt — Mission Control Voice Call Mode V1

Kopiere diesen Prompt in Codex CLI, nachdem du im Repo bist:

```bash
cd /home/hartner/mission-control
codex
```

Dann in Codex einfügen:

```text
/goal

Mission Control Voice Rebuild — Build Call Mode V1 on top of the existing voice structure.

Context:
We are in the Mission Control repo at `/home/hartner/mission-control`.

Important project docs/specs have already been created locally. Read these files first and treat them as the source of truth:

1. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/01-big-picture-vision.md`
2. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/02-extraction.md`
3. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/03-open-questions.md`
4. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/03_business_logic.md`
5. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/04_state_machine.md`
6. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/05_frontend_call_ux.md`

Also read:
- `/home/hartner/mission-control/AGENTS.md`
- `/home/hartner/mission-control/knowledge.md`
- `package.json`
- existing voice-related files under `app/api/voice`, `app/voice`, `components/voice`, `lib/voice`, and `tests/voice`

Goal:
Implement the first real “Call Mode V1” iteration for Mission Control Voice.

Important architectural decision:
Do NOT create a totally separate competing voice product path.
Reuse the existing Mission Control voice backend/session/profile/event/turn infrastructure wherever possible.
Refactor the existing `/voice` surface from “Voice Console” toward a mobile-first “Call Mode”.
If a new internal component is useful, create it, but keep `/voice` as the main entry route.
The existing console/text UX should become fallback/legacy, not the primary product surface.

Product target:
The user should experience Mission Control Voice as a call-like assistant flow, not a debug console.

Core requirements from the specs:
- Voice profiles: `main`, `sales_support`, `luma`
- Telegram context bindings:
  - `main`: Daniel Telegram DM chat `485318478`
  - `sales_support`: Telegram chat `-1003998265477`, topic/message `23`
  - `luma`: Telegram chat `-1003998265477`, topic/message `24`
- Mission Control remains the primary surface.
- Telegram is a context source and handoff target, not the main runtime UI.
- Mobile-first call screen.
- Max 4–5 primary visible actions.
- Mute must be prominent and modeled as a persistent `isMuted` flag, not as the sole lifecycle state.
- Barge-in target behavior: if Daniel speaks while Hermes is speaking, Hermes should stop speaking immediately and return to listening. If true realtime barge-in is not fully possible in this iteration, implement the cleanest available browser-level approximation and document the remaining gap.
- Live transcript is secondary, not the primary UI.
- Text input remains only as a fallback.
- Research/tool/status feedback should be short and human-readable, not debug logs.
- Call end should prepare for transcript/summary/memory/handoff flows; implement only what is safely supported by the current codebase and clearly mark TODOs for unsupported pieces.

Open UX decisions to make pragmatically:
- Q33: Prefer an immediate short auto-greeting on call start unless the current implementation makes that unsafe.
- Q34: Prefer a visible “In Telegram weiter” / handoff affordance if supported; otherwise show a clear handoff status/placeholder without pretending it is fully wired.

Implementation approach:
1. Inspect the current voice implementation before editing.
2. Create or update a short implementation plan under `docs/plans/` before major code changes.
3. Reuse existing APIs/services/stores as much as possible.
4. Avoid leaking raw internal context or secrets in API responses.
5. Keep code TypeScript-safe and consistent with existing repo patterns.
6. Add or update tests for changed behavior where practical.
7. Run verification:
   - targeted voice tests, preferably `npx tsx --test tests/voice/*.test.ts*`
   - `npm run build`
8. Do not commit unless explicitly asked.

Expected deliverables:
- Updated `/voice` experience that is visibly and conceptually “Call Mode”, not “Voice Console”.
- Mobile-first UI structure or component.
- Demoted text fallback.
- Prominent call state/status UI.
- Prominent mute control.
- Existing backend reused, not bypassed.
- Any unsupported realtime/full-duplex pieces documented as TODOs in code or the plan.
- Tests/build passing or a clear explanation of remaining failures.

Safety:
- Do not print or commit secrets.
- Do not modify production data.
- Do not delete the legacy voice implementation blindly; preserve fallback until the new call mode is verified.
- If uncertain between destructive rewrite and incremental refactor, choose incremental refactor.

Start by reading the files listed above, then inspect the current voice code, then propose and execute the implementation plan.
```

## Alternative: non-interactive Codex Exec

Wenn du es ohne interaktive `/goal`-Session testen willst, nutze eher:

```bash
cd /home/hartner/mission-control
codex exec --full-auto "$(sed '1,/```text/d;/```/,$d' docs/mission-control-voice-rebuild/prompts/06-codex-call-mode-v1-goal-prompt.md | sed '/^\/goal$/d')"
```

Empfehlung für diesen Test: **interactive Codex starten und den `/goal`-Prompt einfügen**, weil du genau die `/goal`-Funktion ausprobieren willst.
