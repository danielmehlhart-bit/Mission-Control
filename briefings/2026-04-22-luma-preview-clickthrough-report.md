# LUMA Preview Click-Through Report

**Datum:** 2026-04-22  
**Umgebung:** Lovable Share Preview (`preview--mehlhart-ai.lovable.app`)  
**Scope:** Start mit `hermes-setup.md`, dann manueller Click-Through gegen die bereitgestellte Matrix `click-through-test-matrix.md`  
**Personas:**
- Admin: `daniel.mehlhart@googlemail.com`
- Architekt: `max@weber-architekten.de`

## Kurzfazit

- **Preview-Testing funktioniert grundsätzlich.** Die Lovable Share URL mit Token ist für Hermes im Browser nutzbar.
- **Admin-Board lädt und zeigt Seed-/Testdaten.**
- **Architekt-Board lädt und zeigt deutlich mehr Heute-Board-Fälle inklusive Seed-Daten.**
- **Mehrere Cases aus der Matrix sind jedoch im Preview-Datensatz inkonsistent oder zeigen auf nicht mehr verfügbare Tasks.**
- **Bucket-Collapse aus der Matrix ist aktuell nicht implementiert** (Bucket-Header sind Paragraphen, keine klickbaren Controls).
- **Mehrere Task-bezogene Notification-Aktionen beim Architekten werfen effektiv „Aufgabe nicht mehr verfügbar“.**

## Setup / Reality Check gegen `hermes-setup.md`

`hermes-setup.md` behauptet, Hermes könne Preview-URLs nicht nutzen und müsse gegen Publish/Production testen.

**Realität in diesem Run:**
- Die von Daniel gesendete **Lovable Share Preview URL mit Token funktioniert**.
- Login in die App innerhalb des Preview funktionierte für beide Personas.
- Damit ist Preview-QA für ungepublishte Änderungen **machbar**.

## Console / Runtime

Beobachtet:
- wiederholte Lovable `postMessage` Origin-Warnings
- wiederholte Accessibility-Warnung:
  - `Missing Description or aria-describedby for DialogContent`
- 1 JS error/exception:
  - `Transition was skipped`

Keine offensichtliche harte White-Screen-/Crash-Situation.

---

## Ergebnis-Matrix (getestete oder verifizierte Cases)

### A. Header / Layout

| ID | Ergebnis | Notiz |
|---|---|---|
| H1 | BLOCKED | Pille `Erledigt heute` im getesteten Preview nicht sichtbar |
| H2 | BLOCKED | Snoozed-Counter/Pille im Header im getesteten Preview nicht sichtbar |
| H3 | FAIL | Bucket `DRINGEND` nicht einklappbar; Header ist `<p>`, kein Control |
| H4 | FAIL | Bucket `HEUTE` nicht einklappbar; Header ist `<p>`, kein Control |
| H5 | FAIL | Bucket `WEITERE` nicht einklappbar; Header ist `<p>`, kein Control |

### B. Approval-Flow

| ID | Ergebnis | Notiz |
|---|---|---|
| AP1 | BLOCKED | Admin-Datensatz zeigt in diesem Run keinen sauberen `approval_request`-Case |
| AP2 | BLOCKED | kein passender Admin-Approval-Request im Daniel-Account sichtbar |
| AP3 | BLOCKED | kein passender Admin-Approval-Request im Daniel-Account sichtbar |
| AP4 | FAIL | Architekt-Case „Abgelehnt“ vorhanden, aber Öffnen/Weiterbearbeiten läuft in `Aufgabe nicht mehr verfügbar` |
| AP5 | FAIL | Klick auf `Überarbeiten` ergibt Toast/Fehler `Aufgabe nicht mehr verfügbar` statt Editor-/Task-Flow |
| AP6 | BLOCKED | kein `Freigegeben`-Echo im getesteten Architekt-Datensatz sichtbar |

### C. Assignment

| ID | Ergebnis | Notiz |
|---|---|---|
| AS1 | PASS (mit Abweichung) | Assignment-Cards vorhanden; Klick auf Card/Status ist grundsätzlich möglich, aber CTA-Label ist `In Bearbeitung` statt erwartetem `Übernehmen` |
| AS2 | FAIL / Abweichung | Assignment-Aktion mutiert den State, aber nicht wie Matrix spezifiziert: statt `Übernehmen` + Toast/Quittung wird Item in einen `Heute fällig`-Task umsortiert; beobachtetes Verhalten inkonsistent zur Spezifikation |
| AS3 | BLOCKED | Self-assignment nicht gezielt erzeugt |
| AS4 | BLOCKED | keine sichtbare Quittung `assignment_accepted` im Admin-Datensatz |

### D. Mention / Comment / Reply

| ID | Ergebnis | Notiz |
|---|---|---|
| MC1 | PASS (Admin) | Erwähnungs-Card öffnet `TaskDetailDialog`, Tab `Kommentare`, Mention sichtbar |
| MC2 | PASS (Admin) | `Antworten` auf Erwähnung öffnet den Dialog mit Kommentar-Editor-Fokus |
| MC3 | BLOCKED/FAIL | Kommentar-Case bei Max sichtbar, aber wegen inkonsistenter Task-Zielobjekte nicht sauber weiter getestet |
| MC4 | BLOCKED/FAIL | s.o. |
| MC5 | BLOCKED/FAIL | Reply-Case sichtbar, aber nicht verlässlich ausführbar |
| MC6 | BLOCKED/FAIL | s.o. |

