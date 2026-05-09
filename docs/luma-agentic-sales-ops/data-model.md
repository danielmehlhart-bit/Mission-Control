# LUMA Agentic Sales Ops — Datenmodell / State-JSON

**Stand:** 2026-05-09  
**Basis:**

- `docs/luma-agentic-sales-ops/open-questions-answered.md`
- `docs/luma-agentic-sales-ops/business-logic-rules.md`
- bestehende Hermes-Scripts:
  - `~/.hermes/scripts/luma_mail_state.py`
  - `~/.hermes/scripts/luma_sales_unified_sync_context.py`
  - `~/.hermes/luma_mail_state.json`

**Geltungsbereich:** Daniel-internes Hermes/Mission-Control-System.  
**Explizit nicht:** LUMA-App, LUMA-Website, LUMA-App-Repo.

---

## 1. Modell-Prinzipien

### 1.1 Mission Control bleibt Wahrheit

Mission Control ist die menschlich lesbare Wahrheit für:

- Accounts,
- People,
- Deals,
- Activities,
- Notes,
- Tasks,
- Sales-/CRM-Historie.

Das Agentenmodell darf MC nicht ersetzen.

### 1.2 Sales-State-JSON ist operativer Cache

Das Sales-State-JSON speichert nur:

- was der Agent für Delta-Erkennung braucht,
- letzte Signale,
- Suppression/Cooldowns,
- offene Empfehlungen,
- Run-Logs,
- Evidence-Referenzen,
- Audit-Trail für Agentenentscheidungen.

### 1.3 Keine Secrets / begrenzte PII

Im State stehen keine Tokens, Passwörter, OAuth-Details oder vollständige Mailinhalte.

Erlaubt sind:

- IDs,
- Timestamps,
- kurze Snippets,
- Quellenreferenzen,
- für Aktionen nötige Personen-/Account-Namen.

### 1.4 Retention

Aktiver State bleibt 90 Tage im Hauptfile. Ältere Einträge werden archiviert.

---

## 2. Dateistruktur

Empfohlene Ablage unter Hermes:

```text
~/.hermes/state/luma-agentic-sales-ops/
  sales-state.json
  run-logs/
    2026-05-09T16-00-00+02-00-monitor.json
    2026-05-09T18-00-00+02-00-daily.json
  archives/
    sales-state-archive-2026-Q2.jsonl
  drafts/
    draft-<recommendation_id>.md
```

Warum nicht im LUMA-Repo:

- Daniel hat explizit entschieden: nichts ins LUMA-Repo.
- Es ist kein LUMA-App-Feature.
- State enthält persönliche GTM-/Mailbox-/MC-Kontextdaten.

---

## 3. Top-Level `sales-state.json`

### Felder

- `schema_version`: Versionsnummer des State-Modells, Start `1`.
- `updated_at`: letzter erfolgreicher Schreibzeitpunkt.
- `timezone`: `Europe/Berlin`.
- `scope`: technische und fachliche Grenzen.
- `accounts`: Account-State, keyed by `account_key`.
- `threads`: Mailthread-State, keyed by Gmail `thread_id`.
- `commitments`: offene/erledigte Commitments, keyed by `commitment_id`.
- `recommendations`: aktuelle Empfehlungen, keyed by `recommendation_id`.
- `suppression`: Cooldown-/Noise-Regeln je Signal.
- `jobs`: Cron-/Run-Konfiguration und letzter Status.
- `last_runs`: Kurzstatus der letzten Runs.

### Skeleton

```json
{
  "schema_version": 1,
  "updated_at": "2026-05-09T16:00:00+02:00",
  "timezone": "Europe/Berlin",
  "scope": {
    "mailbox": "daniel@luma-app.io",
    "delivery_target": "telegram:sales-support-topic-23",
    "in_scope_accounts": ["weber", "hamm", "pe-stab", "studio-pampa", "a-z"],
    "out_of_scope": ["luma-app", "luma-website", "luma-repo", "voice-digest"]
  },
  "accounts": {},
  "threads": {},
  "commitments": {},
  "recommendations": {},
  "suppression": {},
  "jobs": {},
  "last_runs": {}
}
```

---

## 4. `AccountState`

Ein Account-State ist der operative Cache für einen MC-Account.

### Spreadsheetartige Felder

