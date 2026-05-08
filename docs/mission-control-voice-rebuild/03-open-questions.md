# Mission Control Voice Rebuild — 03 Open Questions

**Status:** Laufendes Arbeitsdokument — Voice-Antworten von Daniel eingearbeitet  
**Quelle:** `01-big-picture-vision.md`, `02-extraction.md`, Daniels Voice-Antworten vom 08.05.2026  
**Zweck:** Offene Fragen sammeln, Entscheidungen dokumentieren und Unklarheiten für die nächsten Specs sichtbar halten.

---

## 0. Hinweis zur Quelle

Für Daniels letzte Voice-Antworten wurde kein `VOICE_CALL_MEMORY_V1` / `type: voice_call` Eintrag in den Daily Logs gefunden. Die folgenden Antworten basieren daher auf den direkt übergebenen Voice-Message-Transkripten im Telegram-Chat.

Einige Stellen in den Transkripten waren automatisch falsch erkannt oder abgebrochen. Klare Aussagen wurden als Entscheidung eingetragen; unklare Stellen bleiben offen. Die bereinigten Arbeits-Transkripte stehen im Anhang dieses Dokuments.

---

## 1. Produkt & Zielbild

### Q01 — Was ist der erste wirklich nutzbare MVP?

Soll der erste MVP bereits echten Research, Telegram-Kontext und Call-Handoff können, oder reicht zunächst ein sauberer Mission-Control-Kontext-Call mit Transcript/Summary?

**Antwort / Entscheidung:**  
Version 1 soll bereits enthalten:

- Research
- Telegram-Kontext
- Call-Handoff

Ein reiner Mission-Control-Kontext-Call mit Transcript/Summary reicht nicht aus.

**Status:** beantwortet  
**Relevanz:** Scope / Priorisierung

---

### Q02 — Welche Kontextprofile gehören in Version 1?

Genannt wurden:

- Hauptchat / Hermes
- Sales Support
- Telegram Chat
- LUMA

Müssen alle vier in Version 1 funktionieren, oder priorisieren wir 1–2 Profile?

**Antwort / Entscheidung:**  
Version 1 soll direkt diese Profile können:

- Hauptchat / Hermes
- Sales Support
- LUMA

Diese drei sollen direkt funktionieren.

**Anmerkung:**  
„Telegram Chat“ wird nicht als eigenständiges Version-1-Profil priorisiert, sondern als Kontextquelle für alle Profile behandelt. Siehe Q03.

**Status:** beantwortet  
**Relevanz:** MVP-Scope

---

### Q03 — Soll „Telegram Chat“ ein eigener Kontext sein oder eine Kontextquelle für alle Profile?

Variante A: Telegram ist ein auswählbares Profil.  
Variante B: Telegram ist eine Datenquelle, die jedes Profil bei Bedarf nutzen kann.  
Variante C: beides.

**Antwort / Entscheidung:**  
Telegram Chat bleibt zunächst eine Kontextquelle für alle Profile.

Beispiel:

- Wenn Daniel Sales Support Voice öffnet, soll der entsprechende Sales-Support-Telegram-Kontext geladen sein.
- Wenn Daniel Main / Hermes Voice öffnet, soll der Main-Telegram-Kontext geladen sein.
- Wenn Daniel LUMA Voice öffnet, soll der LUMA-relevante Telegram-Kontext geladen sein.

**Status:** beantwortet  
**Relevanz:** Kontextmodell

---

### Q04 — Wie viel „Telefongefühl“ ist für den ersten Release nötig?

Reicht ein verbesserter Push-to-talk/turn-based Flow, oder muss der erste Release hands-free mit automatischem Zuhören/Sprechen funktionieren?

**Antwort / Entscheidung:**  
Hands-free ist ein Muss. Version 1 soll mit automatischem Zuhören und Sprechen funktionieren.

**Implikation:**  
Ein reiner Push-to-talk-Flow ist nicht ausreichend für den Ziel-MVP. Text-Fallback ist erlaubt, aber nicht die Hauptinteraktion.

**Status:** beantwortet  
**Relevanz:** UX / technische Komplexität

---

## 2. Kontext & Memory

### Q05 — Welche Quellen definieren den „gleichen Kontext wie im Telegram-Chat“?

Mögliche Quellen:

- aktuelle Telegram-Session
- jüngste Telegram-Nachrichten
- gespeicherte Daily Logs
- Hermes Session Search
- Mission-Control-Memory
- Voice-Call-Summaries

Was davon ist Pflicht für Version 1?

