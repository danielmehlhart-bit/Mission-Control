# Mission Control Voice Rebuild — 04 State Machine

**Status:** Draft zur Durchsicht  
**Quelle:** `01-big-picture-vision.md`, `02-extraction.md`, `03-open-questions.md`, `03_business_logic.md`  
**Zweck:** State Machine für Mission Control Voice V1 definieren.

---

## 1. State Machine Goals

Die State Machine beschreibt den fachlichen und technischen Ablauf eines Mission-Control-Voice-Calls.

Ziele:

1. Mission Control Voice verhält sich wie ein echter mobiler Call Mode, nicht wie eine Text-/Voice-Konsole.
2. Jeder Call startet profilgebunden mit geladenem Basiskontext.
3. Hands-free Listening und Speaking sind der Normalfall.
4. Barge-in ist ein erstklassiger State-Machine-Flow, nicht nur UI-Verhalten.
5. Retrieval, Research, Work Orders und normale Antworten sind getrennte, testbare Pfade.
6. Fehlender Kontext erzeugt transparente Nicht-Fund-Antworten, keine Halluzination.
7. Call-Ende persistiert Transcript, Summary, Memory, Decisions, Produces, Tags und Telegram-Handoff.
8. Handoff ist nach dem Call aus Telegram wieder auflösbar.

---

## 2. Core State Model

### 2.1 Primary Call States

| State | Kategorie | Bedeutung |
|---|---|---|
| `idle` | pre-call | Kein aktiver Call. |
| `starting` | setup | Call-Start wurde angefordert, Session wird angelegt. |
| `hydrating_context` | setup | Profil-, Telegram-, Memory- und Mission-Control-Kontext werden geladen. |
| `ready` | setup | Call ist initialisiert und bereit für Begrüßung oder Zuhören. |
| `listening` | active | Hermes hört aktiv auf Daniels Sprache. |
| `user_speaking` | active | Daniels Sprache wird aufgenommen / transkribiert. |
| `classifying_intent` | reasoning | Finaler User Turn wird klassifiziert. |
| `thinking` | reasoning | Hermes erzeugt Antwort ohne externes Retrieval/Research oder orchestriert nächste Schritte. |
| `retrieving_context` | tool | Interner Kontext wird nachgeladen. |
| `researching_web` | tool | Externe Web-/Perplexity-Recherche läuft. |
| `creating_work_order` | tool/work | Ein Arbeitsauftrag wird erstellt oder gestartet. |
| `speaking` | active | Hermes spricht Antwort per Audio. |
| `interrupted` | active | Hermes wurde während des Sprechens durch Daniel unterbrochen. |
| `muted` | active/overlay | Sichtbarer Mute-Zustand; technisch primär über Flag `isMuted`, nicht als alleiniger persisted Lifecycle-State. |
| `paused` | active/fallback | Call ist pausiert, aber nicht beendet. |
| `ending` | teardown | Call-Ende wurde angefordert; Audio/Listening wird gestoppt. |
| `persisting_artifacts` | teardown | Transcript, Summary, Memory und Handoff-Artefakte werden gespeichert. |
| `handoff_ready` | teardown | Telegram-/Follow-up-Handoff ist erzeugt und auflösbar. |
| `completed` | terminal | Call ist erfolgreich abgeschlossen. |
| `failed` | terminal/fallback | Call ist fehlgeschlagen oder wurde nicht vollständig wiederherstellbar beendet. |

### 2.2 Substates / Parallel Flags

Diese Flags laufen parallel zum Primary State und verhindern, dass zu viele künstliche States entstehen.

| Flag | Typ | Bedeutung |
|---|---|---|
| `isMuted` | boolean | Daniel ist gemutet; Audio-Input erzeugt keine User Turns. |
| `isSpeaking` | boolean | Hermes gibt gerade Audio aus. |
| `isListening` | boolean | Mikrofon-/Realtime-Input ist aktiv. |
| `isRetrieving` | boolean | Interner Kontext wird gerade geladen. |
| `isResearching` | boolean | Web-/Perplexity-Recherche läuft. |
| `hasOpenWorkOrder` | boolean | Mindestens ein Work Order ist offen. |
| `handoffAvailable` | boolean | Call kann aus Telegram referenziert werden. |
| `needsConfirmation` | boolean | Eine Aktion braucht Daniels Bestätigung. |
| `lastError` | string/null | Letzter technischer oder fachlicher Fehler. |

---

## 3. State Definitions

### 3.1 `idle`

- **Purpose:** Ausgangszustand ohne aktiven Call.
- **Entry Actions:** UI zeigt Profilwahl / Call starten.
- **Allowed Events:** `call.start_requested`.
- **Allowed Transitions:** `idle` → `starting`.
- **Exit Conditions:** Daniel startet Call mit Profil oder implizitem Default `main`.
- **Side Effects:** keine.
- **Persistence / Telemetry Events:** optional `voice.call_entry_viewed`.

### 3.2 `starting`

- **Purpose:** Session anlegen und Startparameter validieren.
- **Entry Actions:** Profil auflösen; Default `main`, falls kein Profil gewählt und kein profilgebundener Kontext existiert.
- **Allowed Events:** `call.session_created`, `call.failed`.
- **Allowed Transitions:** `starting` → `hydrating_context`; `starting` → `failed`.
- **Exit Conditions:** Session-ID existiert.
- **Side Effects:** `voice_sessions`-Record anlegen.
- **Persistence / Telemetry Events:** `call.start_requested`, `voice.session_created`, `voice.state_changed`.

### 3.3 `hydrating_context`

- **Purpose:** Basiskontext für das aktive Profil laden.
- **Entry Actions:** Context Router lädt Telegram Bridge, Mission-Control-Kontext, Memory, Daily Logs, jüngste Voice Summaries.
- **Allowed Events:** `call.context_hydrated`, `context.hydration_failed`, `call.end_requested`.
- **Allowed Transitions:** `hydrating_context` → `ready`; `hydrating_context` → `failed`; `hydrating_context` → `ending`.
- **Exit Conditions:** Kontext ist geladen oder Fehler ist nicht recoverable.
- **Side Effects:** `resolvedContext` speichern; Context Summary erzeugen.
- **Persistence / Telemetry Events:** `context.hydration_started`, `context.hydration_completed`, `context.hydration_failed`.

### 3.4 `ready`

