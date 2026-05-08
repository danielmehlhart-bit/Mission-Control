# Mission Control Voice Rebuild — 02 Extraction

**Status:** Draft zur Durchsicht  
**Quelle:** `01-big-picture-vision.md` + Mission-Control-Voice-Call vom 08.05.2026  
**Zweck:** Fakten, Anforderungen, Annahmen und erste Architektur-Bausteine aus der Vision extrahieren.

---

## 1. Extrahierte Produktfakten

### 1.1 Primäre Oberfläche

- Mission Control ist die primäre Oberfläche für Voice Calls.
- Der Startpunkt ist typischerweise mobil, also auf Daniels Handy.
- Telegram bleibt relevant, aber primär als Kontextquelle, Übergabe- und Follow-up-Kanal.
- Der aktuelle Zustand fühlt sich noch zu sehr wie eine technische Voice Console an.
- Ziel ist ein echter Call Mode mit klarer Gesprächsmetapher.

### 1.2 Nutzer

- Primärer Nutzer ist Daniel.
- Daniel arbeitet kontextübergreifend: Telegram, Mission Control, Sales, LUMA, Research, Tasks.
- Daniel will Voice nutzen, um schneller Ideen, Fragen und Aufträge einzusprechen, ohne UI-Arbeit leisten zu müssen.

### 1.3 Kontext-Auswahl

Beim Start eines Calls soll Daniel einen Kontext wählen können.

Genannte oder abgeleitete Kontextprofile:

| Kontext | Bedeutung | Status |
|---|---|---|
| Hauptchat / Hermes | allgemeiner persönlicher Hermes-Kontext | explizit genannt |
| Sales Support | Sales-/Discovery-/CRM-Kontext | explizit genannt |
| Telegram Chat | aktueller oder letzter Telegram-Arbeitskontext | explizit genannt |
| LUMA | LUMA-Produkt-/GTM-/Projektkontext | explizit genannt |
| weitere Profile | spätere spezialisierte Modi | abgeleitet |

### 1.4 Gesprächscharakter

- Der Nutzer soll nicht das Gefühl haben, ein Formular oder eine Konsole zu bedienen.
- Der Nutzer soll das Gefühl haben, mit Hermes zu telefonieren.
- Der Call soll natürlich, kurz, schnell und mobil funktionieren.
- Hermes soll aktiv zuhören, bei Bedarf nachschauen und dann antworten.

---

## 2. Harte Anforderungen

### R01 — Mobile-first Call Mode

Mission Control Voice braucht eine mobile-first Call-Oberfläche, die auf dem Handy sinnvoll nutzbar ist.

**Akzeptanzrichtung:**
- wenige große Aktionen
- klare Start-/Ende-Interaktion
- sichtbarer Gesprächsstatus
- keine dominierende Text-Konsole als Hauptmetapher

### R02 — Kontextprofil vor Call-Start

Vor oder beim Call-Start muss Daniel den Zielkontext wählen können.

**Beispiele:**
- Hauptchat
- Sales Support
- Telegram Chat
- LUMA

### R03 — Kontext muss beim Call-Start geladen werden

Nach Auswahl des Kontextes soll Hermes nicht blank starten, sondern mit einem geladenen Basiskontext.

**Kontextarten:**
- Profil-Kontext
- Mission-Control-Daten
- relevante Memory-Einträge
- ggf. letzte Telegram-Konversationen
- frühere Voice Calls

### R04 — Live-Retrieval während des Gesprächs

Hermes muss während eines laufenden Calls zusätzlichen Kontext nachziehen können.

**Beispiele:**
- „Was haben wir vor zehn Minuten im Chat besprochen?“
- „Siehst du die Sachen aus dem gestrigen Call?“
- „Was ist der aktuelle LUMA-Stand?“

### R05 — Web-/News-/Research-Aufträge per Voice

Daniel muss per Sprache Research-Aufträge geben können.

**Beispiel:**
- „Guck mal kurz nach, was heute im Iran passiert ist.“

Hermes soll dann recherchieren, nicht aus dem Gedächtnis raten.

### R06 — Retrieval-/Research-Zustand muss im Call erkennbar sein

Wenn Hermes nachschaut, soll das im Gespräch und/oder UI sichtbar bzw. hörbar sein.

**Gewünschter Effekt:**
- Hermes signalisiert kurz „ich schaue nach“
- danach kurze Pause / Suchphase
- danach Rückkehr mit Ergebnis