**Antwort / Entscheidung:**  
Für Version 1 müssen mindestens rein:

- aktuelle Telegram-Session
- jüngste Telegram-Nachrichten
- Daily Logs
- Hermes Session Search
- Mission-Control-Memory

**Offen / Ergänzung nötig:**  
Ob Voice-Call-Summaries ebenfalls Pflichtquelle für V1 sind, ist wahrscheinlich ja, wurde aber in der transkribierten Antwort nicht eindeutig bestätigt.

**Status:** teilweise beantwortet  
**Relevanz:** Retrieval-Architektur

---

### Q06 — Wie wird der aktuelle Telegram-Kontext technisch verfügbar gemacht?

Optionen:

- Telegram-Handoff-Bridge
- Session Search / Hermes Memory
- explizite Call-Summary-Einträge
- lokale Daily Logs
- Mission-Control-DB-Sync

**Antwort / Entscheidung:**  
Daniel hat diese Frage an Hermes zurückgespielt: Hermes soll den besten Vorschlag machen.

**Vorschlag für Version 1:**  
Hybrid-Ansatz aus drei Schichten:

1. **Telegram Context Bridge**  
   Persistente Zuordnung zwischen Voice-Profil und relevantem Telegram-Chat/Topic, damit `main`, `sales_support` und `luma` jeweils ihren passenden Chat-Kontext finden.

2. **Hermes Session Search als Freshness-Layer**  
   Für Fragen nach „gerade eben“, „vor zehn Minuten“, „gestern im Chat“ wird Session Search genutzt, weil dort die tatsächlichen Chatverläufe am ehesten auffindbar sind.

3. **Mission-Control-Memory / Daily Logs als Durable-Layer**  
   Zusammenfassungen, Entscheidungen, Calls und Artefakte werden dauerhaft in Mission Control referenzierbar gemacht.

**Warum dieser Vorschlag:**  
Nur Mission-Control-Memory wäre zu langsam/indirekt für sehr frische Telegram-Kontexte. Nur Session Search wäre zu wenig strukturiert für Handoff und Produktlogik. Die Bridge verbindet Profilwahl, aktuelle Chatquelle und dauerhafte Artefakte.

**Status:** Vorschlag offen zur Bestätigung  
**Relevanz:** Machbarkeit

---

### Q07 — Wie lange zurück soll Live-Retrieval standardmäßig suchen?

Beispiele:

- letzte 10 Minuten
- aktueller Tag
- letzte 24 Stunden
- letzte relevante Session unabhängig vom Datum

**Antwort / Entscheidung:**  
Standardmäßig reicht der aktuelle Tag.

Daniel kann bei Bedarf explizit weiter in die Vergangenheit schicken, z. B. „gestern“, „letzte Woche“, „im letzten Sales Call“.

**Status:** beantwortet  
**Relevanz:** Antwortqualität / Performance

---

### Q08 — Wie erkennt Hermes, welcher Kontext relevant ist?

Muss Daniel explizit sagen „im Telegram-Chat“ / „bei LUMA“ / „gestern im Sales Call“, oder soll Hermes automatisch quer suchen?

**Antwort / Entscheidung:**  
Der gewählte Voice-Kontext bestimmt den primären Telegram-Kontext automatisch.

Beispiele:

- Sales Support Voice → entsprechender Sales-Support-Telegram-Kontext
- Main / Hermes Voice → Main-Telegram-Kontext
- LUMA Voice → LUMA-Kontext inkl. passendem Telegram-/Mission-Control-Kontext

Daniel muss also nicht jedes Mal explizit sagen, welcher Telegram-Kontext gemeint ist, solange das gewählte Profil eindeutig ist.

**Offen:**  
Wie Hermes reagiert, wenn eine Frage offensichtlich außerhalb des aktiven Profils liegt.

**Status:** größtenteils beantwortet  
**Relevanz:** UX / Retrieval-Logik

---

### Q09 — Wie werden frühere Voice Calls gespeichert?

Benötigt wird mindestens:

- Transcript
- Summary
- Datum/Uhrzeit
- Kontextprofil
- wichtige Themen
- ggf. erzeugte Artefakte

Offen ist: Wo liegt die Quelle der Wahrheit — DB, Memory Markdown, beides?

**Antwort / Entscheidung:**  
Nach jedem Voice Call sollen entsprechende Artefakte erstellt werden mit mindestens:

- Entscheidungen
- erzeugten bzw. angestoßenen Artefakten / Produces
- Datum und Uhrzeit
- Tag bzw. Thema des Calls