- **Purpose:** Call ist initialisiert und kann in den Gesprächsloop gehen.
- **Entry Actions:** optional initiale Begrüßung erzeugen; Audio-Session vorbereiten.
- **Allowed Events:** `call.ready`, `audio.assistant_speech_started`, `audio.listening_started`, `call.end_requested`, `audio.mute_enabled`, `call.pause_requested`.
- **Allowed Transitions:** `ready` → `speaking`; `ready` → `listening`; `ready` → `ending`; `ready` → `muted`; `ready` → `paused`.
- **Exit Conditions:** Hermes begrüßt oder startet Listening.
- **Side Effects:** ggf. initialer Assistant Turn.
- **Persistence / Telemetry Events:** `call.ready`, `voice.state_changed`.

### 3.5 `listening`

- **Purpose:** Hermes hört automatisch zu.
- **Entry Actions:** Audio input aktivieren; `isListening=true`.
- **Allowed Events:** `audio.user_speech_started`, `audio.mute_enabled`, `call.pause_requested`, `call.end_requested`, `audio.input_failed`.
- **Allowed Transitions:** `listening` → `user_speaking`; `listening` → `muted`; `listening` → `paused`; `listening` → `ending`; `listening` → `failed`.
- **Exit Conditions:** Daniel spricht, muted, pausiert oder beendet.
- **Side Effects:** keine User-Turn-Persistenz vor finalem Transcript.
- **Persistence / Telemetry Events:** `audio.listening_started`, `voice.state_changed`, bei Fehler `audio.input_failed`.

### 3.6 `user_speaking`

- **Purpose:** Daniels aktueller Turn wird aufgenommen.
- **Entry Actions:** Audio segmentieren; interim transcript optional speichern.
- **Allowed Events:** `audio.user_speech_finalized`, `audio.mute_enabled`, `call.end_requested`, `audio.input_failed`.
- **Allowed Transitions:** `user_speaking` → `classifying_intent`; `user_speaking` → `muted`; `user_speaking` → `ending`; `user_speaking` → `failed`.
- **Exit Conditions:** Finales Transcript liegt vor oder Input wird abgebrochen.
- **Side Effects:** finalen User Turn in Transcript speichern.
- **Persistence / Telemetry Events:** `audio.user_speech_started`, `voice.turn_user_committed`.

### 3.7 `classifying_intent`

- **Purpose:** User Turn einer oder mehreren Intent-Klassen zuordnen.
- **Entry Actions:** Intent Classifier auf finalen User Turn anwenden.
- **Allowed Events:** `intent.classified`, `intent.classification_failed`, `call.end_requested`.
- **Allowed Transitions:**
  - `classifying_intent` → `thinking`
  - `classifying_intent` → `retrieving_context`
  - `classifying_intent` → `researching_web`
  - `classifying_intent` → `creating_work_order`
  - `classifying_intent` → `ending`
  - `classifying_intent` → `failed`
- **Exit Conditions:** Intent ist ausreichend sicher oder Fallback ist gewählt.
- **Side Effects:** Intent metadata am Turn speichern.
- **Persistence / Telemetry Events:** `intent.classified`, `intent.classification_failed`.

### 3.8 `thinking`

- **Purpose:** Antwort generieren oder nächsten Orchestrierungsschritt vorbereiten.
- **Entry Actions:** Assistant Prompt mit Kontext bauen; Modell/Agent ausführen.
- **Allowed Events:** `assistant.response_ready`, `assistant.generation_failed`, `call.end_requested`.
- **Allowed Transitions:** `thinking` → `speaking`; `thinking` → `creating_work_order`; `thinking` → `ending`; `thinking` → `failed`.
- **Exit Conditions:** Antwort liegt vor oder Fehler tritt auf.
- **Side Effects:** Assistant Turn vorbereiten, aber erst nach erfolgreicher Generierung persistieren.
- **Persistence / Telemetry Events:** `assistant.generation_started`, `assistant.generation_completed`, `assistant.generation_failed`.

### 3.9 `retrieving_context`

- **Purpose:** Telegram-, Memory-, Daily-Log-, Mission-Control- oder Voice-Call-Kontext nachladen.
- **Entry Actions:** Kurzansage vorbereiten/sprechen: „Ich schau kurz nach.“; `isRetrieving=true`.
- **Allowed Events:** `retrieval.completed`, `retrieval.not_found`, `retrieval.failed`, `audio.barge_in_detected`, `call.end_requested`.
- **Allowed Transitions:** `retrieving_context` → `thinking`; `retrieving_context` → `speaking`; `retrieving_context` → `interrupted`; `retrieving_context` → `ending`; `retrieving_context` → `failed`.
- **Exit Conditions:** Kontext gefunden, nicht gefunden oder Retrieval fehlgeschlagen.
- **Side Effects:** Retrieval-Ergebnisse / Nicht-Fund-Grund speichern.
- **Persistence / Telemetry Events:** `retrieval.started`, `retrieval.completed`, `retrieval.not_found`, `retrieval.failed`.

### 3.10 `researching_web`

- **Purpose:** Web Search und/oder Perplexity für externe aktuelle Fakten ausführen.
- **Entry Actions:** Kurzansage vorbereiten/sprechen; `isResearching=true`; Quellenpräferenz anwenden.
- **Allowed Events:** `research.completed`, `research.failed`, `audio.barge_in_detected`, `call.end_requested`.
- **Allowed Transitions:** `researching_web` → `thinking`; `researching_web` → `speaking`; `researching_web` → `interrupted`; `researching_web` → `ending`; `researching_web` → `failed`.
- **Exit Conditions:** Research-Ergebnis oder Research-Fehler liegt vor.
- **Side Effects:** Research Evidence mit Links, Titeln, Domains, Zeitpunkt speichern.
- **Persistence / Telemetry Events:** `research.started`, `research.completed`, `research.failed`, `research.evidence_saved`.

### 3.11 `creating_work_order`

- **Purpose:** Aus einem User Turn einen synchronen oder asynchronen Arbeitsauftrag erzeugen.
- **Entry Actions:** Work Order anlegen; Guard auf Side Effects / Confirmation prüfen.
- **Allowed Events:** `work_order.created`, `work_order.completed`, `work_order.needs_review`, `work_order.failed`, `call.end_requested`.
- **Allowed Transitions:** `creating_work_order` → `thinking`; `creating_work_order` → `speaking`; `creating_work_order` → `ending`; `creating_work_order` → `failed`.
- **Exit Conditions:** Work Order ist erledigt, offen/asynchron übergeben, braucht Review oder ist fehlgeschlagen.
- **Side Effects:** Work Order speichern; bei langem Auftrag `hasOpenWorkOrder=true`.
- **Persistence / Telemetry Events:** `work_order.created`, `work_order.completed`, `work_order.needs_review`, `work_order.failed`.

