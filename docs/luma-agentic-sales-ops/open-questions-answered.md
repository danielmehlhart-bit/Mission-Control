# LUMA Agentic Sales Ops — Open Questions beantwortet

**Stand:** 2026-05-09 15:52 CEST  
**Quelle:** Daniels Antworten im Telegram-Thread  
**Ablage:** Mission-Control-Repo, weil dieses Vorhaben **nicht** in das LUMA-App-Repo gehört.  
**Scope:** Hermes + Daniels LUMA-Mailbox + Mission Control + Usage + Tracker + weitere erlaubte Quellen. Kein LUMA-App-/Website-Feature.

---

## Zusammenfassung der finalen Leitplanken

- **Produktgrenze:** Nicht LUMA-App, nicht LUMA-Website, niemals ins LUMA-Repo als Build-Ziel.
- **Systemgrenze:** Hermes / Mission Control / E-Mail / MC-State / JSON-Dateien.
- **Primäres Ziel:** Deal-Radar-System für Daniel.
- **Delivery:** Alles in den Sales Support Channel.
- **Taktung:** Monitor alle 10 Minuten; Daily Deal-Radar abends um 18:00.
- **Output:** Telegram-Pings, tägliches GTM-Cockpit, Draft-Vorschläge, MC-Updates. Kein Voice Digest.
- **Silent:** Kein `[SILENT]`-Hard-Silence; Daniel möchte auch Info, wenn nichts passiert. Daniel erwartet aber, dass praktisch immer etwas passiert.
- **Datenquellen:** Alle gelisteten Quellen dürfen gelesen werden: Gmail/GWS LUMA-Mailbox, Mission Control, Usage/Supabase, Kalender, Tracker-State, Instantly, öffentliche Websignale.
- **MC:** Mission Control ist die menschlich lesbare Wahrheit / Single Source of Truth. Sales-State-JSON ist operativer Cache für den Agenten.
- **Agenten:** Deal-Radar, Pilot-Health, Reply-Draft, Account-Dossier, Activation-Playbook, MC Data Steward.
- **Autonomie:** Agent darf Drafts, Briefings, CRM-Hygiene, Erinnerungen, MC-Aktivitäten, MC-Writes und Stagewechsel vorbereiten/ausführen — mit Guardrails.
- **No-Go:** Keine Kundenmails ohne Daniels OK. Keine spekulativen Stagewechsel. Keine weichen Vermutungen als CRM-Fakt. Kein Reminder-Spam.
- **Build-Go:** Nach Business-Logik und Datenmodell darf gebaut werden. Explizit out of scope: alles an LUMA App/Website.

---

## A. Zielbild / Scope

### Q1 — Was ist der erste konkrete Zielzustand?

**Antwort Daniel:** Deal-Radar.  
**Entscheidung:** Phase 1 zielt auf einen Deal-Radar-Agenten / ein Deal-Radar-System.

### Q2 — Welcher Output zählt als „fertig“ für Phase 1?

**Antwort Daniel:**

- Telegram-Ping: ja.
- Silent wenn nichts gibt: nicht als hartes Schweigen; Daniel möchte auch dann eine Info. Er erwartet aber, dass der Fall praktisch nie vorkommt.
- Tägliches GTM-Cockpit: ja.
- Draftvorschläge: ja.
- MC-Updates: ja.
- Voice-Digests: nein.

**Entscheidung:** Fertig heißt: Telegram-basierter Deal-Radar mit täglichem GTM-Cockpit, Draftvorschlägen und MC-Update-Fähigkeit. Kein Voice-Output.

### Q3 — Für wen wird gebaut?

**Antwort Daniel:** Nur für Daniel. Es wird nicht an LUMA gekoppelt. Es geht um Hermes, Daniels E-Mails, Mission Control usw. Kein Feature in der LUMA-App.

**Entscheidung:** Daniel-internes GTM-/Sales-Ops-System, kein LUMA-Produktfeature.

### Q4 — Repo-/Systemgrenze?

**Antwort Daniel:** Nichts ins LUMA-Repo, niemals. Dokumentation/Umsetzung, wenn überhaupt, in Mission-Control-Repo oder Hermes-Memory/JSON-Files.

**Entscheidung:** Build- und Doku-Ziel ist Mission Control/Hermes. Das LUMA-App-Repo ist out of bounds.

---

## B. Accounts, Datenquellen, Wahrheit

### Q5 — Was ist die primäre Account-Quelle?

**Antwort Daniel:** Mission Control ist Single Source of Truth / menschlich lesbare Wahrheit. Sales-State-JSON ist abgeleiteter operativer Cache-State für den Agenten.

