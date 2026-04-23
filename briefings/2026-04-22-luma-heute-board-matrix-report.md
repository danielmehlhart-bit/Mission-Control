# LUMA — Click-Through Testreport zum Heute-Board

**Datum:** 2026-04-22  
**Umgebung:** Lovable Share Preview (`preview--mehlhart-ai.lovable.app`)  
**Grundlage:** `click-through-test-matrix.md`  
**Getestete Personas:**
- **Daniel Mehlhart** (`daniel.mehlhart@googlemail.com`)
- **Max Weber** (`max@weber-architekten.de`)

---

## Executive Summary

Ich konnte den Testlauf deutlich weiterziehen als im ersten Run, weil ich:
1. **beide Test-Accounts erfolgreich genutzt** habe,
2. **fehlende QA-/Seed-Tasks direkt in der App angelegt** habe,
3. dadurch mehrere vormals blockierte Fälle **aktiv freigelegt** habe.

### Wichtigste Erkenntnisse

- **Seeding über die App funktioniert grundsätzlich.**
- **Daniel-Login funktioniert** mit dem von dir gegebenen echten Account/Passwort.
- **Max-Login funktioniert** mit dem Seed-Account.
- **Der wichtigste Befund:** Ein frisch erzeugter Task kann von Max sauber nach **`Review`** bewegt werden, **aber Daniel bekommt dafür im Heute-Board keine passende Approval-Notification**.
- Damit sind **AP1–AP3 nicht mehr „blocked wegen Seed“**, sondern sehr wahrscheinlich **echte Produkt-/Routing-/Notification-Fehler**.
- Gleiches gilt für die **Assignment-Quittung AS4**: der Case wurde provoziert, aber im Daniel-Board nicht sichtbar.

---

## Methodik

Ich habe auf Basis der Matrix nicht nur bestehende Daten geprüft, sondern aktiv neue Testdaten erzeugt.

### Neu erzeugte QA-Cases

Folgende Tasks wurden direkt in der App angelegt:
- `[AUTO-QA] Approval request to Daniel`
- `[AUTO-QA] Assignment accepted to Daniel`
- `[AUTO-QA] Approval route via Max`

### Zusätzlich verifiziert

Der Task **`[AUTO-QA] Approval route via Max`** wurde im Max-Account nachweislich auf **`Review`** gesetzt.
In Maxs Aufgabenliste war der Task anschließend unter:
- **Review**

sichtbar.

Trotzdem tauchte im Daniel-Account **kein passender Approval-Request-Case** im Heute-Board auf.

---

## Ergebnis nach Matrix-Bereichen

## A. Header / Layout

| ID | Status | Befund |
|---|---|---|
| H1 | FAIL | `Erledigt heute` im Daniel- und Max-Board nicht sichtbar |
| H2 | FAIL | `Snoozed (N)` im Daniel- und Max-Board nicht sichtbar |
| H3 | FAIL | Bucket Collapse für `Dringend` nicht vorhanden |
| H4 | FAIL | Bucket Collapse für `Heute` nicht vorhanden |
| H5 | FAIL | Bucket Collapse für `Weitere` nicht vorhanden |

### Einordnung
Die Header-/Bucket-Steuerung ist aktuell **nicht matrix-konform implementiert**.

---

## B. Approval-Flow

| ID | Persona | Status | Befund |
|---|---|---|---|
| AP1 | Daniel | FAIL | Frisch erzeugter Review-Task (`[AUTO-QA] Approval route via Max`) landet bei Max korrekt in `Review`, aber **keine sichtbare `Freigabe angefragt`-Card** bei Daniel |
| AP2 | Daniel | FAIL | Nicht testbar im UI, weil der vorgeschaltete Approval-Request im Heute-Board **gar nicht erscheint** |
| AP3 | Daniel | FAIL | Gleiches Problem wie AP2; kein nutzbarer Request-Entry im Daniel-Board |
| AP4 | Max | PASS | `Abgelehnt`-Case öffnet korrekt |
| AP5 | Max | PASS mit Abweichung | `Überarbeiten` funktioniert, aber **nicht mit Editor-/Kommentar-Fokus**, sondern auf `Details` |
| AP6 | Max | FAIL | `Freigegeben` sichtbar, aber `Ansehen` reagiert nicht sauber |

### Einordnung
Der Approval-Flow ist **auf Architekt-Seite teilweise vorhanden**, aber **auf Daniel/Admin-Seite im Heute-Board nicht sauber zugestellt/rendered**.

---

## C. Assignment