### 3.12 `speaking`

- **Purpose:** Hermes spricht die Antwort.
- **Entry Actions:** Audio output starten; `isSpeaking=true`; Listening je nach Technologie für Barge-in aktiv lassen oder gesondert überwachen.
- **Allowed Events:** `audio.assistant_speech_finished`, `audio.barge_in_detected`, `audio.output_failed`, `call.end_requested`, `audio.mute_enabled`.
- **Allowed Transitions:** `speaking` → `listening`; `speaking` → `interrupted`; `speaking` → `ending`; `speaking` → `failed`; optional `speaking` → `muted` bei aktivem Mute ohne Abbruch der Assistant-Ausgabe.
- **Exit Conditions:** Antwort fertig, Daniel unterbricht, Audiofehler oder Call-Ende.
- **Side Effects:** Assistant Turn speichern; Spoken source summary optional einschließen.
- **Persistence / Telemetry Events:** `audio.assistant_speech_started`, `voice.turn_assistant_committed`, `audio.assistant_speech_finished`.

### 3.13 `interrupted`

- **Purpose:** Barge-in fachlich sauber behandeln.
- **Entry Actions:** Assistant-Audio stoppen oder pausieren; aktuellen Assistant Turn als interrupted markieren; Daniels neuer Input bekommt Vorrang.
- **Allowed Events:** `audio.user_speech_started`, `audio.user_speech_finalized`, `call.end_requested`.
- **Allowed Transitions:** `interrupted` → `user_speaking`; `interrupted` → `classifying_intent`; `interrupted` → `ending`.
- **Exit Conditions:** Neuer User Turn läuft oder ist finalisiert.
- **Side Effects:** Abbruch-/Interrupt-Event speichern.
- **Persistence / Telemetry Events:** `audio.barge_in_detected`, `voice.assistant_interrupted`, `voice.state_changed`.

### 3.14 `muted`

- **Purpose:** Mikrofon bewusst deaktivieren; keine User-Turn-Erzeugung.
- **Entry Actions:** `isMuted=true`; Audio input ignorieren oder deaktivieren.
- **Allowed Events:** `audio.mute_disabled`, `call.end_requested`, `call.pause_requested`, optional `audio.assistant_speech_finished`.
- **Allowed Transitions:** `muted` → `listening`; `muted` → `paused`; `muted` → `ending`.
- **Exit Conditions:** Daniel unmuted, pausiert oder beendet.
- **Side Effects:** Hintergrundgeräusche erzeugen keine Turns.
- **Persistence / Telemetry Events:** `audio.mute_enabled`, `audio.mute_disabled`.

### 3.15 `paused`

- **Purpose:** Call ist bewusst gehalten, aber nicht beendet.
- **Entry Actions:** Audio input stoppen; ggf. Audio output pausieren; `isListening=false`.
- **Allowed Events:** `call.resume_requested`, `call.end_requested`, `audio.mute_enabled`.
- **Allowed Transitions:** `paused` → `listening`; `paused` → `muted`; `paused` → `ending`.
- **Exit Conditions:** Daniel setzt Call fort oder beendet.
- **Side Effects:** keine Turn-Erzeugung.
- **Persistence / Telemetry Events:** `call.paused`, `call.resumed`.

### 3.16 `ending`

- **Purpose:** Call-Ende einleiten und Audiozustände sauber stoppen.
- **Entry Actions:** Listening stoppen; Speaking stoppen; offene Audio-Streams schließen.
- **Allowed Events:** `call.audio_stopped`, `call.failed`.
- **Allowed Transitions:** `ending` → `persisting_artifacts`; `ending` → `failed`.
- **Exit Conditions:** Audio ist gestoppt oder kontrolliert abgebrochen.
- **Side Effects:** keine neuen User Turns mehr zulassen.
- **Persistence / Telemetry Events:** `call.end_requested`, `call.audio_stopped`, `voice.state_changed`.

### 3.17 `persisting_artifacts`

- **Purpose:** Pflichtartefakte erzeugen und speichern.
- **Entry Actions:** Transcript speichern, Summary generieren, Decisions/Produces extrahieren, Memory Entry schreiben, Tags bestimmen, Handoff erzeugen.
- **Allowed Events:** `call.artifacts_persisted`, `artifact.persistence_partial_failed`, `artifact.persistence_failed`.
- **Allowed Transitions:** `persisting_artifacts` → `handoff_ready`; `persisting_artifacts` → `failed`.
- **Exit Conditions:** Mindestpersistenz erreicht oder harter Persistenzfehler.
- **Side Effects:** Dateien/Records schreiben.
- **Persistence / Telemetry Events:** `call.transcript_saved`, `call.summary_created`, `call.memory_created`, `call.decisions_extracted`, `call.produces_extracted`, `call.tags_created`, `artifact.persistence_partial_failed`.

### 3.18 `handoff_ready`

- **Purpose:** Telegram-/Follow-up-Handoff ist referenzierbar.
- **Entry Actions:** Handoff Reference mit Profil, Telegram Binding, Summary/Transcript/Memory-Pfaden und Work Orders speichern.
- **Allowed Events:** `call.completed`, `call.failed`.
- **Allowed Transitions:** `handoff_ready` → `completed`; `handoff_ready` → `failed`.
- **Exit Conditions:** Handoff-Record ist gespeichert.
- **Side Effects:** `handoffAvailable=true`.
- **Persistence / Telemetry Events:** `call.handoff_ready`, `voice.telegram_handoff_reference_created`.

### 3.19 `completed`

- **Purpose:** Terminaler Erfolgszustand.
- **Entry Actions:** Session als abgeschlossen markieren.
- **Allowed Events:** keine für diese Session außer nachgelagerter Read/Resolve.
- **Allowed Transitions:** keine.
- **Exit Conditions:** terminal.
- **Side Effects:** keine.
- **Persistence / Telemetry Events:** `call.completed`, `voice.session_completed`.

### 3.20 `failed`

