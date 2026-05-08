# Mission Control Voice Rebuild — 01 Big Picture Vision

**Status:** Draft zur Durchsicht  
**Quelle:** Mission-Control-Voice-Call vom 08.05.2026  
**Autor:** Hermes / Daniel

---

## 1. Vision in einem Satz

Mission Control Voice soll zu einem mobilen, kontextbewussten Call Mode werden, in dem Daniel per Sprache mit Hermes sprechen kann, während Hermes denselben Arbeitskontext wie im Telegram-Chat hat, live Mission-Control-Daten und Web-Recherche nachziehen kann und nach dem Call nahtlos wieder in Telegram oder andere Arbeitsflächen übergibt.

---

## 2. Zielbild

Daniel öffnet Mission Control meistens auf dem Handy und startet dort einen echten Gesprächsmodus. Statt einer technischen Voice-Konsole sieht er eine einfache Call-Oberfläche mit wenigen klaren Kontext-Optionen.

Beispiele für auswählbare Kontexte:

- **Hauptchat / Hermes**
- **Sales Support**
- **Telegram Chat**
- **LUMA**
- perspektivisch weitere spezialisierte Kontexte

Nach Auswahl eines Kontextes kommt ein Call zustande. Hermes ist sofort gesprächsbereit und verfügt über den relevanten Arbeitskontext, nicht nur über die isolierte aktuelle Voice-Session.

---

## 3. Gewünschte User Story

Als Daniel möchte ich Mission Control auf meinem Handy öffnen, einen passenden Hermes-Kontext auswählen und direkt mit Hermes sprechen können.

Während des Gesprächs soll Hermes verstehen, worauf ich mich beziehe — auch wenn der relevante Kontext aus einem Telegram-Chat, einer Mission-Control-Aktivität, einem früheren Voice Call, einem Sales-Kontext oder einem LUMA-Arbeitsstand stammt.

Ich möchte Hermes im Call Fragen stellen können wie:

> „Was haben wir vor zehn Minuten im Chat besprochen?“

oder:

> „Guck mal kurz nach, was heute im Iran passiert ist.“

Hermes soll dann bei Bedarf kurz ruhig sein, Kontext oder aktuelle Informationen recherchieren, und mit einer verlässlichen, knappen Antwort zurückkommen.

Nach dem Call möchte ich wieder in Telegram wechseln und direkt anschließen können, zum Beispiel:

> „Wir haben gerade über Thema X gesprochen — fass das bitte nochmal zusammen.“

oder:

> „Mach daraus jetzt die nächsten Schritte.“

---

## 4. Was sich anders anfühlen soll als heute

Der heutige Voice-Modus funktioniert grundsätzlich, fühlt sich aber noch nicht wie ein vollwertiger Hermes-Call an.

Das Ziel ist nicht nur bessere Spracheingabe, sondern ein anderes Produktgefühl:

- weniger „Voice Console“
- mehr „echter Call mit Hermes“
- mobile-first statt Desktop-Tool
- Kontextzugriff während des Gesprächs
- Research-Aufträge per Sprache
- nachvollziehbare Antworten statt Halluzination
- sauberer Übergang zurück in Telegram / Chat

---

## 5. Kernprinzipien

### 5.1 Mission Control bleibt die primäre Voice-Oberfläche

Der Call startet in Mission Control. Telegram bleibt wichtig für Übergabe, Follow-up und anschließende Arbeit, aber nicht als primäre Voice-Runtime.

### 5.2 Kontext ist kein Nice-to-have, sondern Kernfunktion

Ein Voice Call ohne Zugriff auf Daniels aktuellen Arbeitskontext ist nicht ausreichend. Hermes muss während des Gesprächs wissen oder nachziehen können, was in relevanten Kontexten passiert ist.

Dazu gehören perspektivisch:

- aktuelle Telegram-Chat-Kontexte
- Mission-Control-Aktivitäten
- Tasks
- Projekte
- CRM-/Sales-Kontext
- LUMA-Kontext
- frühere Voice Calls
- Memory / Daily Logs
- Research-Ergebnisse

### 5.3 Retrieval muss hörbar und erwartbar sein

