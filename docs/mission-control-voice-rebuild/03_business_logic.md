# Mission Control Voice Rebuild — 03 Business Logic

**Status:** Draft zur Durchsicht  
**Quelle:** `01-big-picture-vision.md`, `02-extraction.md`, `03-open-questions.md`  
**Zweck:** Business-Regeln für Mission Control Voice V1 definieren.

---

## 1. Scope of V1

### 1.1 In Scope

Mission Control Voice V1 muss ein echter, mobiler Call Mode sein — nicht nur eine Voice-Konsole.

V1 umfasst verbindlich:

1. **Profile-basierte Call-Starts** für:
   - `main` / Hauptchat / Hermes
   - `sales_support`
   - `luma`
2. **Telegram-Kontext als Datenquelle für alle Profile**.
3. **Live Context Retrieval** während des Calls.
4. **Web Research** per Voice über Web Search und Perplexity.
5. **Hands-free automatisches Zuhören und Sprechen** als Zielverhalten.
6. **Barge-in / Unterbrechbarkeit** als Produktanforderung.
7. **Call-End-Persistenz** mit Transcript, Summary, Memory-Eintrag, Decisions, Produces, Tags und Telegram-Handoff.
8. **Work Orders** für längere oder asynchrone Aufgaben.
9. **Quellen- und Evidence-Handling** für Research-Ergebnisse.

### 1.2 Out of Scope for this Spec

Dieses Dokument definiert keine technische Implementierung im Detail.

Nicht in diesem Dokument:

- finale Datenbankmigrationen
- konkrete API-Schemas
- detaillierte State Machine
- detailliertes Frontend-Layout
- genaue OpenAI-Realtime-Transportimplementierung
- Provider-spezifische Tool-Call-Protokolle

Diese Themen folgen in State-Machine-, Backend- und Frontend-Specs.

---

## 2. Core Entities and Concepts

### 2.1 Voice Profile

Ein Voice Profile ist der fachliche Einstiegskontext für einen Call.

V1-Profile:

| Profile | Bedeutung | Primäre Kontexte |
|---|---|---|
| `main` | Hauptchat / persönlicher Hermes | Main Telegram, persönliche Memory, aktuelle Daily Logs |
| `sales_support` | Sales-, Discovery- und CRM-Arbeit | Sales Telegram, Accounts, Deals, Activities, Discovery Notes |
| `luma` | LUMA Produkt-/GTM-/Projektkontext | LUMA Telegram, LUMA Memory, LUMA Tasks, LUMA Projekt-/Sales-Daten |

### 2.2 Telegram Context Bridge

Die Telegram Context Bridge verbindet ein Voice Profile mit dem passenden Telegram-Chat oder Topic.

Sie ist keine eigene primäre Voice-Oberfläche, sondern eine Kontextquelle.

### 2.3 Base Context

Base Context ist der Kontext, der beim Call-Start geladen wird.

Base Context besteht aus:

- Voice Profile
- Telegram-Bridge-Zuordnung
- aktueller/relevanter Telegram-Kontext
- Mission-Control-Kontext
- Daily Logs / Memory
- ggf. jüngste Voice-Call-Summaries

### 2.4 Live Retrieval

Live Retrieval ist das gezielte Nachladen von Kontext während eines laufenden Calls.

Es wird ausgelöst, wenn Daniel sich auf bestehende Informationen bezieht oder Hermes merkt, dass die Antwort ohne Kontext unsicher wäre.

### 2.5 Web Research

Web Research ist die Recherche aktueller externer Informationen über Web Search und/oder Perplexity.

### 2.6 Work Order

Ein Work Order ist ein aus dem Call entstehender Arbeitsauftrag, der synchron oder asynchron erledigt werden kann.

Beispiele:

- Spec erstellen
- Research vertiefen
- Task draften
- Open Questions ergänzen
- Briefing erzeugen

### 2.7 Call Artifact

Ein Call Artifact ist ein dauerhaftes Ergebnis eines Calls.

Pflichtartefakte:

- Transcript
- Summary
- Memory Entry
- Decisions
- Produces / Outputs
- Topic / Tags
- Telegram Handoff Reference

---

## 3. Profile Selection Logic

### 3.1 Default Rule

Beim Start eines Calls muss genau ein aktives Voice Profile gewählt sein.

Wenn Daniel kein Profil explizit wählt, gilt:

1. Wenn der Call aus einem profilgebundenen Mission-Control-Kontext gestartet wurde, wird dieses Profil verwendet.
2. Sonst wird `main` verwendet.

### 3.2 Profile → Context Mapping

| Voice Profile | Default Telegram Context | Default Mission-Control Context | Default Memory Scope |
|---|---|---|---|
| `main` | Telegram-DM-Chat mit Daniel (`485318478`) | aktuelle Aktivitäten, Tasks, globale Memory | Daily Logs, persönliche Memory, jüngste Voice Calls |
| `sales_support` | Telegram Chat `-1003998265477`, Topic/Message `23` (`https://t.me/c/3998265477/23`) | Accounts, Deals, People, Activities, Discovery Notes | Sales Memory, Call Reviews, Daily Logs |
| `luma` | Telegram Chat `-1003998265477`, Topic/Message `24` (`https://t.me/c/3998265477/24`) | LUMA Tasks, LUMA Activities, LUMA GTM-/Product-Kontext | LUMA Memory, Daily Logs, LUMA Voice Calls |

### 3.3 Out-of-Profile Questions

Wenn Daniel in einem Profil eine Frage stellt, die offensichtlich in ein anderes Profil gehört:

1. Hermes darf nicht raten.
2. Hermes prüft zuerst, ob die Frage über den aktiven Profilkontext beantwortbar ist.
3. Wenn nicht, fragt Hermes knapp nach oder schlägt einen Kontextwechsel vor.

Beispiele:

- Im `sales_support` Call: „Was ist der aktuelle LUMA-Bautagebuch-Stand?“  
  → Hermes kann sagen: „Das klingt nach LUMA-Kontext. Soll ich kurz in LUMA wechseln bzw. dort nachschauen?“

### 3.4 Cross-Profile Lookup

Cross-Profile Lookup ist erlaubt, wenn Daniel es explizit macht.

Trigger:

- „Guck mal im LUMA-Kontext…“
- „Was hatten wir im Sales-Chat dazu?“
- „Zieh kurz den Hauptchat-Kontext dazu.“

Business-Regel:

- Explizite Cross-Profile-Fragen dürfen gesucht werden.
- Der aktive Call bleibt aber im ursprünglichen Profil, solange Daniel keinen Kontextwechsel verlangt.

---

## 4. Telegram Context Logic

### 4.1 Role of Telegram

Telegram ist in V1 eine Kontextquelle für alle Voice Profiles.

Telegram ist nicht das primäre Voice-Runtime-System.

### 4.2 Bridge Mapping

Jedes V1-Profil braucht eine konfigurierte Bridge:

| Profile | Bridge-Ziel |
|---|---|
| `main` | Telegram-DM-Chat mit Daniel (`485318478`) |
| `sales_support` | Telegram Chat `-1003998265477`, Topic/Message `23` |
| `luma` | Telegram Chat `-1003998265477`, Topic/Message `24` |

### 4.3 Freshness Layer

Für sehr aktuelle Fragen nutzt Hermes bevorzugt Hermes Session Search und jüngste Telegram-Nachrichten.

Trigger:

- „gerade eben“
- „vor zehn Minuten“
- „in unserem Chat“
- „was hatten wir eben besprochen“

### 4.4 Durable Layer

Für stabilisierte Fakten nutzt Hermes Mission-Control-Memory und Daily Logs.

Trigger:

- „was hatten wir entschieden“
- „welcher Stand ist gespeichert“
- „was war die letzte Summary“
- „was ist im Memory dazu“

### 4.5 Missing Telegram Context

Wenn kein Telegram-Kontext verfügbar ist:

1. Hermes sagt transparent, dass der Telegram-Kontext nicht geladen oder nicht gefunden wurde.
2. Hermes nutzt verfügbare Mission-Control-/Memory-Quellen.
3. Hermes markiert die Antwort als eingeschränkt.
4. Hermes darf eine Rückfrage stellen, wenn die Antwort sonst wahrscheinlich falsch wäre.

Beispiel:

> „Ich finde gerade keinen aktuellen Telegram-Kontext dazu. Ich kann nur aus Mission-Control-Memory und Daily Logs antworten.“

---

## 5. Context Retrieval Logic

### 5.1 Default Retrieval Window

Standardmäßig sucht Hermes innerhalb des aktuellen Tages.

Das gilt für:

- Telegram-Kontext
- Daily Logs
- Mission-Control-Memory
- Voice-Call-Summaries
- Activities / Tasks, sofern nicht anders angegeben