- **Purpose:** Terminaler Fehlerzustand oder nicht vollständig recoverable Abschluss.
- **Entry Actions:** Fehler speichern; möglichst Transcript/Partial Summary sichern.
- **Allowed Events:** optional `call.retry_requested` für neue Session, nicht für Mutation der fehlgeschlagenen Session.
- **Allowed Transitions:** keine innerhalb derselben Session.
- **Exit Conditions:** terminal.
- **Side Effects:** `lastError` setzen; partial artifacts markieren.
- **Persistence / Telemetry Events:** `call.failed`, `voice.error_recorded`.

---

## 4. Transition Table

| From State | Event | Guard | To State | Actions | Notes |
|---|---|---|---|---|---|
| `idle` | `call.start_requested` | profile valid oder default möglich | `starting` | Session anlegen | Default ist `main`. |
| `starting` | `call.session_created` | session id exists | `hydrating_context` | Context hydration starten | Profilbindung wird fixiert. |
| `starting` | `call.failed` | unrecoverable setup error | `failed` | Fehler speichern | Kein Call ohne Session. |
| `hydrating_context` | `call.context_hydrated` | context summary exists | `ready` | resolved context speichern | Fehlende optionale Quellen dürfen degradieren. |
| `hydrating_context` | `context.hydration_failed` | critical source missing | `failed` | Fehler speichern | Nur bei kritischem Fehler. |
| `ready` | `audio.assistant_speech_started` | greeting enabled | `speaking` | Begrüßung sprechen | Optional, aber Call-Mode-typisch. |
| `ready` | `audio.listening_started` | no greeting or greeting done | `listening` | Listening aktivieren | Hands-free startet. |
| `ready` | `audio.mute_enabled` | user action | `muted` | Mic muten | Kein User Turn. |
| `ready` | `call.pause_requested` | user action | `paused` | Audio halten | State muss erreichbar sein. |
| `listening` | `audio.user_speech_started` | `isMuted=false` | `user_speaking` | Segment starten | Hintergrundgeräusche ignorieren, wenn muted. |
| `listening` | `audio.mute_enabled` | user action | `muted` | Mic muten | Listening stoppt/ignoriert Input. |
| `listening` | `call.pause_requested` | user action | `paused` | Listening stoppen | Fortsetzbar. |
| `listening` | `call.end_requested` | user action | `ending` | Audio stoppen | Keine neuen Turns. |
| `user_speaking` | `audio.user_speech_finalized` | transcript not blank | `classifying_intent` | User Turn speichern | Whitespace ablehnen. |
| `user_speaking` | `audio.mute_enabled` | user action | `muted` | Segment verwerfen oder partial markieren | Kein finaler Turn ohne Finalisierung. |
| `classifying_intent` | `intent.classified` | intent=`normal_conversation` | `thinking` | Antwort generieren | Kein Tool nötig, wenn Kontext reicht. |
| `classifying_intent` | `intent.classified` | intent=`context_retrieval` oder `telegram_context_retrieval` oder `mission_control_lookup` | `retrieving_context` | Retrieval starten | Kurzansage erlaubt. |
| `classifying_intent` | `intent.classified` | intent=`web_research` | `researching_web` | Research starten | Web Search / Perplexity. |
| `classifying_intent` | `intent.classified` | intent=`work_order` | `creating_work_order` | Work Order anlegen | Confirmation guard beachten. |
| `classifying_intent` | `intent.classified` | intent=`clarification` | `thinking` | Rückfrage formulieren | Kurze Frage. |
| `retrieving_context` | `retrieval.completed` | answerable | `thinking` | Kontext in Prompt mergen | Quelle/Kontext intern speichern. |
| `retrieving_context` | `retrieval.not_found` | no context found | `speaking` | Nicht-Fund-Antwort sprechen | Keine Halluzination. |
| `retrieving_context` | `retrieval.failed` | recoverable | `speaking` | Fehler transparent sagen | Optional weitere Suche anbieten. |
| `researching_web` | `research.completed` | sufficient evidence | `thinking` | Quellen zusammenfassen | Links schriftlich speichern. |
| `researching_web` | `research.failed` | recoverable | `speaking` | Research-Fehler transparent sagen | Keine aktuellen Fakten erfinden. |
| `creating_work_order` | `work_order.completed` | sync result available | `speaking` | Ergebnis sprechen | Kurze Aufgaben. |
| `creating_work_order` | `work_order.created` | async task queued | `speaking` | gesprochene Bestätigung | Kein sichtbarer Mini-Status nötig. |
| `creating_work_order` | `work_order.needs_review` | side effect gated | `speaking` | Review-Hinweis sprechen | Keine externe Aktion ohne OK. |
| `thinking` | `assistant.response_ready` | response non-empty | `speaking` | Assistant Turn speichern, Audio starten | Natürlich kurz. |
| `thinking` | `assistant.generation_failed` | recoverable | `speaking` | Fehler-/Fallback-Antwort | Nicht als Retrievalfehler klassifizieren. |
| `speaking` | `audio.assistant_speech_finished` | call active | `listening` | Listening fortsetzen | Hands-free Loop. |
| `speaking` | `audio.barge_in_detected` | user speech confidence high | `interrupted` | Audio stoppen | Daniels Input priorisiert. |
| `speaking` | `audio.output_failed` | unrecoverable | `failed` | Fehler speichern | Optional Text-Fallback später. |
| `interrupted` | `audio.user_speech_started` | input active | `user_speaking` | neuen Turn aufnehmen | Alter Assistant Turn interrupted. |
| `interrupted` | `audio.user_speech_finalized` | transcript exists | `classifying_intent` | neuen Turn speichern | Falls Final schon vorliegt. |
| `muted` | `audio.mute_disabled` | call active | `listening` | Listening aktivieren | Zurück in Hands-free. |
| `muted` | `call.pause_requested` | user action | `paused` | Call halten | Mic bleibt aus. |
| `paused` | `call.resume_requested` | `isMuted=false` | `listening` | Listening aktivieren | Fortsetzung. |
| `paused` | `audio.mute_enabled` | user action | `muted` | Mute setzen | Bleibt ohne User Turns. |
| `paused` | `call.end_requested` | user action | `ending` | Audio stoppen | Teardown. |
| `speaking` | `call.end_requested` | user action | `ending` | Audio stoppen | Kein weiterer Loop. |
| `retrieving_context` | `audio.barge_in_detected` | user overrides wait | `interrupted` | Tool ggf. abbrechen/markieren | Daniel hat Vorrang. |
| `researching_web` | `audio.barge_in_detected` | user overrides wait | `interrupted` | Research ggf. abbrechen/weiter async | Daniel hat Vorrang. |
| `ending` | `call.audio_stopped` | audio closed | `persisting_artifacts` | Artifact pipeline starten | Transcript zuerst. |
| `persisting_artifacts` | `call.artifacts_persisted` | required minimum saved | `handoff_ready` | Handoff setzen | Partial failures erlaubt, wenn dokumentiert. |
| `persisting_artifacts` | `artifact.persistence_failed` | transcript not saved | `failed` | Fehler eskalieren | Transcript hat höchste Priorität. |
| `handoff_ready` | `call.completed` | handoff saved | `completed` | Session abschließen | Terminal. |
| `*` | `call.end_requested` | active non-terminal | `ending` | Stop listening/speaking | Globaler User Exit. |
| `*` | `call.failed` | unrecoverable | `failed` | Fehler speichern | Terminal fallback. |