- `account_key`: stabiler Agent-Key, z.B. `studio-pampa`.
- `display_name`: menschlicher Name.
- `mc_account_id`: Mission-Control-ID, falls vorhanden.
- `mc_account_name`: Accountname aus MC.
- `aliases`: alternative Namen/Schreibweisen.
- `domains`: Domains für Mail-Matching.
- `phase1_scope`: Boolean.
- `owner`: aktuell `daniel`.
- `deal_stage`: letzte bekannte MC-Stage.
- `stage_source`: `mission_control` oder `agent_recommendation`.
- `stage_last_verified_at`: Timestamp.
- `health_status`: `healthy | watch | at_risk | stalled | unknown`.
- `health_reason`: kurze Begründung.
- `priority`: `P0 | P1 | P2 | P3 | none`.
- `score`: optionaler interner 0–100 Score.
- `last_signal_at`: letztes relevantes Signal aus irgendeiner Quelle.
- `last_mc_activity_at`: letztes MC-Signal.
- `last_mail_at`: letzte Mail.
- `last_inbound_mail_at`: letzte eingehende Mail.
- `last_sent_mail_at`: letzte gesendete Mail.
- `last_usage_at`: letzte Produktnutzung.
- `next_check_at`: nächster planmäßiger Check.
- `open_thread_ids`: relevante offene Gmail-Threads.
- `open_commitment_ids`: offene Commitments.
- `open_recommendation_ids`: aktive Empfehlungen.
- `usage`: eingebetteter Usage-Snapshot.
- `evidence_refs`: Evidence-IDs für aktuelle Account-Einschätzung.
- `updated_at`: letzter Agent-Write.

### JSON-Beispiel

```json
{
  "account_key": "studio-pampa",
  "display_name": "Studio Pampa",
  "mc_account_id": "acc_1773571626030",
  "mc_account_name": "Studio Pampa",
  "aliases": ["Studio Pampa"],
  "domains": [],
  "phase1_scope": true,
  "owner": "daniel",
  "deal_stage": "pilot",
  "stage_source": "mission_control",
  "stage_last_verified_at": "2026-05-09T16:00:00+02:00",
  "health_status": "watch",
  "health_reason": "Offene externe Antworten und keine neue Nutzung seit mehreren Tagen.",
  "priority": "P1",
  "score": 78,
  "last_signal_at": "2026-05-06T12:13:32+02:00",
  "last_mc_activity_at": null,
  "last_mail_at": "2026-05-06T12:13:32+02:00",
  "last_inbound_mail_at": "2026-05-06T12:13:32+02:00",
  "last_sent_mail_at": "2026-05-06T12:12:22+02:00",
  "last_usage_at": null,
  "next_check_at": "2026-05-10T09:00:00+02:00",
  "open_thread_ids": ["19dfc1cd079e8428"],
  "open_commitment_ids": [],
  "open_recommendation_ids": ["rec_20260509_studio-pampa_reply_001"],
  "usage": {
    "period_start": "2026-05-02",
    "period_end": "2026-05-09",
    "logins": 0,
    "active_users": 0,
    "tasks_created": 0,
    "projects_created": 0,
    "site_diary_entries_created": 0,
    "email_sync_count": 0,
    "trend_vs_previous_period": "down",
    "source": "supabase"
  },
  "evidence_refs": ["ev_20260509_mail_19dfc1cd079e8428"],
  "updated_at": "2026-05-09T16:00:00+02:00"
}
```

---

## 5. Phase-1-Accounts

Startliste im State unter `scope.in_scope_accounts` und `accounts`:

### Weber

- `account_key`: `weber`
- `display_name`: `Weber Architekten`
- bekannte MC-ID aus bestehendem Mail-State: `acc_1773170881682_zt4rhp`
- Naming zu verifizieren in MC.

### HAMM / HUM

- `account_key`: `hamm`
- `display_name`: `HAMM Architekten`
- bekannte MC-ID aus bestehendem Mail-State: `acc_1773170881681_645zxm`
- Daniel-Audio enthielt evtl. „HUM“; MC-Name verifizieren.

### PE Stab

- `account_key`: `pe-stab`
- `display_name`: `PE Stab`
- bekannte MC-ID aus bestehendem Mail-State: `acc_1776946411720`
- Naming zu verifizieren in MC.