**Entscheidung:** MC = Wahrheit; JSON = Agenten-Cache.

### Q6 — Welche Accounts sind in Phase 1 im Scope?

**Antwort Daniel:** Weber, HUM/HAMM, Studio Pampa, A bis Z und PE Stab.

**Entscheidung:** Phase-1-Account-Scope:

- Weber
- HAMM / HUM (Bezeichnung in MC verifizieren)
- Studio Pampa
- A-Z
- PE Stab

### Q7 — Welche Datenquellen darf der Agent lesen?

**Antwort Daniel:** Alle gelisteten Quellen.

**Entscheidung:** Erlaubte Quellen:

- Gmail/GWS LUMA-Mailbox `daniel@luma-app.io`
- Mission Control Accounts/People/Deals/Activities/Tasks/Notes
- Usage Telemetry/Supabase
- Kalender
- Tracker-State JSON
- Instantly
- öffentliche Websignale

### Q8 — Wie wird Evidenz gespeichert?

**Antwort Daniel:** Jede Empfehlung baut auf Evidence. Antwortvorschlag angenommen.

**Entscheidung:** Jede Empfehlung braucht `evidence[]` mit Quelle, Timestamp, Snippet/ID und Confidence.

### Q9 — Wie lange wird Agent-State behalten?

**Antwort Daniel:** 90 Tage, alte Einträge archivieren.

**Entscheidung:** Persistenter Agent-State für mindestens 90 Tage; danach archivieren statt löschen.

---

## C. Agenten-Rollen

### Q10 — Welche Agenten existieren wirklich in Phase 1?

**Antwort Daniel:** Gewünscht sind:

- Deal-Radar-Agent
- Pilot-Health-Agent
- Reply-Draft-Agent
- Account-Dossier-Agent
- Activation-Playbook-Agent
- MC Data Steward

**Entscheidung:** Diese sechs Agentenrollen werden in Business-Logik und Datenmodell berücksichtigt. Kein Founder Voice Digest in Phase 1.

### Q11 — Darf der Deal-Radar-Agent Drafts schreiben?

**Antwort Daniel:** Ja.

**Entscheidung:** Draft-Vorschläge sind Teil des Systems.

### Q12 — Darf ein MC Data Steward schon schreiben?

**Antwort Daniel:** Steward darf schreiben als Textvorschlag; Daniel kann danach sagen, dass er z.B. eine E-Mail schicken soll.

**Entscheidung:** MC Data Steward darf MC-Schreibaktionen und E-Mail-Aktionen vorbereiten/vorschlagen. Ausführung abhängig von Guardrails und Daniel-OK, insbesondere bei externen E-Mails.

### Q13 — Voice Digest?

**Antwort Daniel:** Voice Digest brauchen wir gerade nicht.

**Entscheidung:** Voice Digest out of scope.

---

## D. Erlaubte / verbotene Aktionen

### Q14 — Welche Aktionen darf der Agent autonom ausführen?

**Antwort Daniel:** Folgende Aktionen sind grundsätzlich gewünscht/erlaubt:

- Follow-up-Drafts vorbereiten
- MC-Aktivitäten schreiben
- Briefings erstellen
- CRM-Hygiene
- Erinnerungen setzen
- Stagewechsel auch
- MC-Write auch

**Entscheidung:** Agent darf grundsätzlich schreiben/ändern, inklusive MC-Writes und Stagewechsel, aber nur innerhalb der Guardrails aus Q15.

### Q15 — Was ist explizit verboten?

**Antwort Daniel:**

- Keine Mails ohne Daniels OK.
- Keine spekulativen Stagewechsel.
- Keine weichen Vermutungen als CRM-Fakt.
- Kein Reminder-Spam.
- Agent soll fragen können, wenn er unsicher ist.

**Entscheidung:** Diese Guardrails sind verbindlich.

### Q16 — Was heißt „Daniels OK“ praktisch?

**Antwort aus Daniels Kontext:** Bei E-Mail-Versand braucht es Daniels explizites OK. Wenn Daniel nach Review Go gibt, darf der Agent senden.

**Entscheidung:** Externe Mail-Aktionen brauchen explizite Freigabe pro Fall. Nach explizitem Go darf direkt gesendet werden.

### Q17 — Darf der Agent existierende Cronjobs pausieren/löschen?

**Antwort Daniel:** Der Agent soll sagen, wenn er Zombies gefunden hat; Daniel kann dann sagen, dass er sie löschen soll.

