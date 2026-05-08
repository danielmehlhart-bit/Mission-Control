# Prompt: Mission Control Voice Rebuild — 05 Frontend Call UX Spec erstellen

Du bist ein präziser Product-/UX-Architect für Mission Control Voice.

Erstelle die Datei:

`/home/hartner/mission-control/docs/mission-control-voice-rebuild/05_frontend_call_ux.md`

## Ziel

Erstelle eine mobile-first Frontend-/Call-UX-Spezifikation für Mission Control Voice V1.

Die Spec muss auf der bestehenden Vision, Extraction, Open Questions, Business Logic und State Machine aufbauen und später direkt als Grundlage für UI-Implementierung, Komponentenstruktur, Frontend-State und Tests dienen.

## Quellen

Nutze diese Dateien als verbindliche Grundlage:

1. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/01-big-picture-vision.md`
2. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/02-extraction.md`
3. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/03-open-questions.md`
4. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/03_business_logic.md`
5. `/home/hartner/mission-control/docs/mission-control-voice-rebuild/04_state_machine.md`

## Verbindliche Produktentscheidungen

- Mission Control Voice V1 ist ein echter mobiler Call Mode, keine Voice-Konsole.
- Mission Control ist primäre Voice-Oberfläche; Telegram bleibt Kontextquelle und Handoff-Fläche.
- V1 Profile:
  - `main` / Hermes
  - `sales_support`
  - `luma`
- Telegram Bindings:
  - `main`: Telegram-DM-Chat mit Daniel `485318478`
  - `sales_support`: Telegram Chat `-1003998265477`, Topic/Message `23`
  - `luma`: Telegram Chat `-1003998265477`, Topic/Message `24`
- Hands-free ist Pflicht: Daniel startet einmal, Hermes hört und spricht automatisch.
- Barge-in ist Pflicht: Wenn Daniel reinredet, stoppt Hermes sofort die Audio-Ausgabe und hört wieder zu.
- Mute wird primär als persistiertes Flag `isMuted` modelliert, nicht als alleiniger persisted Lifecycle-State.
- Während `isMuted=true`, entstehen keine User Turns und kein Barge-in.
- UI darf klar „Muted“ anzeigen.
- Live Transcript ist nicht primäres UI-Element.
- Mobile Call Screen soll sehr reduziert sein: maximal ca. 4–5 Hauptaktionen, inkl. Mute unten.
- Work-Order-Status muss im Call nicht sichtbar sein; kurze gesprochene Bestätigung reicht.
- Retrieval/Research soll im Call erkennbar sein, z. B. über Status und kurze Sprachansage „Ich schau kurz nach.“
- Call-Ende muss Handoff, Summary, Transcript, Memory, Decisions, Produces und Tags erzeugen.
- Handoff gilt als „letzter Call“, bis ein weiterer Call im gleichen Kontext gemacht wurde.

## Aufgabe

Erstelle eine Frontend-/Call-UX-Spec, die beschreibt:

- mobile-first Informationsarchitektur
- Profil-/Kontextauswahl
- Call-Screen-Zielbild
- sichtbare Call-Zustände
- Button-/Action-Modell mit maximal 4–5 Hauptaktionen
- Mute-Verhalten
- Barge-in-Verhalten aus UX-Sicht
- Retrieval-/Research-Zustände aus UX-Sicht
- Work-Order-Bestätigung ohne sichtbaren Mini-Status
- Call-Ende und Handoff UX
- Error-/Fallback-Zustände
- Text-Fallback ohne Dominanz
- Verbindung zur State Machine
- Komponenten- und Testable-State-Vorschlag

## Required Output Structure

Nutze exakt diese Struktur:

```markdown
# Mission Control Voice Rebuild — 05 Frontend Call UX

**Status:** Draft zur Durchsicht  
**Quelle:** `01-big-picture-vision.md`, `02-extraction.md`, `03-open-questions.md`, `03_business_logic.md`, `04_state_machine.md`  
**Zweck:** Mobile-first Call UX für Mission Control Voice V1 definieren.

---

## 1. UX Goal

## 2. UX Principles

## 3. Information Architecture

## 4. Entry Flow

### 4.1 Call Mode Entry
### 4.2 Profile Selection
### 4.3 Context Preview
### 4.4 Start Call

## 5. Main Call Screen

### 5.1 Layout
### 5.2 Primary Visual Focus
### 5.3 Status Area
### 5.4 Action Area
### 5.5 Text Fallback Area

## 6. Button and Action Model

Beschreibe maximal 4–5 Hauptaktionen, mindestens:

- Gespräch starten / beenden
- Mute / Unmute
- Profil / Kontext wechseln oder anzeigen
- Text-Fallback öffnen
- optional: More / Details

## 7. Visible Call States

Mappe State-Machine-States auf UI-Status, z. B.:

- bereit
- hört zu
- Daniel spricht
- denkt
- schaut nach
- recherchiert
- spricht
- unterbrochen
- gemutet
- beendet / Handoff bereit
- Fehler

## 8. Hands-Free Conversation Loop

## 9. Barge-In UX

Beschreibe genau:

- Daniel redet rein
- Hermes stoppt Audio sofort
- UI wechselt auf Listening/User Speaking
- alter Assistant-Turn wird visuell nicht weiter ausgespielt
- neuer User Turn hat Fokus

## 10. Mute UX

Beschreibe:

- Mute als persistiertes Flag
- sichtbarer Muted-Zustand
- keine User Turns
- kein Barge-in
- Unmute-Verhalten

## 11. Retrieval and Research UX

Beschreibe:

- kurze Ansage
- sichtbarer Status ohne Console-Gefühl
- keine dominanten Logs
- Quellenkurzangabe
- Links im Handoff / Detailbereich

## 12. Work Order UX

Beschreibe:

- gesprochene Bestätigung
- keine sichtbare Statusleiste nötig
- optionaler Handoff-/Details-Hinweis
- Needs-Review-Fälle

## 13. Call-End and Handoff UX

Beschreibe:

- Gespräch beenden
- Speichern / Handoff wird vorbereitet
- Handoff bereit
- Rückkehr zu Telegram / Mission Control
- letzte-Call-Logik

## 14. Error and Fallback UX

Beschreibe:

- Audio Input Fehler
- Audio Output Fehler
- Context Missing
- Research Failure
- Artifact Persistence Partial Failure
- Text-Fallback

## 15. Component Model

Schlage Komponenten vor, z. B.:

- `VoiceCallEntry`
- `VoiceProfileSelector`
- `VoiceCallScreen`
- `VoiceStatusOrb`
- `VoiceActionBar`
- `VoiceMuteButton`
- `VoiceTextFallback`
- `VoiceHandoffSummary`
- `VoiceErrorBanner`

## 16. Frontend State Model

Definiere testbare UI-State-Felder, z. B.:

- `profileSlug`
- `sessionId`
- `callState`
- `visibleStatus`
- `isMuted`
- `isListening`
- `isSpeaking`
- `isThinking`
- `isRetrieving`
- `isResearching`
- `handoffAvailable`
- `lastError`
- `textFallbackOpen`

## 17. Acceptance Criteria

Mindestens:

- UI fühlt sich wie Call Mode an, nicht wie Console.
- Mobile-first Layout funktioniert einhändig.
- Maximal 4–5 Hauptaktionen sichtbar.
- Mute ist immer leicht erreichbar.
- Live Transcript dominiert nicht.
- Barge-in ist verständlich und sofort sichtbar.
- Retrieval/Research-Zustände sind erkennbar, aber nicht technisch überladen.
- Work Orders werden gesprochen bestätigt.
- Call-Ende zeigt Handoff-Bereitschaft.
- Text-Fallback existiert, konkurriert aber nicht mit Voice.
- Frontend kann direkt gegen die State Machine getestet werden.

## 18. Open Questions / Assumptions

Falls beim Schreiben echte Unklarheiten entstehen:

- Keine unbegründeten Entscheidungen erfinden.
- Markiere sie als `Assumption` oder `Open Question`.
- Wenn möglich, mache einen pragmatischen Vorschlag.
```

## Style Rules

- Schreibe auf Deutsch.
- Klare UX-/Produkt-Sprache, aber implementierbar.
- Keine Marketing-Sprache.
- Mobile-first denken.
- Keine langen Essays.
- Tabellen sind erwünscht.
- Keine Secrets oder Tokens aufnehmen.
- Keine Produktionsdaten außer den bereits bestätigten Telegram IDs aufnehmen.

## Stop Condition

Nach Erstellung:

1. Datei speichern unter:
   `/home/hartner/mission-control/docs/mission-control-voice-rebuild/05_frontend_call_ux.md`
2. Kurz berichten:
   - created file path
   - ob Open Questions / Assumptions entstanden sind
   - wichtigste UX-Entscheidungen in 3–5 Bullets
3. Nicht den gesamten Inhalt in den Chat pasten, außer Daniel fragt danach.
