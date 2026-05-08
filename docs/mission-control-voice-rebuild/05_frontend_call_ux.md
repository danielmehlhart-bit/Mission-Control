# Mission Control Voice Rebuild — 05 Frontend Call UX

**Status:** Draft zur Durchsicht  
**Quelle:** `01-big-picture-vision.md`, `02-extraction.md`, `03-open-questions.md`, `03_business_logic.md`, `04_state_machine.md`  
**Zweck:** Mobile-first Call UX für Mission Control Voice V1 definieren.

---

## 1. UX Goal

Mission Control Voice V1 soll sich auf dem Handy wie ein echter Hermes-Call anfühlen: Daniel startet einen profilgebundenen Call, spricht hands-free, Hermes hört und antwortet automatisch, kann Kontext oder Research nachziehen und erzeugt nach dem Call einen sauberen Handoff.

Das UX-Ziel ist nicht, möglichst viele technische Zustände sichtbar zu machen. Das Ziel ist ein ruhiger, vertrauenswürdiger Call Screen mit wenigen klaren Aktionen und eindeutiger Rückmeldung.

---

## 2. UX Principles

1. **Call first, Console last.**  
   Die UI darf nicht wie ein Chat- oder Debug-Tool wirken.

2. **Mobile-first.**  
   Alle primären Aktionen müssen einhändig erreichbar und auf kleinem Screen klar sein.

3. **Wenige sichtbare Aktionen.**  
   Maximal 4–5 Hauptaktionen im laufenden Call.

4. **Status statt Logs.**  
   Daniel braucht klare Call-Zustände, aber kein dominantes Live Transcript.

5. **Voice bleibt Hauptinteraktion.**  
   Text-Fallback existiert, darf aber nicht visuell konkurrieren.

6. **Barge-in ist natürlich.**  
   Wenn Daniel reinredet, soll sich die UI sofort so verhalten, als würde Hermes zuhören.

7. **Transparenz ohne technische Überladung.**  
   Retrieval, Research und Fehler werden kurz und verständlich angezeigt.

---

## 3. Information Architecture

V1 besteht aus drei UX-Ebenen:

| Ebene | Zweck | Sichtbarkeit |
|---|---|---|
| Call Entry | Profil wählen und Call starten | vor Call |
| Main Call Screen | Gespräch führen | während Call dominant |
| Handoff / Summary | Call abschließen und weiterarbeiten | nach Call |

Sekundäre Ebenen:

- Text-Fallback
- Details / Quellen / Transcript
- Fehler- und Recovery-Hinweise

Diese sekundären Ebenen sind bewusst nachgelagert und dürfen den Call Screen nicht dominieren.

---

## 4. Entry Flow

### 4.1 Call Mode Entry

Daniel öffnet Mission Control und sieht einen klaren Einstieg:

- Label: **Call Mode** oder **Hermes Call**
- Primäraktion: **Gespräch starten**
- Optionaler Hinweis: letzter Call / letzter Kontext

Der Einstieg darf nicht wie eine technische Voice Console wirken.

### 4.2 Profile Selection

Vor dem Start wählt Daniel ein Profil.

V1 Profile:

| Profil | UI Label | Kontext |
|---|---|---|
| `main` | Hermes | persönlicher Hauptkontext + Telegram-DM `485318478` |
| `sales_support` | Sales Support | Sales-/Discovery-Kontext + Telegram `-1003998265477` / `23` |
| `luma` | LUMA | LUMA-Kontext + Telegram `-1003998265477` / `24` |

Profilkarten sollten kurz sein:

- Name
- 1-Zeilen-Beschreibung
- optional „zuletzt genutzt“

### 4.3 Context Preview

Vor dem Start kann eine sehr kompakte Context Preview angezeigt werden.

Beispiele:

- „Hermes · heutiger Kontext geladen“
- „Sales Support · Sales Telegram + CRM“
- „LUMA · Produkt/GTM + LUMA Telegram“

Keine langen Listen. Keine Rohdaten. Kein Transcript.

### 4.4 Start Call

Nach Profilwahl:

1. Daniel tippt **Gespräch starten**.
2. UI wechselt in Call Screen.
3. Status: **Kontext wird geladen…**
4. Danach: **Bereit** oder direkte Begrüßung.
5. Danach startet der Hands-free Loop.

---

## 5. Main Call Screen

### 5.1 Layout

Mobile-first Layout:

1. **Top Area:** Profil / Kontext + optional Minimize/Back.
2. **Center Area:** großer Voice Status Orb / Call Visual.
3. **Status Area:** kurzer verständlicher Zustand.
4. **Action Area:** 3–5 Hauptaktionen, Mute prominent unten.
5. **Fallback Area:** Text-Fallback eingeklappt oder sekundär.

### 5.2 Primary Visual Focus

Der Hauptfokus ist ein großer Call-Orb oder eine ähnliche zentrale Visualisierung.

Zweck:

- zeigt, ob Hermes hört, denkt, spricht, nachschaut oder gemutet ist
- erzeugt Call-Gefühl
- ersetzt technische Logs als primäres Feedback

### 5.3 Status Area

Status Area zeigt maximal eine kurze Zeile plus optional Subline.

Beispiele:

| Zustand | Hauptstatus | Subline |
|---|---|---|
| listening | „Ich höre zu“ | optional „Sprich einfach los“ |
| user_speaking | „Du sprichst“ | optional Live-Waveform |
| thinking | „Ich denke kurz nach“ | leer |
| retrieving_context | „Ich schau kurz nach“ | „Kontext wird geladen“ |
| researching_web | „Ich recherchiere“ | „Quellen werden geprüft“ |
| speaking | „Hermes spricht“ | leer |
| muted | „Gemutet“ | „Ich höre dich gerade nicht“ |
| handoff_ready | „Handoff bereit“ | „Du kannst in Telegram anschließen“ |

### 5.4 Action Area

Im laufenden Call sollen nur wenige Aktionen sichtbar sein:

- **Gespräch beenden**
- **Mute / Unmute**
- **Kontext anzeigen** oder Profilchip
- **Text-Fallback**
- **Mehr** / Details

Mute sollte unten und leicht erreichbar sein.

### 5.5 Text Fallback Area

Text-Fallback ist sekundär.

Regel:

- standardmäßig eingeklappt
- erreichbar über Button **Text-Fallback**
- keine permanente Chat-Konsole im Zentrum
- dient nur bei Audiofehlern, lauter Umgebung oder manueller Eingabe

---

## 6. Button and Action Model

### 6.1 Vor dem Call

| Aktion | Label | Zweck |
|---|---|---|
| Start | Gespräch starten | startet Call mit gewähltem Profil |
| Profilwahl | Hermes / Sales Support / LUMA | Kontext wählen |
| optional Details | Kontext anzeigen | kurze Preview |

### 6.2 Während des Calls

Maximal 5 Hauptaktionen:

| Aktion | Label | Position | Verhalten |
|---|---|---|---|
| End Call | Gespräch beenden | prominent, aber nicht versehentlich | startet Call-End-Pipeline |
| Mute | Mute / Unmute | unten / Daumenbereich | toggelt `isMuted` |
| Context | Kontext | oben oder sekundär | zeigt Profil + kurze Quelleninfo |
| Text Fallback | Text | sekundär | öffnet Eingabefeld |
| More | Mehr | sekundär | Details, Quellen, Transcript |

### 6.3 Nach dem Call

| Aktion | Label | Zweck |
|---|---|---|
| Handoff ansehen | Handoff öffnen | Summary / Artefakte sehen |
| Zurück | Zurück zu Mission Control | Call Screen schließen |
| Telegram anschließen | In Telegram weiter | falls technisch verfügbar / als Hinweis |

---

## 7. Visible Call States

| State Machine State / Flag | Visible Status | UI Verhalten |
|---|---|---|
| `idle` | „Bereit für Call“ | Profilwahl sichtbar |
| `starting` | „Call startet…“ | Startbutton disabled |
| `hydrating_context` | „Kontext wird geladen…“ | ruhiger Ladezustand |
| `ready` | „Bereit“ | Listening startet oder Begrüßung |
| `listening` | „Ich höre zu“ | Orb pulsiert ruhig |
| `user_speaking` | „Du sprichst“ | Input-Waveform / aktive Bewegung |
| `classifying_intent` | „Ich ordne das kurz ein“ | kurzer Denkstatus, nicht zu technisch |
| `thinking` | „Ich denke kurz nach“ | Orb Denkzustand |
| `retrieving_context` | „Ich schau kurz nach“ | Kontextstatus, keine Logs |
| `researching_web` | „Ich recherchiere“ | Researchstatus, optional Quellenhinweis nach Ergebnis |
| `creating_work_order` | „Ich lege das an“ | kurze Bestätigung, kein sichtbarer Mini-Status nötig |
| `speaking` | „Hermes spricht“ | Audio Visual aktiv |
| `interrupted` | „Ich höre zu“ | Audio stoppt, User Input wird Fokus |
| `isMuted=true` | „Gemutet“ | Mute-Overlay, kein Barge-in |
| `paused` | „Pausiert“ | Resume / End sichtbar |
| `ending` | „Gespräch wird beendet…“ | Actions disabled außer ggf. Retry |
| `persisting_artifacts` | „Ich speichere den Call…“ | Handoff wird vorbereitet |
| `handoff_ready` | „Handoff bereit“ | Summary-/Handoff-Aktionen sichtbar |
| `completed` | „Gespräch beendet“ | Abschlusszustand |
| `failed` | „Etwas ist schiefgelaufen“ | Recovery / Text-Fallback / Retry |