---

## 5. Event Model

### 5.1 Required Events

| Event | Payload Minimum | Purpose |
|---|---|---|
| `call.start_requested` | `profileSlug`, `sourceSurface`, optional bindings | Call-Start protokollieren. |
| `call.session_created` | `voiceSessionId`, `profileSlug` | Session existiert. |
| `call.context_hydrated` | `voiceSessionId`, `contextSummary`, `sources[]` | Basiskontext verfügbar. |
| `call.ready` | `voiceSessionId` | Call ist bereit. |
| `audio.listening_started` | `voiceSessionId` | Listening aktiv. |
| `audio.user_speech_started` | `voiceSessionId` | User spricht. |
| `audio.user_speech_finalized` | `voiceSessionId`, `text` | Finaler User Turn. |
| `audio.assistant_speech_started` | `voiceSessionId`, `turnId` | Assistant spricht. |
| `audio.assistant_speech_finished` | `voiceSessionId`, `turnId` | Assistant-Audio fertig. |
| `audio.barge_in_detected` | `voiceSessionId`, `interruptedTurnId` | Daniel unterbricht. |
| `audio.mute_enabled` | `voiceSessionId` | Mic gemutet. |
| `audio.mute_disabled` | `voiceSessionId` | Mic wieder aktiv. |
| `intent.classified` | `voiceSessionId`, `turnId`, `intent`, `confidence` | Routingentscheidung. |
| `retrieval.started` | `voiceSessionId`, `query`, `sources[]` | Kontextsuche startet. |
| `retrieval.completed` | `voiceSessionId`, `resultSummary`, `sources[]` | Kontext gefunden. |
| `retrieval.not_found` | `voiceSessionId`, `query`, `sourcesChecked[]` | Kontext nicht gefunden. |
| `research.started` | `voiceSessionId`, `query`, `providers[]` | Research startet. |
| `research.completed` | `voiceSessionId`, `summary`, `evidence[]` | Research abgeschlossen. |
| `research.failed` | `voiceSessionId`, `safeError` | Research gescheitert. |
| `work_order.created` | `workOrderId`, `voiceSessionId`, `requestedOutput` | Work Order angelegt. |
| `work_order.completed` | `workOrderId`, `artifacts[]` | Work Order fertig. |
| `work_order.needs_review` | `workOrderId`, `reason` | Review nötig. |
| `call.end_requested` | `voiceSessionId`, `requestedBy` | Call-Ende. |
| `call.audio_stopped` | `voiceSessionId` | Audio beendet. |
| `call.artifacts_persisted` | `voiceSessionId`, `artifacts[]` | Pflichtartefakte gespeichert. |
| `call.handoff_ready` | `voiceSessionId`, `handoffReference` | Handoff auflösbar. |
| `call.completed` | `voiceSessionId` | Erfolgreich beendet. |
| `call.failed` | `voiceSessionId`, `safeError`, optional `partialArtifacts[]` | Terminaler Fehler. |

### 5.2 Additional Recommended Events

| Event | Purpose |
|---|---|
| `context.hydration_started` | Start der Basiskontextladung. |
| `context.hydration_failed` | Kontextladung fehlgeschlagen. |
| `assistant.generation_started` | Modell-/Agent-Antwort startet. |
| `assistant.response_ready` | Antwort ist erzeugt. |
| `assistant.generation_failed` | Antwortgenerierung fehlgeschlagen. |
| `voice.turn_user_committed` | User Turn dauerhaft gespeichert. |
| `voice.turn_assistant_committed` | Assistant Turn dauerhaft gespeichert. |
| `voice.assistant_interrupted` | Assistant Turn wurde unterbrochen. |
| `voice.state_changed` | State Transition protokolliert. |
| `call.transcript_saved` | Transcript gespeichert. |
| `call.summary_created` | Summary erzeugt. |
| `call.memory_created` | Memory Entry erzeugt. |
| `call.decisions_extracted` | Decisions extrahiert. |
| `call.produces_extracted` | Produces extrahiert. |
| `call.tags_created` | Topic/Tags erzeugt. |
| `voice.telegram_handoff_reference_created` | Telegram-Handoff-Referenz geschrieben. |
| `artifact.persistence_partial_failed` | Teilfehler bei Artefakten. |
| `voice.error_recorded` | Fehler sicher/sanitized persistiert. |

---

## 6. Intent Routing State Flow

Nach `audio.user_speech_finalized` läuft immer:

`user_speaking` → `classifying_intent` → intentabhängiger Pfad.

| Intent | State Path | Ergebnis |
|---|---|---|
| `normal_conversation` | `classifying_intent` → `thinking` → `speaking` → `listening` | Direkte Antwort. |
| `context_retrieval` | `classifying_intent` → `retrieving_context` → `thinking`/`speaking` → `listening` | Antwort mit internem Kontext oder Nicht-Fund. |
| `telegram_context_retrieval` | `classifying_intent` → `retrieving_context` → `thinking`/`speaking` → `listening` | Telegram Bridge + jüngste Nachrichten. |
| `mission_control_lookup` | `classifying_intent` → `retrieving_context` → `thinking`/`speaking` → `listening` | MC-Datenantwort. |
| `web_research` | `classifying_intent` → `researching_web` → `thinking` → `speaking` → `listening` | Research-Antwort mit kurzer Quellen-Nennung. |
| `work_order` | `classifying_intent` → `creating_work_order` → `speaking` → `listening` | Gesprochene Bestätigung, Ergebnis oder Review-Hinweis. |
| `clarification` | `classifying_intent` → `thinking` → `speaking` → `listening` | Kurze Rückfrage. |