Wenn Hermes etwas nachschauen muss, soll das im Gespräch erkennbar sein. Der gewünschte Flow ist ungefähr:

1. Daniel stellt eine Frage oder gibt einen Research-Auftrag.
2. Hermes signalisiert kurz, dass er nachschaut.
3. Hermes ist kurz ruhig bzw. arbeitet im Hintergrund.
4. Hermes kommt mit einer recherchierten Antwort zurück.

Wichtig: In dieser Phase darf Hermes nicht raten. Wenn Daten fehlen, muss das transparent gesagt werden.

### 5.4 Calls sollen Arbeit auslösen können

Voice ist nicht nur Frage-Antwort. Daniel möchte per Voice auch Aufträge geben können, aus denen echte Arbeit entsteht:

- Recherche starten
- Spezifikation erstellen
- Fakten extrahieren
- offene Fragen sammeln
- nächste Schritte ableiten
- später Aufgaben, Dokumente oder Follow-ups erzeugen

### 5.5 Nach dem Call muss der Kontext weiterleben

Ein Call darf kein isolierter Moment sein. Nach Beenden des Gesprächs soll der Inhalt für spätere Arbeit verfügbar sein:

- als Transcript
- als strukturierte Zusammenfassung
- als Bezugspunkt für Telegram
- als Input für Spec-Files, Extraction-Files, Open Questions und Tasks

---

## 6. Beispielhafter Idealablauf

1. Daniel öffnet Mission Control auf dem Handy.
2. Er tippt auf **Call Mode**.
3. Er wählt einen Kontext, zum Beispiel **Hauptchat** oder **LUMA**.
4. Hermes begrüßt Daniel und hat den relevanten Kontext geladen.
5. Daniel fragt nach etwas, das gerade im Telegram-Chat oder in Mission Control passiert ist.
6. Hermes zieht den Kontext live nach und antwortet knapp.
7. Daniel gibt einen Research-Auftrag.
8. Hermes signalisiert, dass er nachschaut, recherchiert und kommt zurück.
9. Daniel beendet den Call.
10. Mission Control speichert Transcript und Summary.
11. Daniel wechselt zurück zu Telegram und kann direkt auf den Call Bezug nehmen.

---

## 7. Erste Produktartefakte dieses Rebuilds

Daniel möchte das Thema schrittweise sauber spezifizieren. Die geplante Reihenfolge:

1. **Big Picture / Vision**  
   Dieses Dokument. Es beschreibt das Zielbild und die gewünschte Produktwirkung.

2. **Extraction File**  
   Fakten, Anforderungen, implizite Annahmen und harte Produktanforderungen aus der Vision extrahieren.

3. **Open Questions File**  
   Offene Fragen fortlaufend sammeln und pflegen, statt sie im Chat zu verlieren.

4. **Business Logic**  
   Regeln für Kontextauswahl, Retrieval, Research, Übergabe, Speicherung und Auftragserzeugung definieren.

5. **State Machine**  
   Call-Zustände, Retrieval-Zustände, Research-Zustände, Tool-Ausführung und Übergabe modellieren.

6. **Frontend / Call UX**  
   Mobile-first Call Screen, klare Kontextauswahl, Gesprächsstatus, Start/Ende, Fallbacks.

---

## 8. Nicht-Ziele für diese erste Vision

Dieses Dokument entscheidet noch nicht:

- welche konkrete STT-/TTS-/Realtime-Technologie final genutzt wird
- ob WebRTC, OpenAI Realtime, ElevenLabs oder andere Provider eingesetzt werden
- wie die finale Datenbankstruktur aussieht
- wie genau Tool Calls technisch orchestriert werden
- welche UI-Komponenten final gebaut werden

Diese Themen gehören in spätere Spec-Files.

---

## 9. Qualitätsmaßstab

Der Rebuild ist gelungen, wenn Daniel Mission Control Voice so nutzen kann, als würde er mit Hermes telefonieren:

- schnell
- mobil
- natürlich
- kontextbewusst
- ehrlich über Unsicherheit
- mit Zugriff auf Mission Control und aktuelle Recherche
- anschlussfähig an Telegram und weitere Arbeit

Kurz: **Nicht nur Spracheingabe — sondern ein echter, kontextfähiger Hermes-Call.**