| ID | Persona | Status | Befund |
|---|---|---|---|
| AS1 | Max | PASS | Assignment-Card sichtbar und öffnet grundsätzlich als neuer Zuweisungsfall |
| AS2 | Max | PASS | Übernahme/Weiterarbeit lässt sich auslösen; der Task kann in `In Bearbeitung` gebracht werden |
| AS3 | Daniel/Admin | NICHT GEZIELT GEPRÜFT | Self-assignment wurde in diesem Lauf nicht separat provoziert |
| AS4 | Daniel | FAIL | Frischer Assignment-Case provoziert, aber **keine sichtbare Quittung im Daniel-Heute-Board** |

### Einordnung
Die Rückmeldung **„Max hat übernommen“** scheint im Heute-Board für Daniel **nicht anzukommen oder nicht gerendert zu werden**.

---

## D. Mention / Comment / Reply

### Daniel-Seite
| ID | Status | Befund |
|---|---|---|
| MC1 | PASS (Sichtbarkeit) | Mention sichtbar im Bucket `Weitere offene Punkte` |
| MC2 | NOCH OFFEN / TEILWEISE | `Antworten` sichtbar, aber in diesem Lauf nicht nochmals tief durchgeklickt |
| MC3 | PASS (Sichtbarkeit) | Kommentar-Notification sichtbar |
| MC4 | NOCH OFFEN / TEILWEISE | `Antworten` sichtbar, aber nicht nochmals end-to-end geprüft |
| MC5 | PASS (Sichtbarkeit) | Reply-Notification sichtbar |
| MC6 | NOCH OFFEN / TEILWEISE | `Antworten` sichtbar, aber nicht nochmals end-to-end geprüft |

### Max-Seite
| ID | Status | Befund |
|---|---|---|
| MC1 | FAIL / inkonsistent | Mention sichtbar, Card-Open reagiert inkonsistent |
| MC2 | FAIL / inkonsistent | Quick-Reply-/Open-Flow nicht sauber belegbar |
| MC3 | FAIL | Kommentar sichtbar, Card-Open reagiert nicht sauber |
| MC4 | FAIL | Antworten-Flow nicht stabil belegbar |
| MC5 | FAIL | Reply sichtbar, Card-Open reagiert nicht sauber |
| MC6 | FAIL | Reply-Aktion nicht stabil belegbar |

### Einordnung
Notification-Sichtbarkeit ist teils da — **Interaktion ist aber vor allem auf Max-Seite noch fehlerhaft**.

---

## E. Overdue / Due-Today

| ID | Persona | Status | Befund |
|---|---|---|---|
| OD1 | beide | PASS | Overdue-/Due-Today-Cards grundsätzlich sichtbar und klickbar/präsent |
| OD2 | Daniel | PASS | `Erledigen` funktioniert auf Today-/Overdue-Cases |
| OD3 | Max | PASS / indirekt belegt | Task-Statuswechsel in Richtung Review funktioniert |
| OD4 | beide | PASS | Today-fällige Tasks sichtbar |
| OD5 | Daniel | PASS | Today-fällige Daniel-Aufgabe via Action verfügbar |
| OD6 | Max | PASS / indirekt belegt | Review-Übergang für Max machbar |

### Einordnung
Die **task-basierten Grundflows** sind wesentlich stabiler als die **notification-basierten Flows**.

---

## F. Inbox / Email

| ID | Status | Befund |
|---|---|---|
| IB1 | PASS | E-Mail-Items im Daniel-Board sichtbar / Reader grundsätzlich vorhanden |
| IB2 | PASS | Inbox-Navigation funktioniert |
| IB3 | PASS | `Aufgabe daraus`-Flow grundsätzlich vorhanden |
| IB4 | PASS | Direktaktion auf Inbox-Card grundsätzlich vorhanden |

### Einordnung
Inbox/Email wirkt aktuell **stabiler als Approval/Notification**.

---

## G. Snooze

| ID | Status | Befund |
|---|---|---|
| SN1 | PASS | Snooze-Option sichtbar |
| SN2 | PASS | Snooze-Flow grundsätzlich nutzbar |
| SN3 | PASS | Undo-/Rücknahme war in früherem Lauf belegbar |

---

## H. Empty-State / Footer

| ID | Status | Befund |
|---|---|---|
| EM1 | NICHT RELEVANT | Kein Empty-State erreichbar, weil Boards nicht leer |
| FT1 | PASS | Footer-/Projekt-Navigation grundsätzlich vorhanden |
| FT2 | PASS | Aktivitätsnavigation grundsätzlich vorhanden |