Multi-Intent-Regel:

1. Erst fachlich nötiges Retrieval/Research ausführen.
2. Dann Work Order erzeugen, wenn Daniel ein Output verlangt.
3. Wenn Work Order länger dauert, asynchron fortsetzen und im Call nur kurz bestätigen.

---

## 7. Retrieval Flow

### 7.1 Default Same-Day Retrieval

State Path:

`classifying_intent` → `retrieving_context` → `thinking` → `speaking` → `listening`

Default Window:

- aktueller Tag
- aktiver Profilkontext zuerst
- zugeordneter Telegram-Kontext
- Daily Logs / Memory
- Mission-Control-Objekte
- jüngste Voice-Call-Summaries

### 7.2 Explicit Historical Retrieval

Wenn Daniel einen Zeitraum nennt, überschreibt der Zeitraum den Default.

Beispiele:

| Phrase | Retrieval Guard |
|---|---|
| „gestern“ | Vortag laden. |
| „letzte Woche“ | Woche laden. |
| „im letzten Sales Call“ | letzter Call im Profil `sales_support`. |
| „damals bei LUMA“ | LUMA-Historie; Rückfrage bei Unklarheit. |

### 7.3 Profile-Bound Retrieval

Ohne expliziten Cross-Profile-Hinweis sucht Hermes nur im aktiven Profil.

Profilbindings:

| Profile | Telegram Context |
|---|---|
| `main` | `485318478` |
| `sales_support` | `-1003998265477` / `23` |
| `luma` | `-1003998265477` / `24` |

### 7.4 Cross-Profile Retrieval

Erlaubt wenn:

- Daniel anderes Profil nennt, oder
- Frage eindeutig außerhalb des aktiven Profils liegt und Hermes kurz bestätigt.

State Path:

`retrieving_context` bleibt aktiv; Context Router lädt zusätzlichen Profilkontext temporär. Der aktive Call-Kontext wechselt nicht dauerhaft, außer Daniel verlangt es.

### 7.5 Missing Context Handling

Wenn nichts gefunden wird:

1. `retrieval.not_found` speichern.
2. Hermes spricht transparent.
3. Keine erfundene Erinnerung.
4. Optional anbieten, weiter zurück zu suchen.

Beispiel:

> „Dazu finde ich im heutigen LUMA-Kontext nichts Belastbares. Soll ich weiter zurück suchen?“

### 7.6 Spoken Retrieval Phrase

Bei aktivem Retrieval darf Hermes vor oder am Anfang von `retrieving_context` sagen:

> „Ich schau kurz nach.“

Das ist ein kurzer Assistant Turn oder eine Realtime-Statusäußerung, kein finales Ergebnis.

---

## 8. Research Flow

### 8.1 Web Search

Nutzung:

- gezielte, quellennahe Suche
- aktuelle Nachrichten
- Primärquellen / Originalquellen

State Path:

`classifying_intent` → `researching_web` → `thinking` → `speaking`

### 8.2 Perplexity

Nutzung:

- schnelle Synthese mehrerer Quellen
- Überblick über unklare Themen
- Plausibilisierung mit Web Search bei wichtigen oder strittigen Themen

### 8.3 Quellenpriorisierung

Deutschsprachige Themen:

1. Primärquellen
2. Tagesschau / ARD / ZDF / Deutschlandfunk
3. Handelsblatt, FAZ, Süddeutsche, Zeit, Spiegel, Wirtschaftswoche
4. relevante Fachquellen
5. weitere Quellen nur mit Unsicherheitsmarkierung

US-/internationale Themen:

1. Primärquellen
2. Reuters, Associated Press, BBC, Financial Times, NYT, WSJ, Washington Post, Economist
3. seriöse Spezialquellen
4. weitere Quellen nur mit Unsicherheitsmarkierung

### 8.4 Spoken Source Summary

Voice-Antworten nennen Quellen kurz.

Beispiel:

> „Kurz: … Nachgeschaut bei Reuters und tagesschau.de.“

### 8.5 Written Evidence / Direct Links

Nach `research.completed` speichert Hermes:

- Link
- Titel
- Domain
- Zeitpunkt
- kurze Nutzungsnotiz

Speicherorte:

- Call Summary
- Research Artifact
- Telegram Handoff
- Work Order Output

### 8.6 Failure Handling

Bei Research-Fehler:

1. `research.failed` speichern.
2. Hermes sagt transparent, dass die Recherche nicht belastbar abgeschlossen wurde.
3. Keine aktuellen Fakten aus Gedächtnis behaupten.
4. Optional: asynchronen Research-Work-Order anbieten.

---

## 9. Work Order Flow

### 9.1 Synchronous Work Order

Für kurze Aufgaben.

State Path:

`classifying_intent` → `creating_work_order` → `speaking` → `listening`

Beispiele:

- kurze Zusammenfassung erstellen
- Open Question ergänzen
- kleines Markdown-Artefakt anlegen

Behavior:

- Hermes führt aus.
- Ergebnis wird gesprochen oder referenziert.
- Output-Pfad / Artifact-ID wird gespeichert.

### 9.2 Asynchronous Work Order

Für längere Aufgaben.

State Path:

`classifying_intent` → `creating_work_order` → `speaking` → `listening`

Behavior:

- Work Order wird angelegt.
- `hasOpenWorkOrder=true`.
- Hermes bestätigt nur kurz gesprochen.
- Ergebnis kommt später als Artefakt / Handoff.
- Kein sichtbarer Mini-Status im Call erforderlich.

### 9.3 Status Lifecycle

| Status | State-Machine-Bezug |
|---|---|
| `drafted` | `creating_work_order`, wenn Auftrag erkannt aber nicht ausgeführt. |
| `queued` | `creating_work_order`, wenn asynchron geplant. |
| `running` | Hintergrundausführung nach Call oder parallel. |
| `needs_review` | `creating_work_order` → `speaking` mit Review-Hinweis. |
| `completed` | `work_order.completed`; Ergebnis referenzierbar. |
| `failed` | `work_order.failed`; Fehler transparent speichern. |