### R07 — Keine Halluzination bei fehlendem Kontext

Wenn Daten nicht verfügbar sind, muss Hermes das offen sagen.

**Regel:**
- keine erfundenen Fakten
- keine Scheinsicherheit
- klare Unsicherheitskommunikation

### R08 — Persistenz nach dem Call

Nach dem Call müssen Transcript und Summary verfügbar sein.

**Nutzung:**
- Wiederaufnahme im Telegram-Chat
- Erstellung weiterer Spec-Files
- Extraction
- Open Questions
- Tasks / Follow-ups

### R09 — Telegram-Handoff nach Call-Ende

Daniel soll nach einem Call in Telegram weiterarbeiten können und dort auf den Call Bezug nehmen.

**Beispiel:**
- „Wir haben gerade über Thema X gesprochen, fass das nochmal zusammen.“

### R10 — Voice Calls können Arbeitsaufträge erzeugen

Voice darf nicht nur Q&A sein. Aus Voice Calls sollen Arbeitsobjekte entstehen können.

**Beispiele:**
- Spec-Files
- Research-Briefings
- offene Fragen
- Tasks
- nächste Schritte

---

## 3. Funktionale Bausteine

### 3.1 Call Entry

Verantwortung:
- Kontextprofile anzeigen
- Call starten
- Basiskontext an Voice Session binden

Mögliche Inputs:
- `profileSlug`
- `sourceSurface = mission_control`
- optionaler Telegram-/Thread-Kontext
- optionaler Projekt-/Account-/Deal-Kontext

### 3.2 Context Router

Verantwortung:
- aus dem gewählten Profil den relevanten Kontext ermitteln
- Profile, Mission-Control-Daten, Memory und ggf. Telegram-Kontext zusammenführen
- Kontext kompakt genug für Voice bereitstellen

Mögliche Quellen:
- Mission-Control-DB
- Memory / Daily Logs
- frühere Voice Calls
- Telegram-Bridge
- Projekt-/Sales-/LUMA-Kontext

### 3.3 Live Retrieval

Verantwortung:
- während des Calls gezielt Kontext nachladen
- Anfragen aus natürlicher Sprache erkennen
- Suchergebnisse zusammenfassen
- Unsicherheit markieren

Typische Trigger:
- „was haben wir gerade / gestern / letzte Woche besprochen“
- „siehst du den Stand von ...“
- „hol dir mal kurz den Kontext zu ...“

### 3.4 Research Engine

Verantwortung:
- aktuelle externe Informationen recherchieren
- Quellen-/Zeitbezug sicherstellen
- Ergebnis knapp und sprachgerecht zurückgeben

Typische Trigger:
- „guck mal kurz nach“
- „recherchiere“
- „was ist heute passiert“
- „finde heraus“

### 3.5 Call State Machine

Verantwortung:
- Gesprächszustände sauber modellieren
- Retrieval, Research und Antwortphasen trennen
- Unterbrechungen und Übergaben beherrschbar machen

Erste mögliche Zustände:
- `idle`
- `selecting_context`
- `starting_call`
- `listening`
- `thinking`
- `retrieving_context`
- `researching_web`
- `speaking`
- `handoff_pending`
- `ended`
- `error`

### 3.6 Memory / Summary Writer

Verantwortung:
- Transcript speichern
- Summary schreiben
- Folgeartefakte referenzierbar machen
- Telegram-Handoff ermöglichen

Outputs:
- Call Transcript
- Call Summary
- Memory-Eintrag
- ggf. Arbeitsartefakte wie Spec-Files

---

## 4. Nicht-funktionale Anforderungen

### NFR01 — Geschwindigkeit

Der Call muss schnell reagieren. Retrieval darf kurze Pausen erzeugen, aber nicht wie ein abgebrochener Call wirken.

### NFR02 — Verlässlichkeit

Antworten müssen nachvollziehbar sein. Bei Research und Kontextfragen ist Genauigkeit wichtiger als sofortige Antwort.

### NFR03 — Mobile Nutzbarkeit

Die Bedienung muss mit einer Hand und auf kleinem Screen funktionieren.

### NFR04 — Natürlichkeit

Antworten müssen sprachlich knapp, direkt und gesprächstauglich sein.

### NFR05 — Kontextbegrenzung

Hermes darf nicht beliebig viel Kontext blind laden. Kontext muss relevant, priorisiert und zusammengefasst werden.

### NFR06 — Transparenz