**Vorschlag für Quelle der Wahrheit:**  
DB als strukturierte Quelle für Session, Transcript, Turns, Events und Profile; Markdown/Memory als menschenlesbare, referenzierbare Summary mit Entscheidungen und Artefakten.

**Status:** teilweise beantwortet, Architekturvorschlag offen zur Bestätigung  
**Relevanz:** Persistenz / Handoff

---

## 3. Live Retrieval & Research

### Q10 — Wann ist eine Frage Retrieval und wann Research?

Beispiele:

- „Was haben wir gerade besprochen?“ → Retrieval
- „Was ist heute im Iran passiert?“ → Research
- „Was ist der Stand bei LUMA?“ → Kontext-Retrieval, ggf. mit Datenbank

Braucht es eine explizite Intent-Klassifikation?

**Antwort / Entscheidung:**  
Ja, Intent-Klassifikation macht Sinn.

**Erste Intent-Klassen:**

- `context_retrieval`
- `telegram_context_retrieval`
- `mission_control_lookup`
- `web_research`
- `work_order`
- `clarification`
- `normal_conversation`

**Status:** beantwortet  
**Relevanz:** Business Logic

---

### Q11 — Wie soll Hermes eine Suchphase signalisieren?

Möglichkeiten:

- kurze gesprochene Bestätigung: „Ich schaue kurz nach.“
- UI-Status: „Recherche läuft“
- Sound / Earcon
- stille Pause mit Animation

**Antwort / Entscheidung:**  
Eine kurze gesprochene Bestätigung ist okay, z. B.:

> „Ich schau kurz nach.“

**Offen:**  
Ob zusätzlich ein Sound/Earcon oder sichtbarer UI-Status nötig ist.

**Status:** teilweise beantwortet  
**Relevanz:** Call-Gefühl

---

### Q12 — Wie lang darf eine Research-/Retrieval-Pause dauern?

Daniel erwähnte sinngemäß eine kurze Pause von wenigen Sekunden. Muss es ein hartes Zeitbudget geben?

Mögliche Stufen:

- < 2 Sekunden: sofortige Antwort
- 2–5 Sekunden: kurzer Suchmodus
- > 5 Sekunden: Zwischenstand oder Follow-up ankündigen

**Antwort / Entscheidung:**  
Aus der Voice-Antwort ging klar hervor: Eine kurze Ansage wie „Ich schau kurz nach“ ist okay. Ein konkretes hartes Zeitbudget wurde nicht eindeutig bestätigt.

**Vorschlag:**  
Für Business Logic zunächst mit Zeitstufen arbeiten:

- bis 2 Sekunden: direkt antworten
- 2–5 Sekunden: Suchmodus mit kurzer Ansage
- ab 5 Sekunden: Zwischenstand geben oder asynchronen Follow-up vorschlagen

**Status:** Vorschlag offen zur Bestätigung  
**Relevanz:** UX / Systemverhalten

---

### Q13 — Welche Quellen darf Web-Research nutzen?

Offen:

- Web Search
- spezifische News-Quellen
- Perplexity/Grok/etc.
- vorhandene Hermes-Webtools
- keine ungeprüften Quellen ohne Hinweis

**Antwort / Entscheidung:**  
Hermes soll für Web-Research nutzen können:

- Web Search
- Perplexity

Bei News-/Current-Events-Recherche soll Hermes bevorzugt belastbare Leitmedien und etablierte Quellen nutzen. Für deutschsprachige Themen insbesondere:

- deutsche Leitmedien / große Verlagshäuser
- öffentlich-rechtliche Quellen, z. B. Tagesschau / ARD / ZDF

Für internationale bzw. US-Themen entsprechend große amerikanische Leitmedien und etablierte Quellen.

**Status:** beantwortet  
**Relevanz:** Faktenqualität

---

### Q14 — Wie wird Quellenqualität im Voice-Modus kommuniziert?

Soll Hermes Quellen im Call nennen, nur Unsicherheit markieren oder zusätzlich eine schriftliche Quellenliste in Mission Control/Telegram ablegen?

**Antwort / Entscheidung:**  
Im Voice Call soll Hermes nach der Antwort kurz sagen, wo er nachgeschaut hat. Es reicht eine knappe Quellen-Nennung, z. B.:

> „Nachgeschaut bei tagesschau.de und CNN.“

Zusätzlich soll Daniel im Nachgang bei Bedarf die Direktlinks bekommen können, um selbst zu prüfen.

**Implikation:**  
Voice-Antwort bleibt kurz; Quellen-Details werden als schriftlicher Follow-up / Summary / Handoff verfügbar gemacht.