### 9.4 Spoken Confirmation Only

Für längere Work Orders reicht:

> „Alles klar, ich lege das als Auftrag an und gebe dir das Ergebnis im Handoff.“

### 9.5 Handoff Output

Jeder offene oder abgeschlossene Work Order wird im Call-End-Handoff referenziert mit:

- Work Order ID
- Status
- Requested Output
- Artifact Links / Pfade
- Needs Review Flag

### 9.6 Needs-Review Handling

Wenn Side Effects unklar, extern, irreversibel, kostenpflichtig oder rechtlich/finanziell relevant sind:

- `needsConfirmation=true`
- Work Order Status `needs_review`
- Hermes fragt kurz nach oder legt Draft an
- keine Ausführung ohne Daniel-OK

---

## 10. Barge-In / Interruptibility Flow

### 10.1 Grundregel

Wenn Daniel spricht, während Hermes spricht, hat Daniel Vorrang.

### 10.2 State Path

Normal:

`speaking` → `interrupted` → `user_speaking` → `classifying_intent`

Bei laufendem Tool-Warten:

`retrieving_context` / `researching_web` → `interrupted` → `user_speaking`

### 10.3 Audio Handling

Bei `audio.barge_in_detected`:

1. Assistant Audio sofort stoppen.
2. Aktuellen Assistant Turn als interrupted markieren.
3. Mikrofoninput priorisieren.
4. Neuen User Turn aufnehmen.
5. Laufende Retrieval-/Research-Tasks abbrechen oder als stale markieren, wenn sie nur für die unterbrochene Antwort relevant waren.
6. Bereits explizit als Work Order angelegte längere Aufgaben dürfen asynchron weiterlaufen und werden im Handoff referenziert.

### 10.4 New User Turn Priority

Der neue User Turn ersetzt den bisherigen Gesprächsfokus.

Hermes darf nicht nach dem Barge-in einfach mit der alten Antwort fortfahren, außer Daniel verlangt es ausdrücklich.

### 10.5 Stored Events

Mindestens speichern:

- `audio.barge_in_detected`
- `voice.assistant_interrupted`
- optional `tool.cancelled_due_to_barge_in`
- neuer `voice.turn_user_committed`

---

## 11. Mute Flow

### 11.1 Mute aktivieren

Entscheidung V1: Mute wird primär als persistiertes Flag `isMuted` modelliert. Der fachliche Lifecycle-State bleibt erhalten (`listening`, `speaking`, `paused` usw.); die UI darf den sichtbaren Overlay-Zustand „Muted“ zeigen.

Actions:

- `isMuted=true`
- aktuellen Lifecycle-State beibehalten
- Mic input stoppen oder ignorieren
- keine User-Turn-Erzeugung
- kein Barge-in, solange Mute aktiv ist
- `audio.mute_enabled` speichern

### 11.2 Mute deaktivieren

Actions:

- `isMuted=false`
- wenn Call aktiv und nicht paused/ending ist: Listening wieder aktivieren
- `audio.mute_disabled` speichern

### 11.3 Hintergrundgeräusche

Wenn `isMuted=true`:

- kein `audio.user_speech_started`
- kein `audio.user_speech_finalized`
- kein Turn
- kein Barge-in

### 11.4 Wenn Hermes spricht und Daniel muted

Mute betrifft Daniels Mikrofoninput, nicht zwingend Hermes' Ausgabe.

Regel:

- Hermes darf weiter sprechen.
- Barge-in ist während aktivem Mute deaktiviert.
- Daniel kann trotzdem Call beenden.

### 11.5 Erlaubte Transitions bei aktivem Mute

Da Mute primär ein Flag ist, bleibt der eigentliche Lifecycle-State erhalten.

- aus `listening` mit `isMuted=true`: keine User Turns; bei Unmute zurück zu normalem Listening
- aus `speaking` mit `isMuted=true`: Hermes darf fertig sprechen; Barge-in bleibt deaktiviert
- aus `paused` mit `isMuted=true`: Pause bleibt bestehen; Unmute ändert nicht automatisch Resume
- aus jedem aktiven State: `call.end_requested` → `ending`

---

## 12. Call-End Pipeline

### 12.1 State Flow

`listening` / `speaking` / `paused` / `muted` / `thinking` / Tool-State  
→ `ending`  
→ `persisting_artifacts`  
→ `handoff_ready`  
→ `completed`

### 12.2 Pipeline Steps

1. **End request**
   - Event: `call.end_requested`
   - keine neuen User Turns mehr zulassen

2. **Stop listening/speaking**
   - Events: `call.audio_stopped`, ggf. `voice.assistant_interrupted`
   - offene Audioausgabe beenden

3. **Save transcript**
   - Event: `call.transcript_saved`
   - höchste Priorität

4. **Generate summary**
   - Event: `call.summary_created`
   - menschenlesbare Call-Zusammenfassung

5. **Extract decisions**
   - Event: `call.decisions_extracted`
   - klare Festlegungen speichern

6. **Extract produces**
   - Event: `call.produces_extracted`
   - erzeugte oder angestoßene Outputs speichern

7. **Generate memory entry**
   - Event: `call.memory_created`
   - kompakter Memory-/Daily-Log-kompatibler Eintrag

8. **Generate topic/tags**
   - Event: `call.tags_created`
   - Hauptthema plus 1–5 Tags

9. **Create Telegram handoff reference**
   - Event: `voice.telegram_handoff_reference_created`
   - enthält Profil, Telegram Binding, Summary/Transcript/Memory, Work Orders

10. **Mark handoff ready**
   - Event: `call.handoff_ready`
   - `handoffAvailable=true`

11. **Complete call**
   - Event: `call.completed`
   - Terminal State `completed`

### 12.3 Handoff Freshness Rule

Ein Handoff gilt als „letzter Call“, bis ein weiterer Call im gleichen Kontext gemacht wurde.

Kontextschlüssel:

- `profileSlug`
- Telegram Chat ID
- optional Topic/Message ID
- optional Project/Account/Deal Binding

---

## 13. Failure and Recovery Logic

### 13.1 Context Hydration Failure

- Nicht-kritische Quellen dürfen leer degradieren.
- Kritische Profil-/Sessionfehler führen zu `failed`.
- Daniel hört: „Ich konnte den Kontext gerade nicht laden.“