### Studio Pampa

- `account_key`: `studio-pampa`
- `display_name`: `Studio Pampa`
- bekannte MC-ID aus bestehendem Mail-State: `acc_1773571626030`

### A-Z

- `account_key`: `a-z`
- `display_name`: `A-Z Architekten BDA`
- bekannte MC-ID aus bestehendem Mail-State: `acc_1776024786357`
- Daniel sagte „A bis Z“; MC-Name `A-Z Architekten BDA` verifizieren.

---

## 6. `ThreadState`

Basiert auf bestehendem `~/.hermes/luma_mail_state.json`, wird aber normalisiert.

### Felder

- `thread_id`: Gmail Thread-ID.
- `account_key`: Agent-Account-Key, falls gematcht.
- `mc_account_id`: MC-ID, falls vorhanden.
- `person_name`: Person aus MC oder Mail-Match.
- `subject`: Betreff, gekürzt falls nötig.
- `classification`: `reply_needed | remind_later | close | mc_update_needed | needs_human_judgment | waiting_on_customer`.
- `last_speaker`: `daniel | external | system | unknown`.
- `last_message_id`: neueste Gmail Message-ID.
- `last_message_at`: Timestamp.
- `last_external_message_id`: letzte externe Message-ID.
- `last_external_at`: Timestamp.
- `last_daniel_message_id`: letzte Daniel Message-ID.
- `last_daniel_at`: Timestamp.
- `open_reply_needed`: Boolean.
- `waiting_on_customer`: Boolean.
- `commitment_open`: Boolean.
- `commitment_id`: optional.
- `snippet`: kurzes relevantes Snippet, keine volle Mail.
- `labels`: relevante Gmail-/Hermes-Labels.
- `dismissed_reason`: falls Daniel geschlossen hat.
- `dismissed_at`: Timestamp.
- `updated_at`: Timestamp.

### JSON-Beispiel

```json
{
  "thread_id": "19dfc1cd079e8428",
  "account_key": "studio-pampa",
  "mc_account_id": "acc_1773571626030",
  "person_name": "Juliane Maier",
  "subject": "AW: Danke für den Workshop gestern",
  "classification": "reply_needed",
  "last_speaker": "external",
  "last_message_id": "19dfc8fd6f62ded6",
  "last_message_at": "2026-05-06T11:12:48+02:00",
  "last_external_message_id": "19dfc8fd6f62ded6",
  "last_external_at": "2026-05-06T11:12:48+02:00",
  "last_daniel_message_id": "19dfc1e35e75d746",
  "last_daniel_at": "2026-05-06T09:08:51+02:00",
  "open_reply_needed": true,
  "waiting_on_customer": false,
  "commitment_open": false,
  "commitment_id": null,
  "snippet": "Kurzes relevantes Snippet, keine vollständige Mail.",
  "labels": ["HERMES/MC-Contact"],
  "dismissed_reason": null,
  "dismissed_at": null,
  "updated_at": "2026-05-09T16:00:00+02:00"
}
```

---

## 7. `UsageSnapshot`

Usage wird pro Account und Zeitraum gespeichert.

### Felder

- `account_key`
- `period_start`
- `period_end`
- `logins`
- `active_users`
- `tasks_created`
- `projects_created`
- `site_diary_entries_created`
- `email_sync_count`
- `last_activity_at`
- `trend_vs_previous_period`: `up | flat | down | unknown`
- `health_status`: `healthy | watch | at_risk | stalled | unknown`
- `health_reason`
- `source`: z.B. `supabase`
- `source_query_ref`: Referenz auf Run-Log, nicht Query mit Secrets.

### Spreadsheetartige Struktur

Pro Daily Run entsteht intern eine Zeile je Account:

- Datum
- Account
- Logins
- Aktive Nutzer
- Aufgaben erstellt
- Projekte erstellt
- Bautagebucheinträge erstellt
- E-Mail-Syncs
- letzter Activity-Zeitpunkt
- Trend
- Health
- Evidence-ID

---

## 8. `Commitment`

Commitments entstehen aus Daniels gesendeten Mails, MC-Notes, Calls oder expliziten Daniel-Antworten.

### Felder