**Status:** beantwortet  
**Relevanz:** Vertrauen / Nachvollziehbarkeit

---

## 4. Handoff & Folgearbeit

### Q15 — Was passiert genau beim Call-Ende?

Mögliche Outputs:

- Transcript speichern
- Summary schreiben
- Memory-Eintrag erzeugen
- Telegram-Handoff-Kontext setzen
- Tasks/Specs nur als Draft vorbereiten

Was ist Pflicht?

**Antwort / Entscheidung:**  
Pflicht beim Call-Ende:

1. Transcript speichern
2. Summary-Artefakt erzeugen
3. Memory-Eintrag erzeugen
4. Telegram-Handoff aufsetzen
5. Entscheidungen festhalten
6. Produces / erzeugte oder angestoßene Artefakte festhalten
7. Datum und Uhrzeit speichern
8. Thema / Tags des Calls erfassen

**Status:** beantwortet  
**Relevanz:** Workflow

---

### Q16 — Wie referenziert Telegram den letzten Call?

Mögliche Mechaniken:

- „letzter Voice Call“ über Session-ID
- Daily Log Memory Entry
- Mission-Control-API für recent voice session
- Telegram-Handoff-Bridge

**Antwort / Entscheidung:**  
Daniel überlässt die konkrete Lösung Hermes.

**Entscheidung für V1:**  
Telegram referenziert den letzten Call über eine Kombination aus:

- `voice_session_id` als technische Primärreferenz
- Profil-/Chat-Zuordnung über Telegram-Handoff-Bridge
- `memory_path` zur menschenlesbaren Call-Summary
- `topic` / Tags für schnelle natürliche Referenz

**Zielverhalten:**  
Wenn Daniel nach einem Call in Telegram sagt „wir haben gerade über Thema X gesprochen“, kann Hermes den letzten passenden Voice Call anhand von Chat/Thread, Profil, Zeitnähe und Thema wiederfinden.

**Status:** entschieden für V1
**Relevanz:** Cross-Surface Continuity

---

### Q17 — Darf Hermes nach einem Voice Call automatisch Dateien oder Tasks erstellen?

Oder soll Hermes immer erst einen Draft erstellen und Daniel um Bestätigung bitten?

**Antwort / Entscheidung:**  
Hermes darf gerne Dateien oder Aufgaben erstellen, wenn Daniel das im Call klar beauftragt.

**Sicherheitsregel für V1:**

- interne Arbeitsartefakte wie Specs, Summaries, Open Questions, Draft-Tasks dürfen erstellt werden
- externe Aktionen oder irreversible Side Effects brauchen weiterhin explizite Bestätigung
- unklare Aufträge werden als Draft / `needs_review` abgelegt

**Status:** beantwortet
**Relevanz:** Side Effects / Sicherheit

---

### Q18 — Wie werden während des Calls gestartete Arbeitsaufträge nachverfolgt?

Beispiele:

- Research läuft noch
- Spec wird erstellt
- Task wurde vorbereitet
- Open Question wurde ergänzt

Braucht es eine kleine Job-/Activity-Liste?

**Antwort / Entscheidung:**  
Daniel überlässt die konkrete Lösung Hermes.

**Entscheidung für V1:**  
Voice-Arbeitsaufträge werden als `work_order` / Activity mit Status nachverfolgt:

- `drafted`
- `queued`
- `running`
- `needs_review`
- `completed`
- `failed`

Jeder Work Order referenziert mindestens:

- `voice_session_id`
- Profil
- ursprünglichen User-Turn
- erzeugte Artefakte / Outputs
- Status
- Zeitstempel

**Status:** entschieden für V1
**Relevanz:** Auftragssystem

---

## 5. UX / Frontend

### Q19 — Wie sieht der mobile Call Screen aus?

Offene Elemente:

- Kontextauswahl
- großer Start-/Ende-Button
- Listening-/Thinking-/Speaking-Status
- Transcript sichtbar oder optional?
- Text-Fallback sichtbar oder versteckt?

**Antwort / Entscheidung:**  
Der mobile Call Screen soll sehr reduziert sein. Es soll maximal 4–5 Buttons geben. Ein Mute-Button unten ist wichtig, damit Daniel sich stummschalten kann, wenn es bei ihm laut ist oder er gerade nicht sprechen möchte.

**Erste Button-Kandidaten:**

- Gespräch starten / beenden
- Mute / Unmute
- Kontext wechseln oder Kontext anzeigen
- Text-Fallback / Eingabe
- Handoff / Summary / Weiter in Telegram