### 5.2 Explicit Historical Retrieval

Wenn Daniel einen Zeitraum nennt, überschreibt dieser den Default.

Beispiele:

| User-Phrase | Retrieval Window |
|---|---|
| „gestern“ | Vortag |
| „letzte Woche“ | letzte Kalender-/Rolling-Woche |
| „im letzten Sales Call“ | jüngster passender Sales Voice Call |
| „damals bei LUMA“ | LUMA-Historie; ggf. Rückfrage bei Unklarheit |

### 5.3 Profile-Bound Retrieval

Ohne expliziten Hinweis sucht Hermes zuerst im aktiven Profil.

Reihenfolge:

1. aktiver Profilkontext
2. zugeordneter Telegram-Kontext
3. aktuelle Daily Logs / Memory
4. Mission-Control-Objekte des Profils
5. frühere Voice Calls im Profil

### 5.4 Cross-Profile Retrieval

Cross-Profile Retrieval wird nur ausgeführt, wenn:

- Daniel ein anderes Profil nennt, oder
- die Frage klar erkennbar außerhalb des aktuellen Profils liegt und Hermes eine knappe Bestätigung einholt.

### 5.5 Missing Context Handling

Wenn Retrieval nichts findet:

1. Keine Halluzination.
2. Kein so tun, als sei Kontext vorhanden.
3. Kurze transparente Antwort.
4. Optional: Rückfrage oder Vorschlag für weitere Suche.

Beispiel:

> „Dazu finde ich im heutigen LUMA-Kontext nichts Belastbares. Soll ich weiter zurück suchen?“

### 5.6 Retrieval Speech Pattern

Bei aktiver Suche darf Hermes kurz signalisieren:

> „Ich schau kurz nach.“

Danach folgt entweder:

- kurze Antwort mit Quelle/Kontext
- transparente Nicht-Fund-Antwort
- Zwischenstand bei längerer Suche

---

## 6. Intent Classification Logic

Intent Classification ist Pflicht. Sie bestimmt, ob Hermes normal antwortet, Kontext nachlädt, recherchiert oder einen Work Order erzeugt.

### 6.1 Intent Classes

| Intent | Trigger Examples | Expected Behavior | Output Style | Tools/Context Required |
|---|---|---|---|---|
| `normal_conversation` | „Ja, genau“, „erklär mir das kurz“ | direkt antworten ohne Tool, sofern Kontext reicht | kurz, natürlich | nein |
| `context_retrieval` | „Was hatten wir dazu entschieden?“ | Memory / Daily Logs / Voice Calls durchsuchen | kurze Antwort + Unsicherheit falls nötig | ja |
| `telegram_context_retrieval` | „Was haben wir vor zehn Minuten im Chat gemacht?“ | Telegram Bridge + Session Search nutzen | kurze Zusammenfassung | ja |
| `mission_control_lookup` | „Was steht bei LUMA in Mission Control?“ | MC-Datenquellen suchen | faktenbasiert, knapp | ja |
| `web_research` | „Guck mal nach, was heute passiert ist“ | Web Search / Perplexity ausführen | Antwort + kurze Quellen-Nennung | ja |
| `work_order` | „Mach daraus ein Spec File“ | Auftrag erzeugen / ausführen / tracken | Bestätigung + Ergebnisort | oft |
| `clarification` | unklarer Bezug / gefährliche Aktion | Rückfrage stellen | eine kurze Frage | nein/optional |

### 6.2 Multi-Intent Turns

Ein User-Turn kann mehrere Intents enthalten.

Beispiel:

> „Guck kurz nach, was heute zu X passiert ist, und mach daraus ein Briefing.“

Business-Regel:

1. `web_research` ausführen.
2. Ergebnis zusammenfassen.
3. `work_order` für Briefing erstellen.
4. Wenn Briefing länger dauert, asynchron fortsetzen.

### 6.3 Intent Confidence

Wenn die Intent-Klassifikation unsicher ist:

- bei ungefährlichen Antworten: knapp mit Annahme fortfahren
- bei Side Effects: Rückfrage stellen
- bei Kontextbezug: Retrieval versuchen, aber Unsicherheit nennen

---

## 7. Research Logic

### 7.1 When to Use Research

Web Research wird genutzt, wenn Daniel nach aktuellen externen Fakten fragt oder ausdrücklich Recherche beauftragt.