- `commitment_id`: stabiler Key.
- `account_key`
- `source_type`: `gmail | mission_control | call | telegram | manual`.
- `source_id`: Message-ID, Activity-ID, etc.
- `owner`: `daniel | customer | agent`.
- `summary`: kurze Verpflichtung.
- `created_at`
- `due_at`: optional.
- `status`: `open | done | stale | dismissed`.
- `last_pinged_at`
- `stale_after_days`: Standard `2` für Mail-Commitments.
- `evidence_refs`

### JSON-Beispiel

```json
{
  "commitment_id": "com_20260509_weber_mail_001",
  "account_key": "weber",
  "source_type": "gmail",
  "source_id": "19db5b84eda4dd1a",
  "owner": "daniel",
  "summary": "Daniel wollte eine kurze Rückmeldung zur E-Mail-Weiterleitung geben.",
  "created_at": "2026-04-22T17:04:06+02:00",
  "due_at": null,
  "status": "stale",
  "last_pinged_at": "2026-05-09T16:00:00+02:00",
  "stale_after_days": 2,
  "evidence_refs": ["ev_20260509_mail_19db5b84eda4dd1a"]
}
```

---

## 9. `Evidence`

Evidence ist Pflicht für jede Empfehlung und jeden MC-Fakt.

### Felder

- `evidence_id`: stabiler Key.
- `source_type`: `gmail | mission_control | usage | calendar | instantly | web | telegram | manual`.
- `source_id`: Message-ID, Account-ID, Event-ID, URL, etc.
- `source_label`: lesbarer Quellenname.
- `observed_at`: wann das Signal passiert ist.
- `collected_at`: wann der Agent es gelesen hat.
- `account_key`
- `person_name`: optional.
- `snippet`: kurzer Textauszug.
- `confidence`: `high | medium | low`.
- `fact_type`: z.B. `inbound_reply`, `usage_drop`, `stage_evidence`, `commitment`, `calendar_event`.
- `pii_level`: `none | low | medium`.

### JSON-Beispiel

```json
{
  "evidence_id": "ev_20260509_mail_19dfc8fd6f62ded6",
  "source_type": "gmail",
  "source_id": "19dfc8fd6f62ded6",
  "source_label": "Gmail daniel@luma-app.io",
  "observed_at": "2026-05-06T11:12:48+02:00",
  "collected_at": "2026-05-09T16:00:00+02:00",
  "account_key": "studio-pampa",
  "person_name": "Juliane Maier",
  "snippet": "Kundin hat auf Daniels Workshop-Mail geantwortet.",
  "confidence": "high",
  "fact_type": "inbound_reply",
  "pii_level": "low"
}
```

---

## 10. `Recommendation`

Eine Recommendation ist die zentrale Deal-Radar-Ausgabe.

### Felder

- `recommendation_id`
- `created_at`
- `updated_at`
- `account_key`
- `agent_role`: `deal_radar | pilot_health | reply_draft | account_dossier | activation_playbook | mc_data_steward`.
- `priority`: `P0 | P1 | P2 | P3`.
- `score`: optional 0–100.
- `status`: `open | delivered | accepted | dismissed | executed | superseded`.
- `why_now`: Liste von Signalen.
- `recommendation_type`: `reply | reminder | mc_update | stage_change | dossier | activation | crm_hygiene | zombie_job_review`.
- `recommended_action`: klare Aktion.
- `needs_daniel_ok`: Boolean.
- `allowed_autonomous_execution`: Boolean.
- `draft_id`: optional.
- `mc_write_plan_id`: optional.
- `evidence_refs`: Pflicht.
- `last_delivered_at`
- `cooldown_until`

### JSON-Beispiel

```json
{
  "recommendation_id": "rec_20260509_studio-pampa_reply_001",
  "created_at": "2026-05-09T16:00:00+02:00",
  "updated_at": "2026-05-09T16:00:00+02:00",
  "account_key": "studio-pampa",
  "agent_role": "reply_draft",
  "priority": "P1",
  "score": 78,
  "status": "open",
  "why_now": ["open_reply_thread", "stale_external_reply"],
  "recommendation_type": "reply",
  "recommended_action": "Daniel sollte Juliane mit konkretem nächsten Schritt antworten.",
  "needs_daniel_ok": true,
  "allowed_autonomous_execution": false,
  "draft_id": "draft_20260509_studio-pampa_001",
  "mc_write_plan_id": "mcw_20260509_studio-pampa_001",
  "evidence_refs": ["ev_20260509_mail_19dfc8fd6f62ded6"],
  "last_delivered_at": null,
  "cooldown_until": "2026-05-10T16:00:00+02:00"
}
```

