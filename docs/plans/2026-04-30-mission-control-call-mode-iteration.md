# Mission Control Call Mode Iteration Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Die bestehende Mission-Control-Voice-Console in einen deutlich natürlicheren, hands-free Call-Flow überführen: Start drücken, Hermes begrüßt Daniel sofort, hört danach weiter zu und nutzt optional serverseitiges ElevenLabs-TTS statt reinem Browser-SpeechSynthesis.

**Architecture:** Wir iterieren auf dem vorhandenen Voice-Backend statt neu zu bauen. Die Session-Erstellung bekommt ein optionales Auto-Greeting, der Browser-Client wechselt von Console-Messaging zu einem Call-Screen mit klaren Zuständen und minimiert den manuellen Fallback. Für Audio wird eine kleine TTS-Abstraktion ergänzt: bevorzugt ElevenLabs per Server-Proxy, sonst Browser-SpeechSynthesis.

**Tech Stack:** Next.js 14, TypeScript, bestehender Voice-Service/API-Stack, native `fetch`, HTMLAudioElement, browser SpeechRecognition/SpeechSynthesis als Fallback.

---

## Zielbild

- Daniel öffnet `/voice`.
- Er tippt **einmal** auf einen Profil-Button wie `Call Hermes`.
- Mission Control erstellt die Session, lässt Hermes direkt begrüßen und schaltet danach in aktives Zuhören.
- Während Hermes spricht, sieht Daniel einen echten Call-State statt Console-/Testing-Sprache.
- Die Textbox bleibt nur als diskreter Fallback sichtbar.
- Wenn ElevenLabs konfiguriert ist, wird Assistant-Audio serverseitig erzeugt und im Browser abgespielt; sonst bleibt Browser-TTS als Fallback aktiv.

## Task 1: Dokumentation + Acceptance-Kriterien festhalten

**Objective:** Das Zielbild und die bewusst begrenzte Iteration im Repo dokumentieren.

**Files:**
- Create: `docs/plans/2026-04-30-mission-control-call-mode-iteration.md`

**Steps:**
1. Dieses Dokument mit Goal, Zielbild und Tasks anlegen.
2. Acceptance-Kriterien explizit machen:
   - Session-Start kann Auto-Greeting auslösen.
   - UI nutzt Call-Sprache statt Console-Sprache.
   - Voice-CTA ist `Gespräch starten` / `Gespräch beenden`.
   - `Antwort anhören` ist nicht mehr Primär-UX.
   - ElevenLabs ist optional und fällt robust auf Browser-TTS zurück.

**Verification:**
- Datei liegt unter `docs/plans/` und ist selbsterklärend.

## Task 2: Voice-Backend um Auto-Greeting erweitern

**Objective:** Nach Session-Erstellung auf Wunsch sofort einen ersten Assistant-Turn erzeugen.

**Files:**
- Modify: `app/api/voice/sessions/route.ts`
- Modify: `tests/voice/api-routes.test.ts`

**Steps:**
1. POST-Route um `autoGreeting?: boolean` erweitern, default `true`.
2. Wenn `autoGreeting !== false`, direkt nach `createSessionForProfile(...)` einen Assistant-Turn generieren.
3. Response weiterhin als vollständiges Session-Envelope zurückgeben.
4. Tests ergänzen:
   - Auto-Greeting standardmäßig aktiv.
   - `autoGreeting: false` unterdrückt den initialen Assistant-Turn.

**Verification:**
- `npx --yes tsx --test tests/voice/api-routes.test.ts`

## Task 3: Optionales serverseitiges TTS mit ElevenLabs-Fallback bauen

**Objective:** Assistant-Audioqualität verbessern, ohne die bestehende Browser-TTS als Fallback zu verlieren.

**Files:**
- Create: `lib/voice/tts.ts`
- Create: `app/api/voice/tts/route.ts`
- Modify: `tests/voice/providers.test.ts`

**Steps:**
1. TTS-Helper bauen mit folgenden Entscheidungen:
   - Wenn `MC_VOICE_TTS_PROVIDER=elevenlabs` und benötigte Env-Vars gesetzt sind, ElevenLabs per `fetch` aufrufen.
   - Sonst `provider: "browser"` zurückgeben, damit der Client lokal spricht.
2. API-Route `POST /api/voice/tts` anlegen:
   - validiert `text`
   - gibt bei ElevenLabs Audio-Bytes mit passendem `content-type` zurück
   - gibt bei Fallback JSON mit `{ provider: "browser" }` zurück.
3. Unit-Test für Provider-Auswahl ergänzen.

**Verification:**
- `npx --yes tsx --test tests/voice/providers.test.ts`

## Task 4: VoiceConsole in echten Call-Screen umbauen

**Objective:** Primär-UX von Testing-Console zu natürlichem Call-Mode verschieben.

**Files:**
- Modify: `components/voice/voice-console.tsx`
- Modify: `tests/voice/voice-ui.test.tsx`

**Steps:**
1. Hero-/Leerscreen-Sprache auf Call-Erlebnis umstellen.
2. Aktive Session visuell als Call-Screen priorisieren:
   - großer Status-Kreis / live status
   - knappe Call-Hinweise
   - Profil- und Kontextanzeige
3. Buttons umbenennen:
   - `Voice starten` → `Gespräch starten`
   - `Voice stoppen` → `Gespräch beenden`
4. `Antwort anhören` nur noch als sekundäre Hilfsaktion zeigen.
5. Text-Turn-Bereich als Fallback formulieren, nicht als Hauptpfad.
6. Transcript sprachlich vereinfachen (`Du` / `Hermes`) und Console-Terminologie reduzieren.
7. Nach Session-Erstellung sofort initiale Assistant-Antwort sprechen.
8. Audio-Pipeline zuerst über neue TTS-Route versuchen, sonst Browser-SpeechSynthesis.

**Verification:**
- `npx --yes tsx --test tests/voice/voice-ui.test.tsx`

## Task 5: Gesamtverifikation, Build und Push

**Objective:** Sicherstellen, dass die Iteration sauber baut und deploybar ist.

**Files:**
- Modify as needed: betroffene Dateien aus Tasks 2–4

**Steps:**
1. Voice-Tests vollständig laufen lassen.
2. `npm run build` ausführen.
3. `git status` prüfen.
4. Commit mit klarer Message.
5. `git push origin master`.

**Verification:**
- `npx --yes tsx --test tests/voice/*.test.ts*`
- `npm run build`
- `git push origin master`

## Acceptance Criteria

- `/voice` wirkt im aktiven Zustand wie ein Call-Screen, nicht wie eine Testkonsole.
- Ein neuer Call liefert ohne weiteren Tap eine erste Assistant-Begrüßung.
- Der Nutzer muss für die normale Roundtrip-Conversation keinen `Antwort anhören`-Button mehr drücken.
- ElevenLabs kann optional aktiviert werden, ohne lokale Entwicklung zu brechen.
- Bestehende Voice-Tests und Build laufen weiter.