Trigger:

- „guck mal kurz nach“
- „recherchiere“
- „was ist heute passiert“
- „finde raus“
- „wie ist der aktuelle Stand bei…“

### 7.2 Web Search vs. Perplexity

Business-Regel:

- **Web Search** für gezielte, quellennahe Suche und aktuelle Nachrichten.
- **Perplexity** für schnelle Research-Synthese über mehrere Quellen.
- Bei wichtigen oder potenziell strittigen Themen sollten Ergebnisse durch mindestens zwei belastbare Quellen plausibilisiert werden.

### 7.3 Source Priority

Deutschsprachige Themen:

1. offizielle Primärquellen, sofern relevant, z. B. Behörden, Unternehmen, Originaldokumente
2. öffentlich-rechtliche Quellen, z. B. Tagesschau / ARD / ZDF / Deutschlandfunk
3. große deutsche Leitmedien und Verlagshäuser, z. B. Handelsblatt, FAZ, Süddeutsche Zeitung, Zeit, Spiegel, Wirtschaftswoche
4. relevante Fach-/Branchenquellen, wenn das Thema spezifisch ist
5. weitere Quellen nur mit Unsicherheitsmarkierung

US-/internationale Themen:

1. offizielle Primärquellen, sofern relevant, z. B. Behörden, Unternehmen, Originaldokumente
2. internationale Nachrichtenagenturen und große Leitmedien, z. B. Reuters, Associated Press, BBC, Financial Times, The New York Times, The Wall Street Journal, The Washington Post, The Economist
3. seriöse Spezialquellen, wenn das Thema spezifisch ist
4. weitere Quellen nur mit Unsicherheitsmarkierung

Business-Regel: Die Liste ist eine Präferenzliste, keine harte Allowlist. Hermes darf bessere Primär- oder Fachquellen priorisieren und soll Quellenqualität transparent machen.

### 7.4 Spoken Research Answer

Voice-Antworten bleiben kurz.

Muster:

1. Kernaussage
2. 2–4 wichtige Punkte
3. kurze Quellen-Nennung

Beispiel:

> „Kurz: Es sieht nach X aus. Wichtig sind A, B und C. Nachgeschaut bei tagesschau.de und Reuters.“

### 7.5 Direct Links Afterward

Direktlinks müssen nach dem Call oder bei Nachfrage verfügbar sein.

Speicherort:

- Call Summary
- Research Artifact
- Telegram Handoff
- Work Order Output

### 7.6 Uncertainty Handling

Wenn Quellenlage dünn oder widersprüchlich ist:

- Hermes sagt das im Call.
- Hermes vermeidet absolute Aussagen.
- Hermes bietet an, tiefer zu recherchieren.

---

## 8. Call Conversation Logic

### 8.1 Conversation Style

Hermes antwortet im Call:

- kurz
- direkt
- natürlich gesprochen
- ohne unnötige Meta-Erklärungen
- mit klarer Unsicherheitskommunikation

### 8.2 Hands-Free Rule

Zielverhalten V1:

- Daniel startet den Call einmal.
- Hermes hört automatisch zu.
- Hermes antwortet automatisch per Stimme.
- Daniel muss nicht pro Turn manuell absenden.

### 8.3 Barge-In Rule

Daniel muss Hermes unterbrechen können, indem er reinredet.

Business-Regel:

- Wenn Daniel spricht, während Hermes spricht, hat Daniels Input Vorrang.
- Hermes stoppt oder pausiert die aktuelle Antwort.
- Der neue User-Turn wird als aktueller Gesprächsfokus behandelt.

### 8.4 Mute Rule

Mute ist eine explizite Nutzerentscheidung.

Wenn Mute aktiv ist:

- Hermes soll Daniel nicht als sprechend interpretieren.
- Hintergrundgeräusche dürfen keinen Turn auslösen.
- Hermes darf weiter sprechen, wenn er gerade eine Antwort liefert, sofern Daniel nicht den Call beendet.

### 8.5 Transcript Visibility

Live Transcript ist nicht primäres UI.

Business-Regel:

- Transcript wird gespeichert.
- Transcript kann optional für Debug / Review sichtbar sein.
- Transcript darf den mobilen Call Screen nicht dominieren.

---

## 9. Work Order Logic

### 9.1 When a Turn Becomes a Work Order