---

## 11. `Draft`

Drafts werden zunächst nur als Telegram-/Markdown-Vorschlag erzeugt. Gmail-Draft oder Versand erst nach Daniel-Go.

### Ablage

Optional als Datei:

```text
~/.hermes/state/luma-agentic-sales-ops/drafts/draft_20260509_studio-pampa_001.md
```

### Felder im State

- `draft_id`
- `account_key`
- `thread_id`
- `recipient_hint`
- `subject`
- `body_markdown`
- `why_this_draft`
- `evidence_refs`
- `status`: `proposed | approved_to_send | sent | dismissed`
- `approved_at`
- `sent_at`
- `gmail_message_id`: erst nach Versand.

### Markdown-Struktur

```markdown
## Draft — Studio Pampa

**Betreff:** Re: Danke für den Workshop gestern

Hi Juliane,
...

**Warum dieser Draft:**
- Bezug auf Antwort vom 06.05.
- Ziel: nächsten konkreten Schritt klären.

**Quellen:**
- Gmail `19dfc8fd6f62ded6`
```

---

## 12. `MCWritePlan`

MCWritePlan beschreibt geplante oder ausgeführte Mission-Control-Änderungen.

### Felder

- `mc_write_plan_id`
- `account_key`
- `operation`: `create_activity | update_note | set_next_step | update_person | update_deal | stage_change`.
- `target_type`: `account | person | deal | activity | task`.
- `target_id`
- `payload_preview`: menschlich lesbarer Text, keine Secrets.
- `fact_vs_interpretation`: `fact | interpretation | mixed`.
- `evidence_refs`
- `requires_daniel_ok`: Boolean.
- `status`: `proposed | executed | rejected | failed`.
- `executed_at`
- `error`

### Guardrail

Wenn `fact_vs_interpretation != fact`, darf der Plan nicht als CRM-Fakt geschrieben werden. Er muss entweder als Empfehlung bleiben oder Daniel explizit fragen.

---

## 13. `SuppressionState`

Verhindert Reminder-Spam.

### Key-Struktur

`suppression_key = <account_key>:<signal_type>:<source_id_or_hash>`

### Felder

- `suppression_key`
- `account_key`
- `signal_type`
- `source_id`
- `first_seen_at`
- `last_seen_at`
- `last_delivered_at`
- `cooldown_until`
- `delivery_count`
- `status`: `active | expired | dismissed`
- `dismissed_reason`

### Regeln

- gleicher Account/gleiches Signal maximal 1x pro Tag.
- stale Commitment maximal alle 48h.
- Fehlerstatus immer pingen und nicht unterdrücken.

---

## 14. `RunLog`

Jeder Run erzeugt ein eigenes Logfile.

### Dateiname

```text
run-logs/<timestamp>-<run_type>.json
```

`run_type`: `monitor | daily | manual | dry_run | backfill`.

### Felder

- `run_id`
- `run_type`
- `started_at`
- `finished_at`
- `status`: `success | partial | error`.
- `sources_read`: Liste gelesener Quellen.
- `source_errors`: Fehler je Quelle.
- `input_snapshot_refs`: Referenzen auf Mail/MC/Usage/Tracker-Snapshots.
- `accounts_evaluated`
- `threads_evaluated`
- `recommendations_created`
- `recommendations_delivered`
- `recommendations_suppressed`
- `mc_writes_planned`
- `mc_writes_executed`
- `external_mails_sent`: muss ohne Daniel-Go `0` sein.
- `delivery_target`
- `delivered_message_ref`
- `state_path`
- `archive_actions`

### JSON-Beispiel