---

## 8. Hands-Free Conversation Loop

Normaler Loop:

1. UI zeigt **Ich höre zu**.
2. Daniel spricht ohne Buttondruck.
3. UI zeigt **Du sprichst**.
4. Nach finalem Turn zeigt UI kurz **Ich denke kurz nach**.
5. Je nach Intent zeigt UI:
   - **Ich schau kurz nach**
   - **Ich recherchiere**
   - **Ich lege das an**
   - oder direkt **Hermes spricht**
6. Hermes spricht automatisch.
7. Danach kehrt UI zu **Ich höre zu** zurück.

Wichtig:

- Daniel muss nicht pro Turn auf Aufnahme/Stop/Send drücken.
- Text-Fallback darf den Loop nicht ersetzen.
- Wenn Hermes länger arbeitet, wird der Status ruhig und verständlich angezeigt.

---

## 9. Barge-In UX

### 9.1 Nutzerverhalten

Daniel redet während Hermes spricht einfach rein.

### 9.2 Erwartete UX-Reaktion

Sofort:

1. Hermes-Audio stoppt.
2. Status wechselt von **Hermes spricht** zu **Ich höre zu** oder **Du sprichst**.
3. Der alte Assistant-Turn wird nicht weiter ausgespielt.
4. Der neue User Turn wird Fokus.

### 9.3 Visuelle Rückmeldung

- Orb wechselt unmittelbar in Listening/User-Speaking-Zustand.
- Kein technischer Hinweis nötig wie „Barge-in detected“.
- Optional kurze Mikroanimation, die zeigt: Hermes hat unterbrochen.

### 9.4 Tool-/Research-Kontext

Wenn Hermes gerade wegen der alten Antwort recherchiert oder retrieved:

- nur für die alte Antwort relevante Tasks werden abgebrochen oder als stale markiert
- bereits explizit angelegte Work Orders dürfen weiterlaufen
- UI muss keinen komplexen Toolstatus zeigen

---

## 10. Mute UX

### 10.1 Grundmodell

Mute ist ein persistiertes Flag `isMuted`, kein alleiniger Lifecycle-State.

Das bedeutet:

- Call kann fachlich weiter `listening`, `speaking` oder `paused` sein
- UI zeigt trotzdem klar **Gemutet**
- während Mute entstehen keine User Turns
- während Mute gibt es kein Barge-in

### 10.2 Mute aktivieren

Aktion: Daniel tippt **Mute**.

UI:

- Button wechselt zu **Unmute**
- Status zeigt **Gemutet** oder eine klare Badge
- Orb wird visuell gedämpft
- optional Subline: „Ich höre dich gerade nicht“

### 10.3 Mute deaktivieren

Aktion: Daniel tippt **Unmute**.

UI:

- Button wechselt zu **Mute**
- wenn Call aktiv ist: zurück zu **Ich höre zu**
- wenn Call pausiert ist: bleibt **Pausiert**

### 10.4 Hermes spricht während Mute

Wenn Daniel muted, während Hermes spricht:

- Hermes darf weiter sprechen
- Daniel kann nicht per Reinreden unterbrechen, solange Mute aktiv ist
- Daniel kann jederzeit Gespräch beenden

---

## 11. Retrieval and Research UX

### 11.1 Retrieval UX

Wenn Hermes internen Kontext lädt:

- gesprochene Kurzansage: „Ich schau kurz nach.“
- sichtbarer Status: **Ich schau kurz nach**
- optional Subline: „Kontext wird geladen“
- keine lange technische Quellenliste im Hauptscreen

### 11.2 Research UX

Wenn Hermes externe Fakten recherchiert:

- sichtbarer Status: **Ich recherchiere**
- optional Subline: „Quellen werden geprüft“
- nach Ergebnis kurze Quellenangabe im gesprochenen Text

Beispiel:

> „Kurz: … Nachgeschaut bei Reuters und tagesschau.de.“

### 11.3 Keine dominanten Logs