Ein Voice-Turn wird ein Work Order, wenn Daniel eine Aufgabe statt nur eine Antwort verlangt.

Trigger:

- „mach daraus…“
- „erstelle…“
- „bau…“
- „schreib…“
- „leg an…“
- „recherchiere tiefer und schick mir…“

### 9.2 Work Order Lifecycle

| Status | Bedeutung |
|---|---|
| `drafted` | Auftrag erkannt, aber noch nicht ausgeführt oder braucht Review |
| `queued` | Auftrag wartet auf Ausführung |
| `running` | Auftrag läuft |
| `needs_review` | Ergebnis oder Aktion braucht Daniels Prüfung |
| `completed` | Auftrag abgeschlossen |
| `failed` | Auftrag fehlgeschlagen |

### 9.3 Required Work Order Fields

Jeder Work Order speichert mindestens:

- `work_order_id`
- `voice_session_id`
- `profile`
- `source_turn_id` oder ursprünglicher User-Turn
- `intent`
- `requested_output`
- `status`
- `created_at`
- `updated_at`
- `artifacts[]`
- `handoff_target` falls relevant
- `needs_confirmation` boolean

### 9.4 Synchronous vs. Asynchronous Execution

Kurze Aufgaben:

- laufen synchron im Call
- Hermes sagt kurz, was er tut
- Ergebnis wird direkt gesprochen

Längere Aufgaben:

- werden als Work Order angelegt
- Hermes bestätigt kurz gesprochen, dass der Auftrag angelegt bzw. gestartet wurde
- kein sichtbarer Work-Order-Status ist im Call zwingend nötig
- Ergebnis landet als Artefakt und/oder Telegram-Handoff

### 9.5 Work Order Output

Outputs müssen referenzierbar sein:

- Datei-/Markdown-Pfad
- Task-ID
- Research-Linkliste
- Summary-Pfad
- Status

---

## 10. Call-End Logic

### 10.1 Mandatory Call-End Pipeline

Beim Ende jedes Calls läuft diese Pipeline:

1. Transcript speichern.
2. Summary-Artefakt erzeugen.
3. Memory-Eintrag erzeugen.
4. Entscheidungen extrahieren.
5. Produces / erzeugte oder angestoßene Outputs extrahieren.
6. Topic / Tags bestimmen.
7. Telegram-Handoff-Referenz setzen.
8. Direct Links / Artefakte für Follow-up verfügbar machen.

### 10.2 Decisions

Decisions sind explizite oder klar ableitbare Festlegungen.

Beispiele:

- „V1 nutzt OpenAI Realtime.“
- „Telegram ist Kontextquelle, kein eigenes Profil.“
- „Call-End muss Summary und Handoff erzeugen.“

### 10.3 Produces

Produces sind erzeugte oder angestoßene Ergebnisse.

Beispiele:

- `03_business_logic.md` erstellt
- Open Questions ergänzt
- Research-Auftrag gestartet
- Task-Draft angelegt

### 10.4 Topic and Tags

Jeder Call erhält mindestens:

- ein Hauptthema
- 1–5 Tags
- Profil
- Datum/Uhrzeit

### 10.5 Failure Handling at Call End

Wenn ein Teil der Pipeline fehlschlägt:

1. Transcript-Speicherung hat höchste Priorität.
2. Fehler wird als Call-End-Issue erfasst.
3. Hermes sagt nicht, dass alles gespeichert wurde, wenn es nicht stimmt.
4. Nächster Retry oder manuelle Wiederherstellung muss möglich sein.

---

## 11. Telegram Handoff Logic

### 11.1 Handoff Purpose

Telegram Handoff ermöglicht, dass Daniel nach einem Voice Call im Telegram-Chat weiterarbeiten kann.

Beispiel:

> „Wir haben gerade über das Voice-Thema gesprochen — mach daraus die State Machine.“

### 11.2 Handoff Reference

Ein Handoff besteht aus:

- `voice_session_id`
- Profil
- Telegram-Chat-/Thread-Binding
- `memory_path`
- Summary-/Artifact-Pfade
- Topic / Tags
- Zeitnähe

### 11.3 Handoff Resolution

Wenn Daniel in Telegram auf „gerade eben“ oder „den Call“ verweist:

1. Suche den letzten Voice Call im gleichen Telegram-/Profil-Kontext.
2. Ein Call gilt als „letzter Call“, bis ein weiterer Call im gleichen Kontext gemacht wurde.
3. Prüfe Topic/Tags, wenn erwähnt.
4. Lade Summary und relevante Decisions/Produces.
5. Wenn mehrere Calls im gleichen Kontext fachlich passen oder Daniel einen anderen meint, kurz nachfragen.

### 11.4 Handoff Output

Nach Call-Ende soll Telegram mindestens wissen können:

- welcher Call gemeint ist
- wo Summary und Transcript liegen
- welche Entscheidungen getroffen wurden
- welche Artefakte entstanden sind
- welche Work Orders offen sind

---

## 12. Source and Evidence Logic

### 12.1 Source Types

Quellen können sein:

- Telegram-Kontext
- Hermes Session Search
- Mission-Control-Memory
- Daily Logs
- Mission-Control-DB-Objekte
- Voice-Call-Transcripts
- Web Search Ergebnisse
- Perplexity Ergebnisse
- direkte Webquellen

### 12.2 Evidence Rule

Jede faktenbasierte Antwort sollte intern wissen, worauf sie basiert.

Für Voice muss nicht jede Quelle ausführlich genannt werden, aber Hermes muss bei Nachfrage Direktlinks oder Referenzen liefern können.

### 12.3 Spoken Source Rule

Im Call genügt eine kurze Quellen-Nennung.

Beispiele:

- „Nachgeschaut bei tagesschau.de und Reuters.“
- „Das kommt aus dem heutigen LUMA-Memory und unserem Telegram-Kontext.“
- „Ich finde dazu gerade keine belastbare Quelle.“

### 12.4 Written Evidence Rule

Für Research und Handoff werden Quellen schriftlich abgelegt:

- Link
- Titel
- Domain
- Zeitpunkt der Recherche
- kurze Notiz, wofür die Quelle verwendet wurde

### 12.5 No Evidence, No Certainty

Wenn Hermes keine Quelle oder keinen Kontext findet:

- keine sichere Behauptung
- keine erfundene Erinnerung
- klare Unsicherheitsformulierung

---

## 13. Safety and Side-Effect Logic

### 13.1 Allowed Without Additional Confirmation

Hermes darf ohne erneute Bestätigung ausführen, wenn Daniel im Call klar darum bittet:

- interne Markdown-Specs erstellen
- Summaries erstellen
- Open Questions ergänzen
- Draft-Tasks erstellen
- Research-Artefakte erzeugen
- Memory-/Call-Artefakte schreiben

### 13.2 Requires Confirmation

Hermes muss explizit bestätigen lassen bei:

- externen Nachrichten an Dritte
- irreversiblen Aktionen
- kostenpflichtigen Aktionen
- produktiven Deployments
- Löschen oder Überschreiben wichtiger Daten
- rechtlich/finanziell relevanten Aktionen

### 13.3 Unclear Requests

Wenn ein Auftrag unklar ist:

- als Draft anlegen oder Rückfrage stellen
- nicht stillschweigend ausführen
- im Work Order `needs_review` markieren

### 13.4 Context Privacy Rule

Daniel setzt keine harten inhaltlichen Limits für Voice-Kontext.

Trotzdem gilt:

- nur relevanten Kontext laden
- externe Provider nicht unnötig mit Rohdaten fluten
- sensible Inhalte nur nutzen, wenn sie für die Antwort nötig sind
- Kontextzugriff in Summary/Events nachvollziehbar machen

---

## 14. Assumptions

- **A01:** Voice-Call-Summaries sind in V1 ebenfalls Retrieval-Quelle, obwohl Q05 sie nicht final ausdrücklich bestätigt hat.  
  **Reason:** Q09/Q15 verlangen Call-Artefakte, Memory-Einträge und späteren Handoff; ohne Voice-Call-Summaries wäre Cross-Call-Continuity schwach.  
  **Risk if wrong:** V1 lädt mehr historischen Call-Kontext als Daniel initial erwartet.

- **A02:** Mission Control darf strukturierte Call-End-Artefakte zusätzlich zum menschenlesbaren Markdown speichern.  
  **Reason:** Telegram-Handoff, Work Orders, Decisions und Produces brauchen stabile maschinenlesbare Referenzen.  
  **Risk if wrong:** Handoff und spätere Suche bleiben fragil oder nur textbasiert.