### E. Overdue / Due-Today

| ID | Ergebnis | Notiz |
|---|---|---|
| OD1 | PASS (Architekt) | Overdue-Task `M10: Überfällige Werkstattzeichnung · SEED-ARCH-TEST` öffnet `TaskDetailDialog` auf Tab `Details` |
| OD2 | BLOCKED | Admin hatte in diesem Run keinen klar passenden Overdue-Task |
| OD3 | BLOCKED | Architekt-CTA für Overdue-Task ist im Preview `Erledigen`, nicht `Zur Freigabe` |
| OD4 | PASS (Architekt) | Today-due-Task für `M11 ... Brandschutzgutachten` sichtbar und klickbar |
| OD5 | BLOCKED | Admin-Datensatz ohne passenden Due-Today-Task |
| OD6 | FAIL / Abweichung | Architekt-CTA ist `Erledigen`, nicht `Zur Freigabe` |

### F. Inbox / Email

| ID | Ergebnis | Notiz |
|---|---|---|
| IB1 | PASS (Admin) | Inbox-Item aus Heute-Board öffnet `EmailDetailDialog` |
| IB2 | PASS (Admin) | `In Inbox öffnen` navigiert korrekt nach `/inbox` |
| IB3 | PASS (Admin) | `Aufgabe daraus` öffnet `Task aus E-Mail erstellen` mit vorbefüllten Feldern |
| IB4 | PASS (Admin) | Direkt-Task-Erstellung in Inbox grundsätzlich vorhanden und funktionsfähig |

### G. Snooze

| ID | Ergebnis | Notiz |
|---|---|---|
| SN1 | PASS | Snooze-Popover zeigt Optionen wie `Bis morgen 09:00`, `Bis übermorgen`, `Bis nächste Woche` |
| SN2 | PASS | Snooze auf Overdue-Item reduziert Heute-Board-Zähler (`16 -> 15`) und entfernt das Item aus der sichtbaren Queue |
| SN3 | BLOCKED | `Rückgängig`-Toast im Test nicht sicher greifbar/verifizierbar |

### H. Empty-State / Footer

| ID | Ergebnis | Notiz |
|---|---|---|
| EM1 | BLOCKED | Board war nicht leer |
| FT1 | PASS | Footer-Link `Büro · Projekte` navigiert korrekt nach `/projekte` |
| FT2 | BLOCKED | `Büro · Aktivität` wurde textuell bestätigt, aber im finalen Run nicht mehr separat ausgeführt |

---

## Wichtige Beobachtungen / Bugs

### 1. Bucket Collapse laut Matrix fehlt
Die Matrix erwartet klickbare Bucket-Header.
Im DOM sind `DRINGEND · N`, `HEUTE · N`, `WEITERE OFFENE PUNKTE · N` jedoch als **Paragraphen** gerendert, nicht als Buttons oder Accordion-Controls.

**Impact:** H3–H5 aktuell nicht testbar im Sinne der Spezifikation.

### 2. Architekt-Approval-/Notification-Ziele teilweise kaputt
Mehrere Architekt-Cases (vor allem Review/Rejected/Mention-nahe Flows) liefern effektiv:
- `Aufgabe nicht mehr verfügbar`

Das deutet auf eins der folgenden Probleme hin:
- Seed verweist auf gelöschte / nicht mehr zugängliche Tasks
- falsche Task-IDs in Notifications
- RLS/Access-Issue
- Preview-Datenzustand nicht konsistent zum Matrix-Seed

### 3. Matrix vs. echte UI divergieren
Mehrfach stimmen die erwarteten CTA-Labels nicht mit der Preview überein:
- erwartet: `Übernehmen`
- gesehen: `In Bearbeitung`

- erwartet: `Zur Freigabe`
- gesehen: `Erledigen`

Das kann heißen:
- Matrix veraltet
- UI geändert, Matrix nicht nachgezogen
- Seed-/Statuslogik anders als gedacht

### 4. Dialog Accessibility Warnings
Wiederholt:
- `Missing Description or aria-describedby for DialogContent`

Kein Blocker für Funktion, aber klares QA-/A11y-Thema.

---

## Empfehlung für den nächsten Run

1. **Matrix und Preview-Implementierung synchronisieren**
   - CTA-Labels prüfen (`Übernehmen` vs `In Bearbeitung`, `Zur Freigabe` vs `Erledigen`)
   - Bucket-Collapse entweder implementieren oder aus Matrix streichen

2. **Seed-Daten fixen / neu ausrollen**
   - alle Notification-Tasks müssen existieren und zugreifbar sein
   - besonders für Architekt: Approval-Decision, Mention, Comment, Reply

3. **Test-IDs ergänzen**
   - Heute-Cards
   - Bucket-Header
   - Action-Pills
   - Snooze-Popover

4. **Nächster Run nach Seed-Refresh**
   - dann kann die Matrix deutlich vollständiger mit PASS/FAIL statt BLOCKED bewertet werden

## Praktisches Zwischenfazit

**Ja: Preview-Testing via Lovable Share-Link funktioniert.**  
**Nein: Die bereitgestellte Matrix ist im aktuellen Preview-Datenzustand noch nicht sauber voll abdeckbar.**  
**Die größten echten Probleme im Run sind inkonsistente Task-/Notification-Targets und fehlende Bucket-Collapse-Controls.**