**Status:** beantwortet als UX-Richtung
**Relevanz:** Frontend-Spec

---

### Q20 — Soll Transcript live sichtbar sein?

Vorteile:

- Debugging
- Vertrauen
- Korrektur bei STT-Fehlern

Nachteile:

- wirkt weniger wie ein Call
- kann UI überladen

**Antwort / Entscheidung:**  
Daniel braucht kein Live-Transcript als primäres UI-Element.

**Implikation:**  
Transcript wird gespeichert und kann optional/debug-artig erreichbar sein, soll aber den Call Screen nicht dominieren.

**Status:** beantwortet
**Relevanz:** Mobile UX

---

### Q21 — Wie soll Hermes unterbrechbar sein?

Muss Daniel Hermes während des Sprechens unterbrechen können?

**Antwort / Entscheidung:**  
Daniel möchte Hermes während des Sprechens unterbrechen können, indem er einfach reinredet.

**Implikation:**  
Barge-in / Interruptibility ist wichtig für das Zielgefühl. Wenn V1 technisch noch nicht echtes Full-Duplex schafft, muss die Architektur darauf vorbereitet sein.

**Status:** beantwortet
**Relevanz:** Realtime-Qualität

---

### Q22 — Welche Fallbacks braucht Version 1?

Mögliche Fallbacks:

- Text-Eingabe
- Antwort erneut abspielen
- Transcript kopieren
- Call als Summary speichern
- „weiter in Telegram“ Button

**Antwort / Entscheidung:**  
Nicht explizit beantwortet. Aus Q19/Q20 abgeleitet: Fallbacks sollen vorhanden sein, aber den Call Screen nicht dominieren.

**Entscheidung für V1:**

- Text-Fallback bleibt verfügbar
- Antwort erneut abspielen bleibt verfügbar
- Summary/Handoff nach Call-Ende ist Pflicht
- Transcript ist optional sichtbar, aber gespeichert

**Status:** abgeleitet entschieden
**Relevanz:** Robustheit

---

## 6. Technik & Architektur

### Q23 — Welche Voice-Technologie ist Zielarchitektur?

Optionen:

- OpenAI Realtime
- Browser SpeechRecognition + Server-TTS
- WebRTC-basierte Lösung
- ElevenLabs TTS + anderer STT
- Hybrid

**Antwort / Entscheidung:**  
OpenAI Realtime ist gut und soll als Zielarchitektur bzw. primäre Richtung verwendet werden.

**Status:** beantwortet
**Relevanz:** Architektur

---

### Q24 — Wo läuft die Tool-Orchestrierung?

Möglichkeiten:

- Mission-Control-Backend
- Hermes CLI / lokaler Agent
- separater Worker
- Cron-/Job-System

**Antwort / Entscheidung:**  
Noch nicht explizit beantwortet.

**Vorschlag für V1:**  
Mission-Control-Backend orchestriert Call State, Profile, Retrieval und Handoff. Längere oder komplexe Agenten-/Tool-Aufträge werden an Hermes/Worker-Prozesse delegiert und als Work Orders nachverfolgt.

**Status:** Vorschlag offen zur Bestätigung
**Relevanz:** Sicherheit / Zuverlässigkeit

---

### Q25 — Wie werden lange Tool-Aufträge während eines Calls behandelt?

Beispiele:

- mehrstufige Recherche
- Datei erstellen
- Code ändern
- externen Agenten starten

Soll der Call warten, einen Zwischenstand geben oder den Auftrag asynchron fortsetzen?

**Antwort / Entscheidung:**  
Daniel überlässt die konkrete Lösung Hermes.

**Entscheidung für V1:**

- kurze Retrieval-/Research-Aufträge laufen im Call synchron mit Ansage
- längere Aufträge werden als Work Order asynchron fortgesetzt
- Hermes gibt im Call einen Zwischenstand und sagt, wo das Ergebnis später landet
- Ergebnis wird als Artefakt / Summary / Telegram-Handoff verfügbar gemacht

**Status:** entschieden für V1
**Relevanz:** State Machine

---

### Q26 — Welche Daten dürfen in den Voice-Kontext geladen werden?

Da Mission Control persönliche und geschäftliche Informationen enthält, braucht es Regeln für:

- Scope je Profil
- sensible Daten
- externe Provider
- Logging
- Transcript-Speicherung

**Antwort / Entscheidung:**  
Daniel setzt aktuell keine harten inhaltlichen Limits: Alles darf in den Voice-Kontext geladen werden, sofern es für den Call relevant ist.