**Entscheidung:** Zombie-Cronjobs nur erkennen und melden. Löschen/pausieren erst nach Daniel-OK.

---

## E. Priorisierung / Scoring

### Q18 — Wie wird `why_now` bestimmt?

**Antwort Daniel:** Alle genannten Signale sind relevant.

**Entscheidung:** Relevante `why_now`-Signale:

- offene Reply-Threads
- offene Commitments
- stale Commitments
- Usage-Änderung
- 0 Logins
- hohe Nutzung + stiller Champion
- bevorstehender Call
- Pilot 3–5 Tage ohne Nutzung
- neue externe Firmensignale

### Q19 — Welche Prioritätsstufen gibt es?

**Antwort Daniel:** P0, P1 usw.

**Entscheidung:** Priorisierung mit P0/P1/P2/P3. Numeric Score kann intern ergänzend genutzt werden, ist aber nicht primäre Darstellung.

### Q20 — Was ist ein „echter Delta“?

**Antwort Daniel:** Antwortvorschlag angenommen.

**Entscheidung:** Delta, wenn seit letztem Run neu:

- neue Antwort
- neues Commitment
- Commitment overdue
- Usage-Health-Wechsel
- Call in nächstem Zeitfenster
- manueller Tracker-State-Wechsel

### Q21 — Wie wird Noise verhindert?

**Antwort Daniel:** Antwortvorschlag angenommen.

**Entscheidung:** Pro Account/Signal Cooldown; gleicher Hinweis maximal 1x/Tag, stale Commitment maximal alle 48h, solange keine neue Evidenz.

---

## F. Mail / Drafts / Reply-or-Ignore

### Q22 — Welche Mailbox ist im Scope?

**Antwort Daniel:** Im Scope ist `daniel@luma-app.io`; andere nicht.

**Entscheidung:** Nur LUMA-Mailbox `daniel@luma-app.io`.

### Q23 — Welche Klassifikationen braucht Reply-or-Ignore?

**Antwort Daniel:** Benötigt: Antwort nötig, später, schließen, MC aktualisieren. Wenn Daniel eine Antwort geschrieben hat, soll MC so oder so aktualisiert werden.

**Entscheidung:** Klassifikationen:

- `reply_needed`
- `remind_later`
- `close`
- `mc_update_needed`
- `needs_human_judgment`

Zusatzregel: Wenn Daniel eine Antwort geschrieben/gesendet hat, wird MC aktualisiert.

### Q24 — Wie soll ein Draft aussehen?

**Antwort Daniel:** Antwortvorschlag angenommen.

**Entscheidung:** Draft-Struktur:

- Betreff optional
- 3–8 Sätze
- Daniel-Stimme
- keine übertriebenen Sales-Floskeln
- konkrete nächste Frage/CTA
- darunter: „Warum dieser Draft“ + Quellen/Evidence

### Q25 — Wo werden Drafts abgelegt?

**Antwort Daniel:** Bitte nur als Telegram. Gmail erst nach entsprechendem Go; dann darf direkt gesendet werden.

**Entscheidung:** Drafts zunächst im Telegram-Output. Gmail-Draft/Senden erst nach explizitem Daniel-Go. Nach Go darf direkt gesendet werden.

---

## G. Usage / Pilot Health

### Q26 — Welche Usage-Metriken sind verbindlich?

**Antwort Daniel:** Gewünscht sind:

- Logins
- aktive Nutzer
- erstellte Aufgaben
- erstellte Projekte
- erstellte Bautagebucheinträge
- E-Mail-Aktivität / wie viele Synchronisierungen gab es

**Entscheidung:** Diese Metriken sind für Pilot Health verbindlich.

### Q27 — Wie werden Pilot-Health-Stufen benannt?

**Antwort Daniel:** Vorschlag angenommen.

**Entscheidung:** Health-Stufen:

- `healthy`
- `watch`
- `at_risk`
- `stalled`

Immer plus kurze Begründung.

### Q28 — Welche Piloten/Accounts gelten als Phase-1-Pilot-Health-Scope?

**Antwort Daniel:** Weber, PE Stab, Studio Pampa und A bis Z. Aus Q6 zusätzlich HAMM/HUM.

**Entscheidung:** Pilot-Health-Scope:

- Weber
- HAMM/HUM (Bezeichnung verifizieren)
- PE Stab
- Studio Pampa
- A-Z

---

## H. Mission Control

### Q29 — Welche MC-Felder darf der Agent lesen?

**Antwort Daniel:** Agent darf alles lesen und schreiben.

**Entscheidung:** Agent darf alle relevanten MC-Daten lesen.