### 13.2 Retrieval Failure

- `retrieval.failed` speichern.
- Wenn andere Quellen verfügbar sind, eingeschränkt antworten.
- Daniel hört: „Ich finde den Kontext gerade nicht belastbar.“

### 13.3 Research Failure

- `research.failed` speichern.
- Keine aktuellen Fakten erfinden.
- Daniel hört: „Die Recherche hat gerade nicht sauber geklappt; ich kann es als Auftrag nachziehen.“

### 13.4 Assistant Generation Failure

- `assistant.generation_failed` speichern.
- Wenn möglich kurze Fehlerantwort sprechen.
- Keine erfolgreiche `voice.turn_assistant_committed` für fehlgeschlagene Antwort.

### 13.5 Audio Input Failure

- Listening stoppen.
- Optional Text-Fallback anbieten.
- Wenn nicht recoverable: `failed` oder `ending` bei User-Ende.

### 13.6 Audio Output Failure

- Assistant Turn kann textlich gespeichert bleiben.
- Daniel soll nicht den Eindruck bekommen, Hermes habe gesprochen.
- Optional Replay/Text-Fallback später in Frontend-Spec.

### 13.7 Artifact Persistence Failure

Priorität:

1. Transcript
2. Summary
3. Memory
4. Decisions/Produces
5. Handoff

Wenn Transcript gespeichert ist, aber spätere Schritte scheitern:

- `artifact.persistence_partial_failed`
- möglichst `handoff_ready` mit Partial-Flag
- Daniel nicht fälschlich „alles gespeichert“ melden

Wenn Transcript nicht gespeichert werden kann:

- `artifact.persistence_failed`
- `failed`
- Retry/manuelle Wiederherstellung nötig

### 13.8 Partial Call-End Failure

Partial Completion ist erlaubt, wenn:

- Transcript vorhanden
- Fehler dokumentiert
- Handoff entweder verfügbar oder klar als fehlgeschlagen markiert

---

## 14. Persistence Events

### 14.1 Session State Changes

- `voice.state_changed`
- `call.start_requested`
- `call.session_created`
- `call.ready`
- `call.end_requested`
- `call.completed`
- `call.failed`

### 14.2 Transcript Turns

- `voice.turn_user_committed`
- `voice.turn_assistant_committed`
- `voice.assistant_interrupted`
- optional interim transcript events nur für Debug

### 14.3 Tool / Retrieval Events

- `retrieval.started`
- `retrieval.completed`
- `retrieval.not_found`
- `retrieval.failed`
- `context.hydration_started`
- `context.hydration_completed`
- `context.hydration_failed`

### 14.4 Research Evidence

- `research.started`
- `research.completed`
- `research.failed`
- `research.evidence_saved`

### 14.5 Work Order Events

- `work_order.created`
- `work_order.completed`
- `work_order.needs_review`
- `work_order.failed`

### 14.6 Call-End Artifact Events

- `call.transcript_saved`
- `call.summary_created`
- `call.memory_created`
- `call.decisions_extracted`
- `call.produces_extracted`
- `call.tags_created`
- `call.artifacts_persisted`
- `artifact.persistence_partial_failed`
- `artifact.persistence_failed`

### 14.7 Handoff Events

- `voice.telegram_handoff_reference_created`
- `call.handoff_ready`

### 14.8 Error Events

- `voice.error_recorded`
- `audio.input_failed`
- `audio.output_failed`
- `assistant.generation_failed`
- `research.failed`
- `retrieval.failed`

---

## 15. Acceptance Criteria

- Jeder State ist erreichbar oder bewusst als terminal/fallback markiert.
- Keine toten States im Primary State Model.
- `paused` ist erreichbar aus aktiven Call-Zuständen, auch wenn es primär technischer Hold ist.
- Jeder wichtige Business-Logic-Flow hat einen State-Pfad.
- Barge-in ist State-Machine-Verhalten: `speaking` → `interrupted` → `user_speaking`.
- Bei Barge-in stoppt Hermes sofort seine Audio-Ausgabe und hört wieder zu.
- Mute wird als persistiertes Flag modelliert und verhindert User-Turn-Erzeugung sowie Barge-in.
- Call-Ende persistiert auch bei Teilfehlern so viel wie möglich.
- Transcript-Speicherung hat höchste Priorität in der Call-End-Pipeline.
- Missing Context führt zu `retrieval.not_found` und transparenter Antwort, nicht zu Halluzination.
- Research-Antworten speichern Evidence und nennen Quellen kurz im Call.
- Work Orders können synchron oder asynchron enden.
- Asynchrone Work Orders erzeugen eine gesprochene Bestätigung und Handoff-Referenz.
- Handoff ist nach Call-Ende über Profil + Telegram Binding auflösbar.
- „Letzter Call“ gilt bis zum nächsten Call im gleichen Kontext.
- Die Spec kann direkt in Backend-State-Machine-Tests übersetzt werden.

---

## 16. Resolved Questions / Assumptions

### Assumptions

- **A01:** `paused` bleibt ein eigener erreichbarer State, obwohl Daniel primär Start/Ende/Mute braucht.  
  **Reason:** Backend-Skill und robuste Call-Orchestrierung verlangen erreichbare Pause-/Resume-Pfade.  
  **Risk if wrong:** UI könnte Pause weglassen; Backend kann den State trotzdem für technische Holds nutzen.

- **A02:** Retrieval-/Research-Kurzansagen können entweder als Assistant Turn oder als Realtime-Statusäußerung persistiert werden.  
  **Reason:** Die Business Logic verlangt hörbare Signalisierung, aber keine technische Transportentscheidung.  
  **Risk if wrong:** Transcript könnte Statusäußerungen anders behandeln müssen.

### Resolved Follow-up Questions

- **Q31:** Bei Barge-in stoppt Hermes sofort seine Audio-Ausgabe und hört wieder zu. Laufende Retrieval-/Research-Tasks werden abgebrochen oder als stale markiert, wenn sie nur für die unterbrochene Antwort relevant waren. Bereits explizit als Work Order angelegte längere Aufgaben dürfen asynchron weiterlaufen.
- **Q32:** Mute wird primär als persistiertes Flag `isMuted` modelliert, nicht als alleiniger persisted Lifecycle-State. Die UI darf dennoch sichtbar „Muted“ zeigen. Während `isMuted=true` entstehen keine User Turns und kein Barge-in.
