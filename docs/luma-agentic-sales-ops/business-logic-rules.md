# LUMA Agentic Sales Ops — Business-Logik-Regeln

**Stand:** 2026-05-09  
**Basis:** `docs/luma-agentic-sales-ops/open-questions-answered.md`  
**Geltungsbereich:** Daniel-internes Hermes/Mission-Control-System. Nicht LUMA-App. Nicht LUMA-Website. Nicht LUMA-Repo.

---

## 1. Systemziel

Das System baut einen Deal-Radar für Daniels LUMA-GTM-Arbeit.

Es verbindet:

- LUMA-Mailbox `daniel@luma-app.io`,
- Mission Control,
- Usage/Supabase,
- Kalender,
- Tracker-State,
- Instantly,
- öffentliche Websignale.

Es liefert:

- alle 10 Minuten einen Monitor-/Delta-Run in den Sales Support Channel,
- täglich um 18:00 ein GTM-Cockpit / Daily Deal-Radar,
- Draft-Vorschläge,
- MC-Update-Aktionen,
- Prioritäten P0/P1/P2/P3,
- Evidence für jede Empfehlung.

Kein Voice Digest.

---

## 2. Globale Guardrails

### 2.1 Nie ohne Freigabe

Der Agent darf keine externe Kundenmail ohne Daniels explizites OK senden.

Nach explizitem Go darf der Agent direkt senden.

### 2.2 Keine spekulativen CRM-Fakten

Der Agent darf keine weichen Vermutungen als Mission-Control-Fakt speichern.

Erlaubt als MC-Fakt nur mit Evidence aus:

- Mail,
- Call,
- Usage,
- Kalender,
- Instantly,
- öffentlicher Quelle,
- Daniels expliziter Notiz/Antwort.

Ableitungen müssen als Empfehlung/Interpretation markiert bleiben.

### 2.3 Stagewechsel nur evidence-basiert

Stagewechsel sind grundsätzlich erlaubt, aber nie spekulativ.

Erlaubt nur wenn:

- klare Evidence vorliegt, oder
- Daniel explizit Go gibt.

### 2.4 Kein Reminder-Spam

Der Agent darf Daniel nicht mit wiederholten Hinweisen ohne neue Evidence nerven.

Regeln:

- gleicher Account/gleiches Signal maximal 1x pro Tag,
- stale Commitment maximal alle 48h,
- erneuter Ping früher nur bei neuer Evidence oder neuer Dringlichkeit.

### 2.5 Fehler immer pingen

Jeder Fehlerstatus wird in den Sales Support Channel gepingt.

---

## 3. Agentenrollen

### 3.1 Deal-Radar-Agent

**Zweck:** priorisiert täglich und laufend die wichtigsten GTM-Aktionen.

**Liest:** alle erlaubten Quellen.

**Schreibt:**

- Telegram-Pings,
- Daily GTM-Cockpit,
- Agent-State JSON,
- Run-Logs,
- MC-Aktivitäten/Updates, wenn Evidence vorhanden und Guardrails erfüllt.

**Output pro Empfehlung:**

- Account,
- Priorität P0/P1/P2/P3,
- `why_now`,
- Evidence,
- recommended_action,
- draft_needed,
- mc_update_needed,
- urgency.

### 3.2 Pilot-Health-Agent

**Zweck:** bewertet Health der Phase-1-Accounts.

**Scope Accounts:**

- Weber,
- HAMM/HUM — exakten MC-Namen verifizieren,
- PE Stab,
- Studio Pampa,
- A-Z.

**Metriken:**

- Logins,
- aktive Nutzer,
- erstellte Aufgaben,
- erstellte Projekte,
- erstellte Bautagebucheinträge,
- E-Mail-Aktivität / Synchronisierungen.

**Health-Stufen:**

- `healthy`,
- `watch`,
- `at_risk`,
- `stalled`.

Jede Health-Bewertung braucht Begründung + Evidence.

### 3.3 Reply-Draft-Agent

**Zweck:** offene Mailthreads klassifizieren und Antwortentwürfe erstellen.

**Mailbox:** nur `daniel@luma-app.io`.

**Klassifikationen:**

- `reply_needed`,
- `remind_later`,
- `close`,
- `mc_update_needed`,
- `needs_human_judgment`.

**Draft-Regeln:**

- Telegram-only bis Daniel Go gibt,
- Betreff optional,
- 3–8 Sätze,
- Daniel-Stimme,
- keine übertriebenen Sales-Floskeln,
- konkrete nächste Frage/CTA,
- darunter „Warum dieser Draft“ + Quellen.

**Nach Versand/Antwort:** MC wird aktualisiert.

### 3.4 Account-Dossier-Agent