**Sicherheitsnotiz:**  
Trotzdem soll die technische Umsetzung weiterhin nach Relevanz, Profil und Need-to-know priorisieren, damit der Kontext nicht unnötig groß, langsam oder unscharf wird. Externe Provider sollten nur die Informationen erhalten, die für die jeweilige Antwort nötig sind.

**Status:** beantwortet
**Relevanz:** Datenschutz / Sicherheit

---

## 7. Entscheidungen aus Daniels Voice-Antworten

1. **MVP muss Research, Telegram-Kontext und Call-Handoff enthalten.**
2. **Version-1-Profile:** Hauptchat / Hermes, Sales Support, LUMA.
3. **Telegram ist Kontextquelle für alle Profile**, nicht primär eigenes Profil.
4. **Hands-free mit automatischem Zuhören/Sprechen ist Pflicht.**
5. **Kontextquellen V1:** aktuelle Telegram-Session, jüngste Nachrichten, Daily Logs, Hermes Session Search, Mission-Control-Memory.
6. **Standard-Retrieval-Zeitraum:** aktueller Tag; tiefere Vergangenheit nur auf explizite Nachfrage.
7. **Profil bestimmt primären Telegram-Kontext automatisch.**
8. **Nach jedem Call entstehen Artefakte** mit Entscheidungen, Produces, Datum/Uhrzeit und Thema/Tag.
9. **Intent-Klassifikation macht Sinn.**
10. **Kurze Suchansage wie „Ich schau kurz nach“ ist akzeptiert.**
11. **Web Research darf Web Search und Perplexity nutzen.**
12. **Research soll bevorzugt Leitmedien / öffentlich-rechtliche / große Verlagshäuser nutzen.**
13. **Im Voice Call reicht eine kurze Quellen-Nennung; Direktlinks sollen im Nachgang abrufbar sein.**
14. **Call-Ende muss Transcript, Summary, Memory-Eintrag und Telegram-Handoff erzeugen.**
15. **Hermes darf Dateien/Aufgaben erstellen, wenn Daniel das klar beauftragt; unklare/externe Side Effects bleiben Review/Draft.**
16. **Mobile Call UI soll sehr reduziert sein, max. ca. 4–5 Buttons, inklusive Mute.**
17. **Live-Transcript ist nicht primär nötig.**
18. **Daniel möchte Hermes per Reinreden unterbrechen können.**
19. **OpenAI Realtime ist als primäre Voice-Technologie okay/gut.**
20. **Lange Tool-Aufträge soll Hermes pragmatisch lösen: kurz synchron, lang asynchron mit Handoff.**
21. **Keine harten inhaltlichen Limits für Voice-Kontext, aber Relevanz-/Need-to-know-Priorisierung bleibt sinnvoll.**
22. **Telegram-Kontextbindung V1:** Main/Hermes nutzt diesen Telegram-DM-Chat (`485318478`), Sales Support nutzt Telegram Chat `-1003998265477` Topic/Message `23`, LUMA nutzt Telegram Chat `-1003998265477` Topic/Message `24`.
23. **Work-Order-Status im Call:** kein sichtbarer Status nötig; eine kurze gesprochene Bestätigung reicht.
24. **Voice-Handoff-Freshness:** Ein Handoff gilt als „letzter Call“, bis ein weiterer Call im gleichen Kontext gemacht wurde.
25. **Research-Quellenliste:** Hermes soll eine sinnvolle bevorzugte Leitmedien-/Quellenliste vorschlagen.
---

## 8. Nächste Klärung für Business Logic Spec

Für das nächste Spec-File sollten diese Punkte operationalisiert werden:

1. Konkretes V1-Profilmodell: `main`, `sales_support`, `luma` inkl. Telegram-Kontextbindung.
2. Telegram Context Bridge: Quelle, Mapping, Freshness-Layer, Handoff-Referenz.
3. Intent-Klassifikation: Retrieval vs. Research vs. Work Order vs. normale Konversation.
4. Retrieval-/Research-State-Machine inkl. kurzer Suchansage und async Follow-up.
5. Call-Ende-Pipeline: Transcript, Summary, Memory, Decisions, Produces, Tags, Telegram-Handoff.
6. Work-Order-Modell für längere Aufgaben und erzeugte Artefakte.
7. Mobile Call Screen mit maximal 4–5 Hauptaktionen inkl. Mute.
8. OpenAI-Realtime-basierte Zielarchitektur inkl. Barge-in/Interruptibility.
9. Research-Quellenlogik inkl. Leitmedienpriorität, kurzer Voice-Quellenangabe und Direktlinks im Nachgang.