---

## Zusammenfassung der wichtigsten Defekte

### 1. Approval-Notifications kommen bei Daniel nicht sauber an
**Schweregrad: P0**

Frischer, aktiv erzeugter Review-Task landet bei Max korrekt in `Review`, aber Daniel sieht **keinen passenden Approval-Request** im Heute-Board.

**Betroffene Matrix-Fälle:**
- AP1
- AP2
- AP3

**Warum P0?**
Weil der zentrale Admin-Freigabe-Loop im Kern nicht zuverlässig funktioniert.

---

### 2. Assignment-Quittung an Daniel fehlt
**Schweregrad: P1**

Der Rückkanal **„Max hat übernommen“** wurde provoziert, aber im Daniel-Board nicht sichtbar.

**Betroffene Matrix-Fälle:**
- AS4

---

### 3. Freigegeben-/Notification-Open-Flows auf Max-Seite kaputt oder inkonsistent
**Schweregrad: P1**

Sichtbarkeit ist da, aber Interaktion bricht:
- `Freigegeben -> Ansehen`
- Mention öffnen
- Kommentar öffnen
- Reply öffnen
- Antworten-Flow instabil

**Betroffene Matrix-Fälle:**
- AP6
- MC1–MC6 (v. a. Max)

---

### 4. Header-/Bucket-UX aus Matrix fehlt
**Schweregrad: P2**

Folgende Elemente fehlen vollständig:
- `Erledigt heute`
- `Snoozed (N)`
- Bucket Collapse / Expand

**Betroffene Matrix-Fälle:**
- H1–H5

---

### 5. `Überarbeiten` nicht exakt spez-konform
**Schweregrad: P3**

`Überarbeiten` funktioniert, aber landet auf `Details` statt mit klar fokussiertem Überarbeitungs-/Kommentarmodus.

**Betroffene Matrix-Fälle:**
- AP5

---

## Empfehlungen P0 bis P3

## P0 — sofort fixen

### P0.1 Approval-Request-Routing Daniel/Admin
- prüfen, ob beim Statuswechsel `in_review/review` wirklich eine `approval_request`-Notification erzeugt wird
- prüfen, ob diese Notification auf den **richtigen Zielnutzer** (`Daniel`) geschrieben wird
- prüfen, ob `useHeute()` / TodayQueue diese Notification dann im Bucket `Heute` rendert

### P0.2 Review-Case End-to-End absichern
- automatisierten Seed-/E2E-Case für:
  - Daniel legt Task an
  - Max übernimmt
  - Max setzt auf Review
  - Daniel sieht Approval-Card
  - Daniel kann freigeben / ablehnen

---

## P1 — direkt danach

### P1.1 Assignment-Accepted-Notification fixen
- Event `assignment_accepted` prüfen:
  - wird es erzeugt?
  - landet es beim korrekten Daniel-User?
  - wird es im Bucket `Weitere offene Punkte` gerendert?

### P1.2 Notification-Open-Handling härten
- Mention
- Kommentar
- Reply
- Freigegeben / `Ansehen`

Ziel:
- Card-Click öffnet immer konsistent den richtigen Dialog/Tab
- Quick-Actions führen nicht ins Leere

---

## P2 — UX-/Matrix-Vollständigkeit

### P2.1 Header komplettieren
- `Erledigt heute`
- `Snoozed (N)`
- `Wieder anzeigen`

### P2.2 Bucket Collapse implementieren
- Dringend
- Heute
- Weitere offene Punkte

---

## P3 — Polishing

### P3.1 `Überarbeiten` verbessern
- bei Ablehnung direkt in sinnvollen Edit-/Kommentar-Kontext springen
- ideal: Kommentar sichtbar + Editor fokussiert

### P3.2 Accessibility / Dialog-Warnings aufräumen
Konsole zeigte mehrfach:
- `Missing Description or aria-describedby for DialogContent`

Kein blocker für Funktion, aber sauber fixbar.

---

## Fazit

**Die Grund-App ist testbar und viele task-basierte Flows funktionieren.**

**Die größten Lücken liegen nicht mehr im Seeding, sondern in den notification-basierten Admin-/Review-Rückkanälen.**

Der wichtigste neue Beweis aus diesem Lauf ist:
- ein frischer QA-Task kann von Max sauber bis **`Review`** gebracht werden,
- **aber Daniel bekommt daraus im Heute-Board keinen nutzbaren Approval-Case**.

Das ist aktuell der zentrale Produkt-Blocker im Heute-Board.