**Zweck:** vor relevanten Terminen oder auf Nachfrage Account-Briefings erstellen.

**Inhalt:**

- Account-Rolle/Kontaktrolle,
- letzte Mail,
- Usage,
- offene Todos,
- wahrscheinlichster Pain,
- Demo-/Gesprächsfokus,
- 3 Fragen.

### 3.5 Activation-Playbook-Agent

**Zweck:** reagiert auf fehlende Pilot-Nutzung und schlägt Interventionen vor.

**Trigger:** Pilot zeigt 3–5 Tage keine Nutzung oder Health fällt auf `at_risk`/`stalled`.

**Interventionen:**

- Kurzvideo,
- Mail,
- Call-Vorschlag,
- Feature-Hinweis,
- interne Bug-/UX-Aufgabe.

### 3.6 MC Data Steward

**Zweck:** Mission Control sauber halten.

**Darf:**

- Activities schreiben,
- Notes schreiben,
- next steps setzen,
- CRM-Hygiene durchführen,
- People/Accounts/Deals aktualisieren,
- evidence-basierte Stagewechsel durchführen.

**Darf nicht:**

- Spekulation als Fakt speichern,
- spekulative Stagewechsel durchführen,
- externe Mails ohne Daniel-OK senden.

---

## 4. Priorisierung

### 4.1 Prioritätsstufen

- `P0`: heute kritisch; Antwort/Intervention akut nötig.
- `P1`: wichtig; sollte heute oder morgen behandelt werden.
- `P2`: relevant; beobachten oder planbarer Follow-up.
- `P3`: niedrige Priorität; nur im Daily Cockpit, kein Sofort-Ping.

### 4.2 `why_now`-Signale

Ein Account wird relevant, wenn mindestens eines dieser Signale vorliegt:

- neue Antwort,
- offener Reply-Thread,
- neues Commitment,
- overdue/stale Commitment,
- Usage-Health-Wechsel,
- 0 Logins,
- hohe Nutzung + stiller Champion,
- bevorstehender Call,
- 3–5 Tage Pilot-Stille,
- neues externes Firmensignal.

### 4.3 Delta-Regel

Ein 10-Minuten-Ping entsteht, wenn seit dem letzten Run ein echter Delta vorliegt:

- neue Antwort,
- neues Commitment,
- Commitment overdue,
- Usage-Health-Wechsel,
- Call in nächstem Zeitfenster,
- manueller Tracker-State-Wechsel,
- Fehlerstatus.

Wenn nichts Neues passiert, darf trotzdem eine kurze Info geliefert werden, aber keine künstliche Dringlichkeit.

---

## 5. Delivery-Regeln

### 5.1 Sales Support Channel

Alle Outputs gehen in den Sales Support Channel / Topic 23.

### 5.2 10-Minuten-Monitor

Zweck:

- Deltas,
- Fehler,
- P0/P1-Aktionen,
- Freigabe-Fragen.

### 5.3 Daily Deal-Radar um 18:00

Inhalt:

- GTM-Cockpit,
- Top Accounts,
- erledigte Signale,
- offene Entscheidungen,
- Risiken,
- Drafts,
- MC-Updates/Änderungen.

---

## 6. Mission-Control-Regeln

### 6.1 MC als Wahrheit

Mission Control ist die menschlich lesbare Single Source of Truth.

### 6.2 Sales-State JSON als Cache

Sales-State JSON speichert operativen Agentenstatus, aber ersetzt MC nicht.

### 6.3 MC-Writes

MC-Writes sind erlaubt, wenn:

- Evidence vorhanden ist,
- Änderung nicht spekulativ ist,
- keine externe Mail ohne OK ausgelöst wird,
- Run-Log die Änderung dokumentiert.

---

## 7. Cron-/Zombie-Regeln

Der Agent darf Zombie-Jobs erkennen und Daniel melden.

Der Agent darf Zombie-Jobs nicht ohne Daniel-OK löschen/pausieren.

Meldung muss enthalten:

- Jobname,
- Schedule,
- letzter Status,
- warum Zombie-Verdacht,
- empfohlene Aktion: behalten / pausieren / löschen / ersetzen.

---

## 8. Tests vor Aktivierung

Pflicht vor Live-Aktivierung:

- Dry-run mit historischem Mail-/Usage-State,
- No-Delta-/Info-Output-Test,
- Duplicate-Suppression,
- MC-Write-Guardrail-Test,
- Test: keine externe Mail ohne Daniel-OK,
- Fehlerfall-Test mit Ping.

---

## 9. Out of Scope

- LUMA-App,
- LUMA-Website,
- LUMA-Repo,
- Kundenfeature,
- Voice Digest.
