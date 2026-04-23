# LUMA Preview Click-Through Rerun — vormals BLOCKED Cases

**Datum:** 2026-04-22  
**Umgebung:** Lovable Share Preview (`preview--mehlhart-ai.lovable.app`)  
**Aktion:** Hard refresh + Retest nach Seed-Update  
**Personas:**
- Admin: `daniel.mehlhart@googlemail.com`
- Architekt: `max@weber-architekten.de`

## Kurzfazit

Der Seed-Refresh hat geholfen. Ein Teil der vorher BLOCKED Cases ist jetzt testbar.

**Verbessert:**
- Architekt hat jetzt einen sauberen `Freigabe abgelehnt: ... SEED-CTT`-Case
- Architekt hat jetzt einen sichtbaren `Freigegeben`-Case
- Admin hat jetzt zusätzliche Today-/Overdue-Seed-Tasks (`M12`, `M13`, `Familie Schmitt [SEED-CTT]`)

**Weiterhin offen/problematisch:**
- Header-Cases `Erledigt heute` / `Snoozed` sind im UI weiter nicht sichtbar
- Admin hat weiterhin **keinen** sauberen `approval_request`-Case im Daniel-Account
- Mention/Comment/Reply-Cards beim Architekt sind sichtbar, reagieren aber weiterhin nicht korrekt auf Card-Open
- `Freigegeben -> Ansehen` ist sichtbar, reagiert aber nicht

---

## Retest-Ergebnisse

### Header / Layout

| ID | Alt | Neu | Notiz |
|---|---|---|---|
| H1 | BLOCKED | BLOCKED | `Erledigt heute` weiter nicht sichtbar |
| H2 | BLOCKED | BLOCKED | `Snoozed (N)` weiter nicht sichtbar |

### Admin-seitige Approval / Assignment Follow-up

| ID | Alt | Neu | Notiz |
|---|---|---|---|
| AP1 | BLOCKED | BLOCKED | Im Daniel-Account weiterhin kein passender `Freigabe angefragt`-Card-Case sichtbar |
| AP2 | BLOCKED | BLOCKED | kein sauberer Admin-Approval-Request vorhanden |
| AP3 | BLOCKED | BLOCKED | kein sauberer Admin-Approval-Request vorhanden |
| AS4 | BLOCKED | BLOCKED | keine sichtbare `assignment_accepted`-Quittung im Daniel-Account |

### Architekt Approval Flow

| ID | Alt | Neu | Notiz |
|---|---|---|---|
| AP4 | FAIL | PASS | `Abgelehnt: ... SEED-CTT` öffnet jetzt korrekt den Task-Dialog |
| AP5 | FAIL | PASS mit Abweichung | `Überarbeiten` öffnet jetzt den Task-Dialog; **aber** nicht direkt mit Kommentar-/Editor-Fokus, sondern auf `Details` |
| AP6 | BLOCKED | FAIL | `Freigabe erteilt: M3: Bauantrag prüfen` ist jetzt sichtbar, aber `Ansehen` reagiert im Test nicht (kein Dialog, keine Navigation) |

### Mention / Comment / Reply

| ID | Alt | Neu | Notiz |
|---|---|---|---|
| MC3 | BLOCKED/FAIL | FAIL | `Neuer Kommentar zu: M8 ...` sichtbar, Card-Open reagiert nicht |
| MC4 | BLOCKED/FAIL | FAIL | kein funktionierender Quick-Reply-/Open-Flow belegbar |
| MC5 | BLOCKED/FAIL | FAIL | `Antwort auf deinen Kommentar: M9 ...` sichtbar, Card-Open reagiert nicht |
| MC6 | BLOCKED/FAIL | FAIL | kein funktionierender Reply-Action-Flow belegbar |

### Zusatzbeobachtung

| Case | Status | Notiz |
|---|---|---|
| Mention-Card (`Du wurdest erwähnt: M7 ...`) | FAIL | sichtbar, aber Card-Open reagiert nicht |
| Freigegeben-Card (`Freigabe erteilt: M3 ...`) | FAIL | sichtbar, aber `Ansehen` reagiert nicht |

---

## Was sich konkret verbessert hat

1. **Seed-Qualität beim Architekt ist besser**
   - der neue `Freigabe abgelehnt ... SEED-CTT`-Case ist testbar
   - dadurch konnte AP4/AP5 erneut geprüft werden

2. **Architekt hat jetzt explizit mehr Notification-Typen sichtbar**
   - Mention
   - Kommentar
   - Antwort
   - Freigegeben

3. **Admin hat jetzt zusätzliche Today-Seed-Fälle sichtbar**
   - `M12: Statiker-Antwort einarbeiten · SEED-CTT`
   - `M13: Statusbericht versenden · SEED-CTT`
   - Inbox-Mail `Familie Schmitt [SEED-CTT] ...`

---

## Weiterhin auffällige Probleme

### 1. Notification-Cards reagieren inkonsistent
Insbesondere beim Architekt:
- Mention
- Kommentar
- Antwort
- Freigegeben

Diese Items sind **sichtbar**, aber Card-Klick bzw. `Ansehen` erzeugt im Test keinen Dialog und keine Navigation.

### 2. Approval-Reject-Flow ist nur teilweise sauber
`Überarbeiten` funktioniert jetzt wieder, aber nicht exakt wie spezifiziert:
- erwartet: editor-/überarbeitungsfokussierter Flow
- gesehen: normaler Task-Dialog auf `Details`

### 3. Admin-Datensatz deckt Approval-Admin-Fälle noch nicht ab
Für Daniel fehlt weiterhin ein sauberer Case für:
- `Freigabe angefragt`
- `Freigeben`
- `Ablehnen`
- `assignment_accepted`

---

## Stand nach Rerun

### Von BLOCKED -> jetzt testbar / bewertet
- AP4
- AP5
- AP6
- Mention/Comment/Reply/Freigegeben-Sichtbarkeit beim Architekt

### Noch immer wirklich BLOCKED
- H1
- H2
- AP1
- AP2
- AP3
- AS4

## Empfehlung für den nächsten Schritt

1. **Admin-Seed ergänzen**
   - explizit `approval_request` an Daniel
   - explizit `assignment_accepted` an Daniel

2. **Notification target handling fixen**
   - Mention
   - Kommentar
   - Antwort
   - Freigegeben / `Ansehen`

3. **Dann dritter fokussierter Retest nur auf:**
   - AP1–AP3
   - AS4
   - MC3–MC6
   - AP6

## Fazit in einem Satz

**Der Seed-Refresh hat das Bild verbessert und mehrere vorher blockierte Architekt-Fälle freigelegt, aber die Notification-Interaktionen im Heute-Board sind noch nicht stabil genug für einen nahezu vollständigen PASS-Lauf.**