---

## 9. Arbeits-Transkripte der beiden Voice-Antworten

### 9.1 Voice-Antwort 1 — bereinigtes Arbeits-Transkript

Daniel beantwortet die ersten Open Questions:

- Q01: Der MVP soll bereits Research, Telegram-Kontext und Call-Handoff enthalten.
- Q02: Für Version 1 reichen zunächst Hauptchat / Hermes, Sales Support und LUMA. Diese sollen direkt funktionieren.
- Q03: Telegram Chat bleibt Kontextquelle für alle Profile.
- Q04: Hands-free ist ein Muss; automatisches Zuhören und Sprechen soll funktionieren.
- Q05: Aktuelle Telegram-Session, jüngste Nachrichten, Daily Logs, Hermes Session Search und Mission-Control-Memory müssen rein.
- Q06: Daniel bittet Hermes, den besten technischen Vorschlag zu machen.
- Q07: Standardmäßig reicht der aktuelle Tag; bei Bedarf kann Daniel explizit weiter in die Vergangenheit verweisen.
- Q08: Das gewählte Profil bestimmt den passenden Telegram-Kontext automatisch. Sales Support Voice lädt Sales-Support-Telegram-Kontext, Main lädt Main-Telegram-Kontext usw.
- Q09: Nach jedem Voice Call sollen Artefakte erstellt werden mit Entscheidungen, Produces, Datum/Uhrzeit und Thema/Tag.
- Q10: Intent-Klassifikation macht Sinn.
- Q11/Q12: Eine kurze Suchansage wie „Ich schau kurz nach“ ist okay.

### 9.2 Voice-Antwort 2 — bereinigtes Arbeits-Transkript

Daniel beantwortet weitere Open Questions:

- Q13: Hermes soll Web Search und Perplexity nutzen können. Bei Web-Recherche soll er auf deutsche Leitmedien, große Verlagshäuser und öffentlich-rechtliche Quellen achten; bei US-/internationalen Themen entsprechend auf große amerikanische Leitmedien.
- Q14: Nach einer Research-Antwort soll Hermes kurz sagen, wo er nachgeschaut hat, z. B. „Tagesschau.de und CNN“. Direktlinks sollen im Nachgang abrufbar sein.
- Q15: Beim Call-Ende sind Pflicht: Transcript speichern, Summary-Artefakt erzeugen, Memory-Eintrag erzeugen und Telegram-Handoff aufsetzen.
- Q16: Daniel bittet Hermes, die beste Referenzierungslogik für Telegram zu entscheiden.
- Q17: Hermes darf Dateien oder Aufgaben erstellen, wenn Daniel das klar beauftragt.
- Q18: Daniel bittet Hermes, die beste Nachverfolgungslogik für Voice-Arbeitsaufträge zu entscheiden.
- Q19: Der mobile Call Screen soll maximal 4–5 Buttons haben. Ein Mute-Button unten ist hilfreich, damit Daniel sich stummschalten kann.
- Q20: Live-Transcript braucht Daniel nicht als primäres UI-Element.
- Q21: Daniel möchte Hermes beim Sprechen unterbrechen können, indem er einfach reinredet.
- Q23: OpenAI Realtime ist gut als Voice-Technologie.
- Q25: Daniel bittet Hermes, die Behandlung langer Tool-Aufträge zu entscheiden.
- Q26: Es gibt keine harten Limits; alles darf in den Voice-Kontext geladen werden, sofern es relevant ist.

### 9.3 Voice-Antwort 3 + Telegram-Links — bereinigtes Arbeits-Transkript

Daniel beantwortet die neuen Business-Logic-Fragen Q27–Q30:

- Q27: Konkrete Telegram-Kontextbindungen für V1:
  - `main` / Hermes: aktueller Telegram-DM-Chat mit Daniel (`485318478`).
  - `sales_support`: Telegram-Link `https://t.me/c/3998265477/23`; technische Ableitung: Chat `-1003998265477`, Topic/Message `23`.
  - `luma`: Telegram-Link `https://t.me/c/3998265477/24`; technische Ableitung: Chat `-1003998265477`, Topic/Message `24`.
- Q28: Daniel braucht keinen sichtbaren Work-Order-Status im Call; eine kurze gesprochene Bestätigung reicht.
- Q29: Ein Voice-Handoff gilt so lange als „letzter Call“, bis ein weiterer Call im gleichen Kontext gemacht wurde.
- Q30: Daniel bittet Hermes, eine passende bevorzugte Leitmedien-/Quellenliste vorzuschlagen.