Nicht im Hauptscreen anzeigen:

- laufende Suchqueries
- lange Quellenlisten
- Debug-Logs
- rohes Transcript

Diese Informationen gehören in Details / Handoff.

### 11.4 Quellen und Links

Direktlinks werden verfügbar über:

- Handoff Summary
- Details / Quellenansicht
- Research Artifact

Im Call Screen reicht ein Hinweis:

- „Quellen im Handoff gespeichert“

---

## 12. Work Order UX

### 12.1 Synchronous Work Orders

Für kurze Aufgaben:

- Status: **Ich lege das an** oder **Ich mache das kurz**
- Ergebnis wird direkt gesprochen
- ggf. Pfad/Artefakt im Handoff

### 12.2 Asynchronous Work Orders

Für längere Aufgaben:

- keine sichtbare Statusleiste nötig
- Hermes bestätigt kurz gesprochen
- Status darf kurz **Auftrag angelegt** anzeigen
- Ergebnis erscheint später im Handoff / Artefakt

Beispiel:

> „Alles klar, ich lege das als Auftrag an und gebe dir das Ergebnis im Handoff.“

### 12.3 Needs Review

Wenn Review nötig ist:

- UI zeigt kurze Review-Badge oder Hinweis nach dem Call
- Hermes sagt im Call knapp, dass er nichts Externes ohne OK ausführt
- keine externe Nachricht / irreversible Aktion ohne Bestätigung

---

## 13. Call-End and Handoff UX

### 13.1 Gespräch beenden

Daniel tippt **Gespräch beenden**.

UX:

1. Audio stoppt.
2. Status: **Gespräch wird beendet…**
3. Status: **Ich speichere den Call…**
4. Status: **Handoff bereit**

### 13.2 Handoff bereit

Nach erfolgreicher Pipeline zeigt UI:

- Hauptstatus: **Handoff bereit**
- Kurzsummary oder 1–2 Zeilen:
  - Thema
  - wichtigste Entscheidung / Output
- Aktionen:
  - **Handoff öffnen**
  - **Zurück zu Mission Control**
  - optional **In Telegram weiter**

### 13.3 Letzte-Call-Logik

Ein Handoff gilt als letzter Call, bis ein weiterer Call im gleichen Kontext gemacht wurde.

UI muss das nicht erklären, aber Handoff-Objekte sollen intern Profil + Telegram Binding tragen.

### 13.4 Partial Persistence

Wenn nicht alles gespeichert wurde:

- nicht „Handoff bereit“ behaupten, wenn Handoff fehlt
- stattdessen: **Teilweise gespeichert**
- klar sagen, was verfügbar ist, z. B. Transcript ja, Summary noch nicht

---

## 14. Error and Fallback UX

### 14.1 Audio Input Fehler

Status:

- „Mikrofon nicht verfügbar“

Aktionen:

- Berechtigung prüfen
- erneut versuchen
- Text-Fallback öffnen
- Gespräch beenden

### 14.2 Audio Output Fehler

Status:

- „Audioausgabe nicht verfügbar“

Aktionen:

- nochmal abspielen
- Textantwort anzeigen
- Text-Fallback öffnen

### 14.3 Context Missing

Status / Voice:

> „Dazu finde ich im aktuellen Kontext nichts Belastbares.“

UI:

- keine Fehlerwand
- optional Button / More: „Details“

### 14.4 Research Failure

Voice:

> „Die Recherche hat gerade nicht sauber geklappt; ich kann das als Auftrag nachziehen.“

UI:

- Status: **Recherche fehlgeschlagen**
- optional: **Als Auftrag merken**

### 14.5 Artifact Persistence Partial Failure

Status:

- **Teilweise gespeichert**

Details:

- Transcript gespeichert / nicht gespeichert
- Summary gespeichert / nicht gespeichert
- Handoff bereit / nicht bereit

### 14.6 Text-Fallback

Text-Fallback darf geöffnet werden bei:

- Audio Input Fehler
- lauter Umgebung
- Daniel will manuell schreiben
- Voice Provider instabil

Aber:

- standardmäßig nicht dominant
- keine Chat-Konsole als Hauptscreen
- nach Send kehrt UI möglichst in Call-Zustand zurück

---

## 15. Component Model

