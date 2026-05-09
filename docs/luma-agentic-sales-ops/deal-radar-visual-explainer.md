# LUMA Deal-Radar — Visualisierte Erklärung

Stand: 2026-05-09

## Kurzbild

```text
Gmail / Mail-State      Mission Control        Usage Snapshot
       │                      │                     │
       └──────────────┬───────┴──────────────┬──────┘
                      ▼                      ▼
              luma_deal_radar.py      sales-state.json
                      │                      │
                      ▼                      ▼
          Trigger & Guardrails        Evidence-Graph
                      │
        ┌─────────────┴──────────────┐
        ▼                            ▼
  10-Min Monitor              18:00 Daily Digest
  nur neue Deltas             immer mit HTML
  Sales Support               Sales Support + HTML
```

## Was wurde gebaut?

- **Core Engine:** `/home/hartner/.hermes/scripts/luma_deal_radar.py`
- **10-Minuten Monitor:** `/home/hartner/.hermes/scripts/luma_deal_radar_monitor.py`
- **Daily Digest:** `/home/hartner/.hermes/scripts/luma_deal_radar_daily.py`
- **State Cache:** `/home/hartner/.hermes/state/luma-agentic-sales-ops/sales-state.json`
- **Run Logs:** `/home/hartner/.hermes/state/luma-agentic-sales-ops/run-logs/`
- **HTML Visualisierung:** `/home/hartner/mission-control/briefings/2026-05-09-luma-deal-radar-daily.html`
- **Tests:** `/home/hartner/.hermes/tests/test_luma_deal_radar.py`

Wichtig: Es ist ein **Daniel-internes Hermes/Mission-Control-System**, kein LUMA-App-Feature und kein Code im LUMA-App-Repo.

## Triggerlogik

### 1. Reply Trigger

```text
Wenn Gmail/Mail-State sagt:
- externer Kunde hat zuletzt geschrieben
- open_reply_needed = true
- Thread ist kein System-/Kalender-/Billing-Noise

Dann:
- Empfehlung Typ `reply`
- Antwortentwurf als Draft im State
- Versand nur nach Daniel-OK
```

### 2. Commitment Trigger

```text
Wenn Daniel in einem Thread ein offenes Commitment hat:
- commitment_open = true
- oder commitment_summary vorhanden

Dann:
- Empfehlung Typ `reminder`
- nach ca. 2 Tagen als stale stärker priorisiert
- keine Kundenmail automatisch
```

### 3. Pilot-Health / Activation Trigger

```text
Wenn Usage Snapshot zeigt:
- 0 Logins und 0 aktive Nutzer → `stalled`, P1
- Nutzung vorhanden, aber keine klaren Aktivierungsereignisse → `at_risk`, P2
- aktive Nutzung mit Tasks/Projekten/Bautagebuch → healthy

Dann:
- Empfehlung Typ `activation`
- Daniel bekommt konkreten Interventionshinweis
```

### 4. Error Trigger

```text
Wenn eine Quelle kaputt ist:
- Gmail Collector Error
- Unified Context Error
- Usage Error

Dann:
- P0 System-Meldung
- wird nie durch Cooldown unterdrückt
```

### 5. Noise Filter

```text
Wird blockiert:
- Google Workspace / Security / noreply
- Kalender-Einladungen und Updates
- Billing / Rechnung / Gründung / Notar-Systemmails
- Delivery Status Notifications

Ziel:
Keine falschen Reply-Drafts aus Kalender-/Systemmails.
```

## Guardrails

- Keine externe Mail ohne Daniels explizites OK.
- Keine spekulativen MC-Stagewechsel.
- Jede Empfehlung braucht Evidence, außer technische P0-Fehler.
- 10-Minuten-Monitor bleibt still, wenn es keine neuen Deltas gibt.
- Daily 18:00 läuft immer als Digest + HTML.
- Einträge älter als 90 Tage werden archiviert.

## State-Modell

```text
sales-state.json
├── accounts
│   ├── weber
│   ├── hamm
│   ├── pe-stab
│   ├── studio-pampa
│   └── a-z
├── threads
├── commitments
├── evidence
├── recommendations
├── drafts
├── mc_write_plans
├── suppression
└── last_runs
```

## Tests & künstliche Trigger

Getestet mit `unittest`:

- Account-Normalisierung: Studio Pampa, Weber, HAMM/HUM, PE Stab, A-Z.
- State-Building: Accounts, Threads, Usage, Evidence.
- Reply Trigger: externer Thread erzeugt Reply-Empfehlung + Draft.
- Activation Trigger: 0 Logins erzeugt P1 Activation.
- Commitment Trigger: offenes/stales Commitment erzeugt Reminder.
- Suppression: gleiche Signale werden nicht alle 10 Minuten gespammt.
- Error Override: Fehler werden trotz Suppression gemeldet.
- Noise Filter: Kalender/Systemmails erzeugen keine Reply-Drafts.
- Guardrail: externer Mailversand wirft ohne Daniel-OK einen Fehler.
- Archivierung: >90 Tage alte Entitäten wandern ins Archiv.
- Dry-run Integration: schreibt State, Runlog und HTML ohne Secrets.

Aktueller Testlauf: **10/10 Tests OK**.

## Aktueller Dry-run Befund

Der Live-Dry-run hat aktuell vor allem **Pilot-Health-Signale** produziert:

- **PE Stab:** P1 Activation, weil keine Logins/keine aktiven Nutzer im Seed/Usage Snapshot.
- **Studio Pampa:** P1 Activation, weil keine Logins/keine aktiven Nutzer im Seed/Usage Snapshot.

Reply-Drafts aus Kalender-/Systemmails wurden nach dem Noise-Filter nicht mehr ausgelöst.

## Was kommt als Output?

### 10-Min Monitor

Nur bei neuem Signal oder Fehler:

```text
🚦 LUMA Deal-Radar — <Zeitpunkt>

P1 · Studio Pampa
Warum jetzt: open_reply_thread
Aktion: Antwortentwurf vorbereiten und Daniel zur Freigabe geben.
Evidence: ev_gmail_...

Guardrails: keine externe Mail ohne Daniels OK ...
```

### Daily 18:00

Immer:

```text
📊 LUMA Daily Deal-Radar — <Zeitpunkt>
- wichtigste Empfehlungen
- warum jetzt
- Evidence IDs
- ggf. Drafts
- HTML als MEDIA-Anhang
```

## Nächste Ausbaustufe

- Supabase Usage Collector statt Seed/Usage Snapshot automatisieren.
- MC Write-Plans wirklich gegen MC API ausführen, aber nur für harte Fakten.
- HTML um Trendlinien erweitern, sobald Usage-Historie länger ist.
- Reply-Drafts stärker account-spezifisch machen, sobald pro Account mehr Tonalität/Use-Case-Daten vorliegen.