```json
{
  "run_id": "run_20260509T160000_monitor",
  "run_type": "monitor",
  "started_at": "2026-05-09T16:00:00+02:00",
  "finished_at": "2026-05-09T16:00:12+02:00",
  "status": "success",
  "sources_read": ["gmail", "mission_control", "usage", "tracker"],
  "source_errors": [],
  "input_snapshot_refs": ["gmail:thread:19dfc1cd079e8428", "mc:account:acc_1773571626030"],
  "accounts_evaluated": 5,
  "threads_evaluated": 35,
  "recommendations_created": 2,
  "recommendations_delivered": 2,
  "recommendations_suppressed": 4,
  "mc_writes_planned": 1,
  "mc_writes_executed": 0,
  "external_mails_sent": 0,
  "delivery_target": "telegram:sales-support-topic-23",
  "delivered_message_ref": null,
  "state_path": "~/.hermes/state/luma-agentic-sales-ops/sales-state.json",
  "archive_actions": []
}
```

---

## 15. `JobState`

Speichert Agenten-/Cron-Konfiguration und Health.

### Felder

- `job_key`: `deal_radar_monitor` oder `deal_radar_daily`.
- `schedule`: z.B. `*/10 * * * *` oder `0 18 * * *`.
- `delivery_target`
- `enabled`
- `last_run_at`
- `last_status`
- `last_error`
- `consecutive_errors`
- `zombie_suspected`: Boolean.
- `zombie_reason`: optional.

### Startwerte

- `deal_radar_monitor`: alle 10 Minuten.
- `deal_radar_daily`: täglich 18:00.

---

## 16. Ableitung bestehender Daten

### Aus `~/.hermes/luma_mail_state.json`

Direkte Übernahme/Migration:

- `threads.*.thread_id` → `ThreadState.thread_id`
- `account_name` → Mapping auf `account_key`
- `account_id` → `mc_account_id`
- `person_name` → `person_name`
- `subject` → `subject`
- `last_speaker` → `last_speaker`
- `last_message_id` → `last_message_id`
- `last_message_at` → `last_message_at`
- `last_external_message_id` → `last_external_message_id`
- `last_external_at` → `last_external_at`
- `last_daniel_message_id` → `last_daniel_message_id`
- `last_daniel_at` → `last_daniel_at`
- `open_reply_needed` → `open_reply_needed`
- `waiting_on_customer` → `waiting_on_customer`
- `commitment_open` → `commitment_open`
- `commitment_summary` → `Commitment.summary`, falls vorhanden.

### Aus `luma_sales_unified_sync_context.py`

Direkte Übernahme/Migration:

- Tracker Accounts → `AccountState`
- MC Snapshot → Account/People/Deal Referenzen
- Mail Context → Account Mail Timestamps
- Account Summaries → erste Recommendations / attention reasons

---

## 17. Archivierungsregel

Einträge älter als 90 Tage werden aus `sales-state.json` entfernt und als JSONL archiviert.

Archiv-Datei:

```text
~/.hermes/state/luma-agentic-sales-ops/archives/sales-state-archive-YYYY-QN.jsonl
```

Jede Archiv-Zeile enthält:

- `archived_at`
- `entity_type`
- `entity_id`
- `reason`
- `payload`

Keine Secrets. Keine vollen Mailtexte.

---

## 18. Minimaler Implementierungsstart

Für den ersten Build reichen diese Artefakte:

1. `sales-state.json` mit `scope`, `accounts`, `threads`, `last_runs`.
2. Migration aus `~/.hermes/luma_mail_state.json` in `threads`.
3. Account-Key-Mapping für die fünf Phase-1-Accounts.
4. Run-Log pro Monitor-Run.
5. Recommendation-Erzeugung mit Evidence-Pflicht.
6. Suppression-State für Cooldowns.

Nicht nötig im ersten Schritt:

- SQLite,
- neue MC-DB-Tabellen,
- LUMA-App-Änderungen,
- Voice-Digest,
- UI.

---

## 19. Akzeptanzkriterien für das Datenmodell

Das Modell ist ausreichend, wenn ein Implementierer damit:

- alle fünf Phase-1-Accounts eindeutig tracken kann,
- Mail-Deltas aus bestehendem State erkennt,
- Usage-Signale je Account speichern kann,
- Empfehlungen mit Evidence erzeugen kann,
- Drafts referenzieren kann,
- MC-Writes auditierbar planen/ausführen kann,
- Cooldowns ohne Reminder-Spam einhalten kann,
- jeden Run auditierbar loggt,
- 90-Tage-Archivierung umsetzen kann,
- keine LUMA-App-/Website-Änderung braucht.
