# Fix Zugriffs- und Kontextfehler in Voice/Research-Flow

Datum: 2026-05-16

## Überblick

Ziel ist, den Mission-Control-Voice/Research-Flow so zu härten, dass Hermes im Call nur auf tatsächlich verfügbare und autorisierte Kontexte zugreift, Research-Antworten sauber von Memory-/Telegram-Retrieval trennt und keine falschen Fähigkeiten oder Side Effects behauptet.

Der Fix betrifft vor allem vier Fehlerklassen:

1. **Zugriffsfehler:** Voice darf keine internen Rohkontexte, Secrets, nicht autorisierte Telegram-Kontexte oder nicht freigegebene Dateien/API-Daten verwenden oder ausgeben.
2. **Kontextfehler:** Voice muss den aktiven Call-Kontext respektieren (`main`, `sales_support`, `luma`) und darf nicht unbemerkt auf alte Memory-/Projektquellen ausweichen, wenn aktuelle Telegram- oder Research-Daten fehlen.
3. **Research-Flow:** Live-Recherche muss nur dann als live/current dargestellt werden, wenn ein echter Research-Toolcall mit Quellen erfolgreich war.
4. **Handoff/Work-Order-Wahrheit:** Voice darf keine erledigten Aktionen behaupten, wenn nur ein Gesprächsversprechen, aber kein persistierter Work Order, Artifact, Event oder Telegram-Handoff existiert.

## Schritte

1. **Ist-Zustand und relevante Flows prüfen**
   - Relevante Dateien inspizieren: `lib/voice/realtime.ts`, `lib/voice/tools.ts`, `lib/voice/capabilities.ts`, `lib/voice/context-router.ts`, `lib/voice/service.ts`, `lib/voice/telegram-bridge.ts`, `lib/voice/web-search.ts`.
   - Voice-Events und Toolcall-Pfade gegen aktuelle Erwartungen prüfen: `voice.tool_call_started`, `voice.tool_call_completed`, `voice.web_search_completed`, `voice.telegram_handoff_applied`, `voice.memory_summary_written`.
   - Bestehende Tests unter `tests/voice/*.test.ts*` als Sicherheitsnetz aufnehmen.

2. **Kontextzugriff explizit validieren**
   - Profilbindung als autoritativen Startkontext behandeln; caller-supplied Overrides dürfen keine autoritativen IDs wie `accountId`, `dealId`, `projectId`, `telegramChatId` unkontrolliert überschreiben.
   - Telegram-Kontext nur als frisch verfügbar markieren, wenn `voice_telegram_recent_contexts` für Chat/Topic tatsächlich aktuelle Daten enthält.
   - Bei fehlendem frischem Telegram-Kontext für Telegram-/Chat-Fragen klar antworten: aktuelle Chat-Historie ist nicht verfügbar, statt auf alte Memory-Dateien auszuweichen.

3. **Research von Retrieval trennen**
   - Capability-Instructions schärfen: `live_web_research` nur nennen, wenn `voice_web_search` registriert und providerseitig konfiguriert ist.
   - Research-Antworten müssen auf `voice_web_search`/Provider-Ergebnis beruhen und Quellen kurz benennen.
   - Wenn Websearch scheitert oder nicht konfiguriert ist, muss Voice das sagen und darf keine aktuellen Fakten simulieren.

4. **Tool- und Side-Effect-Guardrails ergänzen**
   - Voice darf Aktionen wie Telegram senden, Datei erstellen, Task anlegen oder Work Order starten nur als erledigt darstellen, wenn ein echter Tool/API-Pfad läuft und ein persistiertes Event/Artifact entsteht.
   - Für noch nicht verfügbare Aktionen klare Formulierung: „Ich kann das als nächsten Schritt vorbereiten“ statt „Ich habe es geschickt/angelegt“.
   - Persistierte Events für echte Side Effects prüfen oder ergänzen, damit Handoff/Debugging später verifizierbar ist.

5. **API-/Response-Sanitizing prüfen**
   - Keine Rohfelder wie `resolvedContext`, `baseSessionKey`, interne Providerfehler, Secrets oder raw `lastError` in API-Antworten ausgeben.
   - Event-Feeds auch in verschachtelten Payloads sanitizen, insbesondere bei `voice.state_changed` und Tool-/Providerfehlern.

6. **Regressionstests ergänzen**
   - Test: frische Telegram-Frage ohne `telegram_recent` darf nicht auf alte Memory-/Projektquellen zurückfallen.
   - Test: Research-Frage ohne konfigurierten Websearch führt zu ehrlicher Nichtverfügbarkeit, nicht zu erfundener Live-Recherche.
   - Test: erfolgreiche `voice_web_search`-Antwort enthält Quellen und erzeugt `voice.web_search_completed`.
   - Test: nicht autorisierte Kontext-Overrides werden ignoriert oder abgelehnt.
   - Test: API-Responses und Events leaken keine internen Kontextfelder.
   - Test: Side-Effect-Behauptungen sind an echte Tool-/Event-Pfade gebunden.

7. **Verifikation**
   - `npx --yes tsx --test tests/voice/*.test.ts*`
   - `npm run build`
   - Optionaler lokaler Smoke-Test mit konfiguriertem Provider für `runVoiceWebSearch()`.
   - Bei Deployment: GitHub Action prüfen und `/voice` geschützt erreichbar lassen; Security-/Permissions-Header dürfen nicht regressieren.

## Akzeptanzkriterien

- Voice respektiert den aktiven Profilkontext und wechselt Kontext nur über autorisierte Switch-/Bridge-Pfade.
- Fresh-Telegram-Fragen ohne recent Telegram context führen zu einer ehrlichen Nichtverfügbarkeitsantwort; keine stille Nutzung alter Memory-Quellen.
- Live-Research-Antworten entstehen nur nach echtem Research-Toolcall und enthalten kompakte Quellenhinweise.
- Bei fehlender Research-Konfiguration sagt Voice klar, dass Live-Recherche gerade nicht verfügbar ist.
- API-Antworten und Eventfeeds enthalten keine internen Rohkontexte, Secrets oder unsanitisierte Provider-/Hook-Fehler.
- Voice behauptet keine erledigten externen Aktionen ohne verifizierbaren Toolcall, Event, Artifact oder Handoff.
- Voice-Test-Sweep und Build laufen grün.

## Risiken/Notes

- Telegram-Kontext kann in der UI/Session-Zusammenfassung sichtbar sein, obwohl keine frischen Chatdaten ingestiert wurden. Das muss semantisch getrennt bleiben: Binding ≠ verfügbare History.
- Alte Memory-Dateien sind nützlich für Hintergrundwissen, aber gefährlich für Fragen nach „gerade“, „zuletzt im Chat“, „was kam eben rein“.
- Research-Provider können Quellen mit unterschiedlicher Qualität liefern; Antworten sollten Quellen kurz nennen und nicht mehr Sicherheit suggerieren als vorhanden.
- Änderungen an `middleware.ts`, Auth, Security-Headers oder ingestion tokens sind sicherheitskritisch und nur minimal/gezielt vorzunehmen.
- Bestehende Voice-Tests nutzen `tsx`; `node --test` direkt kann wegen `@/` Path-Alias fehlschlagen.
- Diese Planung ist ein Hardening-/Fixblock, kein kompletter Rebuild des Call UX.