---

## 10. New Questions from Business Logic Spec

### Q27 — Welche konkreten Telegram Chats/Topics sind den V1-Profilen zugeordnet?

Für die Business Logic ist klar, dass `main`, `sales_support` und `luma` jeweils einen passenden Telegram-Kontext brauchen. Die konkrete technische Zuordnung für V1 ist:

- `main` / Hermes: aktueller Telegram-DM-Chat mit Daniel (`485318478`).
- `sales_support`: Telegram-Link `https://t.me/c/3998265477/23`; technische Ableitung: Chat `-1003998265477`, Topic/Message `23`.
- `luma`: Telegram-Link `https://t.me/c/3998265477/24`; technische Ableitung: Chat `-1003998265477`, Topic/Message `24`.

**Status:** beantwortet  
**Relevanz:** Telegram Context Bridge / Implementierung

---

### Q28 — Wie sichtbar soll der Work-Order-Status während eines laufenden Calls sein?

Die Business Logic legt Work Orders und Status fest. Daniel braucht im laufenden Call keinen sichtbaren Mini-Status. Eine kurze gesprochene Bestätigung reicht.

**Status:** beantwortet  
**Relevanz:** UX / Work Order Tracking

---

### Q29 — Wie lange soll ein Voice-Handoff als „letzter Call“ gelten?

Ein Voice-Handoff gilt als „letzter Call“, bis ein weiterer Call im gleichen Kontext gemacht wurde.

**Status:** beantwortet  
**Relevanz:** Handoff Resolution

---

### Q30 — Welche Quellen gelten als bevorzugte Leitmedien-Liste für Research?

Daniel hat Quelltypen definiert und bittet Hermes, eine konkrete bevorzugte Leitmedien-/Quellenliste vorzuschlagen.

**Status:** teilweise beantwortet — Hermes soll Vorschlag ausarbeiten  
**Relevanz:** Research Quality

---

## 11. Follow-up Questions from State Machine Spec

### Q31 — Was passiert mit laufendem Research/Audio bei Barge-in?

Daniel hat geklärt: Wenn er reinredet, soll Hermes aufhören zu sprechen und wieder zuhören.

Hermes-Entscheidung für V1:

- laufende Audio-Ausgabe wird sofort gestoppt
- Hermes wechselt zurück in Listening / User-Speaking
- Daniels neuer Turn ersetzt den bisherigen Gesprächsfokus
- laufende Retrieval-/Research-Tasks werden abgebrochen, wenn sie nur für die unterbrochene Antwort relevant waren
- bereits explizit als Work Order angelegte längere Aufgaben dürfen asynchron weiterlaufen und werden im Handoff referenziert

**Status:** beantwortet  
**Relevanz:** Barge-in / Realtime UX / Tool-Orchestration

---

### Q32 — Soll Mute eigener State oder nur Flag sein?

Daniel bittet Hermes, die Lösung zu entscheiden.

Hermes-Entscheidung für V1:

- Mute wird primär als persistiertes Flag `isMuted` modelliert, nicht als alleiniger Lifecycle-State
- der eigentliche Call-State bleibt z. B. `listening`, `speaking` oder `paused`
- UI darf dennoch klar den sichtbaren Zustand „Muted“ anzeigen
- Events `audio.mute_enabled` und `audio.mute_disabled` werden gespeichert
- solange `isMuted=true`, entstehen keine User Turns und kein Barge-in

**Status:** beantwortet durch Hermes-Entscheidung  
**Relevanz:** State Machine / Frontend UX / Audio Handling

---

## 12. New Questions from Frontend Call UX Spec

### Q33 — Soll der Call Screen initial eine kurze Hermes-Begrüßung automatisch sprechen oder direkt in Listening starten?

Die Frontend-UX-Spec lässt beide Wege zu. Eine automatische Begrüßung fühlt sich stärker wie ein echter Call an; direktes Listening ist schneller und weniger störend.

**Status:** offen  
**Relevanz:** Call Start UX / Audio Loop

---

### Q34 — Soll es nach Call-Ende einen echten „In Telegram weiter“-Button geben oder zunächst nur Handoff-Anzeige in Mission Control?

Die UX-Spec sieht Handoff-Bereitschaft vor. Offen ist, ob V1 bereits eine direkte Telegram-Deep-Link-/Öffnen-Aktion braucht oder ob eine Mission-Control-Handoff-Anzeige reicht.

**Status:** offen  
**Relevanz:** Handoff UX / Telegram Integration