### Q30 — Welche MC-Felder darf der Agent später schreiben?

**Antwort Daniel:** Agent darf alles lesen und schreiben.

**Entscheidung:** Agent darf MC schreiben, inklusive Activities, Notes, next steps, People/Accounts/Deals und Stagewechsel — aber keine spekulativen Stagewechsel und keine weichen Vermutungen als CRM-Fakt.

### Q31 — Wie wird „Fakt“ vs. „Vermutung“ markiert?

**Antwort aus Q15/Q32–Q34:** Keine weichen Vermutungen als CRM-Fakt; Vorschlag Q32–Q34 angenommen.

**Entscheidung:** Fakten in MC nur mit Quelle/Evidence. Ableitungen als Empfehlung/Interpretation markieren, nicht als Fakt.

---

## I. Architektur / Speicherformat

### Q32 — Sales-State-JSON oder SQLite/Supabase?

**Antwort Daniel:** Vorschlag angenommen.

**Entscheidung:** Start als versioniertes JSON unter Hermes/Mission-Control-State, später SQLite wenn stabil.

### Q33 — Braucht jeder Run ein Run-Log?

**Antwort Daniel:** Vorschlag angenommen.

**Entscheidung:** Ja. Pro Run: input snapshot refs, decisions, suppressed items, delivered output, errors.

### Q34 — Wie werden Secrets/PII geschützt?

**Antwort Daniel:** Vorschlag angenommen.

**Entscheidung:** Keine Tokens/Secrets. E-Mail-Inhalte nur relevante Snippets; personenbezogene Daten nur, wenn für Aktion nötig.

---

## J. Rollout / Cron / Delivery

### Q35 — Welche Taktung für Phase 1?

**Antwort Daniel:** Alle 10 Minuten. Daily Deal-Radar abends um 18 Uhr.

**Entscheidung:**

- Monitor/Delta-Run: alle 10 Minuten.
- Daily Deal-Radar / GTM-Cockpit: 18:00.

### Q36 — Wohin wird geliefert?

**Antwort Daniel:** Alles in den Sales Support Channel.

**Entscheidung:** Delivery: Sales Support Channel / Topic 23.

### Q37 — Was passiert bei Fehlern?

**Antwort Daniel:** Bei Fehlerstatus bitte immer Ping.

**Entscheidung:** Jeder Fehlerstatus wird gepingt, nicht erst nach Wiederholung.

---

## K. Implementation-Gates

### Q38 — Dürfen wir nach Klärung direkt bauen?

**Antwort Daniel:** Wenn alles geklärt ist, darf gebaut werden.

**Entscheidung:** Build-Go grundsätzlich erteilt, nachdem Business-Logik-Regeln und Datenmodell aus diesen Antworten erstellt wurden.

### Q39 — Welche Tests/Verifikation sind Pflicht?

**Antwort Daniel:** Vorschlag angenommen.

**Entscheidung:** Pflichttests:

- Dry-run mit historischem Mail/Usage-State
- No-Delta-/Info-Output-Test
- Duplicate-Suppression
- MC-Write-Guardrail-Test
- keine externe Mail ohne Daniel-OK
- Fehlerfall-Test mit Ping

### Q40 — Was ist explizit out of scope für den ersten Build?

**Antwort Daniel:** Explizit out of scope ist alles, was mit der LUMA-App oder LUMA-Website zu tun hat. Das hat damit nichts zu tun.

**Entscheidung:** Out of scope:

- LUMA-App
- LUMA-Website
- Änderungen am LUMA-Repo
- Kundenfeature in LUMA
- Voice Digest

---

## Offene Mini-Klärungen / Naming-Verifikation

Nicht blockierend, aber vor Implementierung sauber zu verifizieren:

1. **HAMM vs. HUM:** Daniel sagte „HUM“/„HUM Studio Pumper“ akustisch/Transkript-unklar; bestehender Kontext kennt HAMM. In MC Account-Namen verifizieren.
2. **A-Z Schreibweise:** `A-Z`, `A bis Z`, oder exakter MC-Accountname verifizieren.
3. **PE Stab Schreibweise:** Exakter MC-Accountname verifizieren.
4. **Studio Pampa Schreibweise:** Exakter MC-Accountname verifizieren.

---

## Nächste Dokumentationsschritte

1. Business-Logik-Regeln aus diesen Entscheidungen erstellen.
2. Datenmodell / State-JSON ableiten.
3. Danach Build im Mission-Control/Hermes-Kontext starten — nicht im LUMA-App-Repo.