- **A03:** OpenAI Realtime kann mit Tool-/Retrieval-Zuständen so integriert werden, dass Hands-free und Barge-in realistisch abbildbar sind.  
  **Reason:** Q04/Q21/Q23 machen Hands-free, Reinreden und OpenAI Realtime zur Zielrichtung.  
  **Risk if wrong:** V1 braucht technische Kompromisse oder eine Hybrid-Architektur.

- **A04:** Web Search und Perplexity sind in der späteren Runtime verfügbar oder können über Hermes-/Backend-Tools angebunden werden.  
  **Reason:** Q13 verlangt beide Research-Wege.  
  **Risk if wrong:** Research-Funktionalität bleibt eingeschränkt oder muss providerseitig ersetzt werden.

- **A05:** Daniel akzeptiert, dass längere Aufgaben im Call nicht vollständig live abgeschlossen werden, sondern als Work Orders mit Handoff weiterlaufen.  
  **Reason:** Q25 überlässt die Lösung Hermes; das Business-Logic-Dokument entscheidet kurz synchron, lang asynchron.  
  **Risk if wrong:** Daniel erwartet längere Wartezeiten im Live Call statt asynchroner Outputs.

---

## 15. Resolved Follow-up Questions

### Q27 — Welche konkreten Telegram Chats/Topics sind den V1-Profilen zugeordnet?

Die konkrete technische Zuordnung für V1 ist:

- `main` / Hermes: aktueller Telegram-DM-Chat mit Daniel (`485318478`).
- `sales_support`: Telegram Chat `-1003998265477`, Topic/Message `23` (`https://t.me/c/3998265477/23`).
- `luma`: Telegram Chat `-1003998265477`, Topic/Message `24` (`https://t.me/c/3998265477/24`).

**Status:** beantwortet  
**Relevanz:** Telegram Context Bridge / Implementierung

### Q28 — Wie sichtbar soll der Work-Order-Status während eines laufenden Calls sein?

Daniel braucht im laufenden Call keinen sichtbaren Mini-Status. Eine kurze gesprochene Bestätigung reicht.

**Status:** beantwortet  
**Relevanz:** UX / Work Order Tracking

### Q29 — Wie lange soll ein Voice-Handoff als „letzter Call“ gelten?

Ein Voice-Handoff gilt als „letzter Call“, bis ein weiterer Call im gleichen Kontext gemacht wurde.

**Status:** beantwortet  
**Relevanz:** Handoff Resolution

### Q30 — Welche Quellen gelten als bevorzugte Leitmedien-Liste für Research?

Hermes schlägt eine bevorzugte Quellenlogik vor: Primärquellen zuerst, danach öffentlich-rechtliche und große Leitmedien, ergänzt durch seriöse Fachquellen. Die konkrete Liste steht in Abschnitt 7.3.

**Status:** beantwortet durch Hermes-Vorschlag  
**Relevanz:** Research Quality

---

## 16. Acceptance Criteria

### 16.1 Business Logic Coverage

- V1-Scope ist eindeutig beschrieben.
- Profile `main`, `sales_support`, `luma` sind fachlich definiert.
- Telegram ist als Kontextquelle für alle Profile modelliert.
- Retrieval-Regeln unterscheiden Default, historisch, profilgebunden und cross-profile.
- Intent-Klassen sind mit Triggern und Verhalten beschrieben.
- Research-Regeln enthalten Web Search, Perplexity, Quellenpriorität und Direktlink-Handling.
- Work Orders haben Lifecycle und Pflichtfelder.
- Call-End-Pipeline ist vollständig definiert.
- Telegram-Handoff ist fachlich auflösbar.
- Side-Effect-Regeln sind klar.

### 16.2 State-Machine Readiness

Aus diesem Dokument muss eine State-Machine-Spec ableitbar sein für:

- Call start
- listening
- speaking
- interrupted / barge-in
- retrieving context
- researching web
- creating work order
- ending call
- handoff ready
- error / missing context

### 16.3 Safety and Grounding

- Fehlender Kontext führt zu transparenter Nicht-Fund-Antwort.
- Research-Antworten nennen kurz Quellen.
- Direktlinks sind später verfügbar.
- Externe irreversible Aktionen brauchen Bestätigung.
- Unklare Aufträge werden nicht stillschweigend ausgeführt.

### 16.4 Artifact Readiness

Nach jedem Call existieren oder entstehen:

- Transcript
- Summary
- Memory Entry
- Decisions
- Produces
- Topic / Tags
- Telegram Handoff Reference
- offene Work Orders, falls vorhanden