| Component | Zweck |
|---|---|
| `VoiceCallEntry` | Einstieg in Call Mode, Profilwahl-Container. |
| `VoiceProfileSelector` | Auswahl `main`, `sales_support`, `luma`. |
| `VoiceContextPreview` | kurze Kontextvorschau vor Start. |
| `VoiceCallScreen` | Hauptscreen während aktivem Call. |
| `VoiceStatusOrb` | zentraler visueller Call-Zustand. |
| `VoiceStatusText` | kurze Statuszeile/Subline. |
| `VoiceActionBar` | 3–5 Hauptaktionen. |
| `VoiceMuteButton` | Mute/Unmute mit Daumenposition. |
| `VoiceTextFallback` | einklappbare Texteingabe. |
| `VoiceHandoffSummary` | Abschluss-/Handoff-Zustand. |
| `VoiceErrorBanner` | kompakte Fehler-/Recovery-Hinweise. |
| `VoiceDetailsSheet` | Quellen, Transcript, technische Details nachgelagert. |

---

## 16. Frontend State Model

Testbare UI-State-Felder:

| Field | Type | Bedeutung |
|---|---|---|
| `profileSlug` | `main` / `sales_support` / `luma` | aktives Profil |
| `sessionId` | string/null | aktive Voice Session |
| `callState` | state enum | State-Machine-State |
| `visibleStatus` | string | nutzerfreundlicher Status |
| `isMuted` | boolean | persistiertes Mute-Flag |
| `isListening` | boolean | Mic/Realtime Input aktiv |
| `isSpeaking` | boolean | Hermes spricht |
| `isThinking` | boolean | Antwortgenerierung |
| `isRetrieving` | boolean | Kontext wird geladen |
| `isResearching` | boolean | Web Research läuft |
| `handoffAvailable` | boolean | Handoff bereit |
| `lastError` | string/null | UI-sicherer Fehler |
| `textFallbackOpen` | boolean | Text-Fallback sichtbar |
| `detailsOpen` | boolean | Detail-Sheet sichtbar |
| `hasPartialPersistenceFailure` | boolean | Call-Ende teilweise fehlgeschlagen |

### 16.1 Derived Visible Status

`visibleStatus` wird aus `callState` und Flags abgeleitet.

Priorität:

1. `lastError`
2. `hasPartialPersistenceFailure`
3. `isMuted`
4. aktive Tool-/Research-Zustände
5. Audio-Zustände
6. Handoff / completed

---

## 17. Acceptance Criteria

- UI fühlt sich wie Call Mode an, nicht wie Console.
- Mobile-first Layout funktioniert einhändig.
- Maximal 4–5 Hauptaktionen sind im laufenden Call sichtbar.
- Mute ist immer leicht erreichbar.
- Mute wird als Flag behandelt und sichtbar angezeigt.
- Während Mute entstehen keine User Turns und kein Barge-in.
- Live Transcript dominiert nicht.
- Barge-in ist verständlich und sofort sichtbar: Hermes stoppt Audio und hört wieder zu.
- Retrieval/Research-Zustände sind erkennbar, aber nicht technisch überladen.
- Work Orders werden gesprochen bestätigt; kein sichtbarer Mini-Status ist nötig.
- Call-Ende zeigt Speichern und Handoff-Bereitschaft.
- Text-Fallback existiert, konkurriert aber nicht mit Voice.
- Fehlerzustände bieten Recovery ohne Debug-Sprache.
- Frontend kann direkt gegen die State Machine getestet werden.

---

## 18. Open Questions / Assumptions

### Assumptions

- **A01:** Der Hauptscreen nutzt einen zentralen Status-Orb oder vergleichbares Call Visual.  
  **Reason:** Die UX braucht ein Call-Gefühl statt Console-/Transcript-Dominanz.  
  **Risk if wrong:** Ein anderes visuelles Pattern muss dieselbe Statusklarheit leisten.

- **A02:** Text-Fallback bleibt in V1 vorhanden, aber sekundär.  
  **Reason:** Audio kann auf Mobile fehlschlagen; Fallback ist pragmatisch nötig.  
  **Risk if wrong:** Zu prominenter Text-Fallback lässt das Produkt wieder wie eine Console wirken.

- **A03:** Ein Button „Mehr“ / Details ist ausreichend, um Transcript, Quellen und technische Details auszulagern.  
  **Reason:** Live Transcript ist nicht primär, Quellen/Links müssen aber abrufbar sein.  
  **Risk if wrong:** Daniel braucht ggf. später schnelleren Zugriff auf Details.

### Open Questions

- **Q33:** Soll der Call Screen initial eine kurze Hermes-Begrüßung automatisch sprechen oder direkt in Listening starten?
- **Q34:** Soll es nach Call-Ende einen echten „In Telegram weiter“-Button geben oder zunächst nur Handoff-Anzeige in Mission Control?