Wenn Kontext fehlt, Retrieval scheitert oder Research unsicher ist, muss das explizit gesagt werden.

### NFR07 — Erweiterbarkeit

Das System muss weitere Profile, Datenquellen und Tool-Arten aufnehmen können.

---

## 5. Implizite Annahmen

- Daniel akzeptiert kurze Denk-/Suchpausen, wenn dadurch bessere Antworten entstehen.
- Der Call Mode darf zunächst nicht perfekt realtime-duplex sein, muss sich aber deutlich näher an einen echten Call annähern.
- Mission Control hat oder bekommt Zugriff auf relevante Speicherorte für Voice Transcript, Summary und Kontext.
- Telegram-Kontext muss explizit über eine Bridge oder Memory-Schicht verfügbar gemacht werden; er ist nicht automatisch im Browser-Call vorhanden.
- Research-Aufträge brauchen Tool-/Webzugriff und klare Antwortregeln.
- Voice-Arbeitsaufträge brauchen später eine sichere Übergabe in Datei-, Task- oder Agenten-Workflows.

---

## 6. Erste Domain-Begriffe

| Begriff | Bedeutung |
|---|---|
| Call Mode | mobile-first Voice-Erlebnis in Mission Control |
| Context Profile | auswählbarer Gesprächskontext, z. B. LUMA oder Sales Support |
| Base Context | beim Call-Start geladener Kontext |
| Live Retrieval | Nachziehen von Mission-Control-/Memory-/Telegram-Kontext während des Calls |
| Research Auftrag | per Voice ausgelöste aktuelle Recherche |
| Handoff | Übergabe vom Voice Call zurück in Telegram oder andere Arbeitsflächen |
| Call Artifact | aus dem Call erzeugtes Dokument, z. B. Spec, Summary, Open Questions |
| Uncertainty Handling | expliziter Umgang mit fehlendem oder unsicherem Wissen |

---

## 7. Erste Risiken

### Risiko 1 — Kontextillusion

Hermes könnte so wirken, als hätte er Telegram-/Mission-Control-Kontext, obwohl er ihn technisch nicht geladen hat.

**Gegenmaßnahme:** klare Retrieval-Pipeline und harte Regel gegen Halluzination.

### Risiko 2 — Zu viel Kontext

Zu viele Datenquellen können Antworten langsam, teuer oder unscharf machen.

**Gegenmaßnahme:** priorisierte Kontextauswahl, kompakte Summaries, Profil-spezifische Router.

### Risiko 3 — Research im Voice Flow fühlt sich langsam an

Wenn Research zu lange dauert, fühlt sich der Call kaputt an.

**Gegenmaßnahme:** sichtbarer/hörbarer Suchzustand, ggf. Kurzantwort + Follow-up.

### Risiko 4 — Telegram-Handoff bleibt unklar

Wenn der Call-Kontext nach Ende nicht sauber referenzierbar ist, kann Telegram nicht sinnvoll anschließen.

**Gegenmaßnahme:** stabile Call IDs, Summaries, Memory-Einträge und Telegram-Bridge.

### Risiko 5 — Voice erzeugt unkontrollierte Side Effects

Wenn Daniel per Voice Arbeitsaufträge gibt, könnten versehentlich Dateien, Tasks oder externe Aktionen entstehen.

**Gegenmaßnahme:** abgestufte Ausführung: Draft → Review → bestätigte Aktion.

---

## 8. Vorläufige Priorisierung

### Phase A — Spezifikation

- Big Picture Vision
- Extraction File
- Open Questions
- Business Logic
- State Machine

### Phase B — Kontext & Retrieval

- Profile definieren
- Kontextquellen mappen
- Live-Retrieval-Regeln definieren
- Telegram-/Memory-Handoff klären

### Phase C — Call UX

- mobile-first Call Screen
- Gesprächszustände sichtbar machen
- Start/Ende/Handoff sauber gestalten

### Phase D — Research & Tooling

- Research-Aufträge per Voice
- Tool-Ausführung mit Status
- sichere Side-Effect-Regeln

---

## 9. Übergang zum nächsten Spec-Schritt

Aus dieser Extraction ergeben sich zwei direkte Folgearbeiten:

1. **Open Questions File fortlaufend pflegen**  
   Offene Produkt-, Architektur- und UX-Fragen sammeln.

2. **Business Logic Spec erstellen**  
   Regeln für Kontextwahl, Retrieval, Research, Handoff und Arbeitsaufträge präzisieren.
