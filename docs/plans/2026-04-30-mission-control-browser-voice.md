# Mission Control Browser Voice Layer

## Ziel
Die bestehende textbasierte Voice-Workspace-UI auf `/voice` zu echtem Browser-Voice-to-Voice erweitern:
- Mikrofon im Browser aktivierbar
- Interim-Transcript sichtbar
- Finales Transcript sendet an den bestehenden Voice-Backend-Stack
- Assistant-Antwort wird per Browser-TTS vorgelesen
- UI zeigt klaren Voice-Status (idle/listening/thinking/speaking/error)

## Root Cause
1. Im Frontend gibt es bisher keinerlei Browser-Audio-/Speech-API-Nutzung.
2. `next.config.mjs` blockiert Mikrofon via `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
3. Die bestehende UI unterstützt nur manuelle Text-Turns.

## Umsetzungsplan
1. **TDD**
   - `tests/voice/voice-ui.test.tsx` erweitern um Assertions für Voice-Control-UI.
2. **Policy-Fix**
   - `next.config.mjs` so anpassen, dass Mikrofon nicht global blockiert wird.
3. **Browser Voice Layer**
   - In `components/voice/voice-console.tsx` Browser-Speech-Recognition + Speech-Synthesis ergänzen.
   - Status, Fehler, Unterstützungs-Hinweise und Start/Stop-Buttons ergänzen.
   - Interim-Transcript optional an `/api/voice/sessions/[id]/transcript` senden.
   - Finale Spracheingabe über bestehenden `complete-turn`-Endpoint abwickeln.
4. **Assistant Audio Output**
   - Nach erfolgreichem Assistant-Turn Antwort per `speechSynthesis` abspielen.
5. **Verifikation**
   - `npx --yes tsx --test tests/voice/voice-ui.test.tsx`
   - `npx --yes tsx --test tests/voice/*.test.ts*`
   - `npm run build`
   - danach push + Deploy prüfen

## Nicht-Ziel für diesen Schritt
- Realtime bi-direktionales Audio-Streaming
- WebRTC/WebSocket-Audio-Pipeline
- Serverseitige STT/TTS-Providerintegration

## Done-Kriterien
- `/voice` zeigt sichtbare Sprachsteuerung
- Mic kann gestartet/gestoppt werden
- Gesprochene Eingabe erzeugt einen Assistant-Turn
- Assistant-Antwort wird im Browser vorgelesen
- Build + Tests grün
