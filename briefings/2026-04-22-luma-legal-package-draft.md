# LUMA Legal Package Draft

**Status:** Arbeitsentwurf, keine Rechtsberatung, vor Einsatz anwaltlich prüfen lassen.
**Kontext:** LUMA als deutsches B2B SaaS für kleine Architekturbüros. Anbieter aktuell Daniel Mehlhart als Einzelunternehmer.

---

## 1) LUMA-spezifische Must-have-Gliederung für AGB / Terms

### Absolute Must-haves
1. **Geltungsbereich / B2B-only**
   - Gilt nur gegenüber Unternehmern i.S.d. § 14 BGB
   - Keine Verbraucher
   - Vertragspartner ist das Büro / Unternehmen

2. **Vertragsgegenstand**
   - Bereitstellung von LUMA als cloudbasierte SaaS-Plattform
   - Module je nach gebuchtem Plan / Leistungsbeschreibung
   - Zugriff per Internet, kein Erfolg einer bestimmten wirtschaftlichen Wirkung geschuldet

3. **Leistungsumfang / Produktänderungen**
   - Bereitstellung der jeweils aktuellen Version
   - Weiterentwicklungen, Anpassungen, Verbesserungen und funktional gleichwertige Änderungen zulässig
   - Kein Anspruch auf unveränderte Einzel-Features, solange Kernleistung erhalten bleibt
   - Beta-/Pilot-/Early-Access-Funktionen können abweichen, eingeschränkt sein oder entfallen

4. **Registrierung / Accounts / Nutzerverantwortung**
   - Kunde benennt Admin-User
   - Kunde haftet intern für seine Nutzer, Rollen, Berechtigungen und Passwortsicherheit
   - Unbefugte Nutzung unverzüglich melden

5. **Preise / Abrechnung / Zahlungsbedingungen**
   - Preise laut Angebot / Order Form / Pricing Page
   - Vorauszahlung für laufende Perioden
   - Fälligkeit, Verzug, Sperrung bei erheblichem Zahlungsverzug

6. **Preisanpassung**
   - Gründe nennen: Infrastruktur-, Hosting-, Sicherheits-, Compliance-, Personal-, Drittanbieter- und Betriebskosten sowie Leistungs-/Funktionsausbau
   - Vorlauf ankündigen
   - Keine Rückwirkung innerhalb bereits bezahlter Perioden
   - Sonderkündigungsrecht bei wesentlicher Erhöhung

7. **Verfügbarkeit / Wartung / Störungen**
   - Zielverfügbarkeit statt harter Enterprise-SLA
   - Geplante Wartung, höhere Gewalt, Drittanbieter- und kundenseitige Ursachen ausnehmen

8. **Pflichten des Kunden / zulässige Nutzung**
   - Keine rechtswidrigen Inhalte
   - Keine Sicherheitsverstöße, keine missbräuchliche Nutzung, kein Reverse Engineering
   - Kunde bleibt verantwortlich für Rechtmäßigkeit seiner Inhalte und Daten

9. **Datenschutz / AVV**
   - Datenschutz in AGB nur rahmenartig
   - AVV separat
   - Hinweis auf Subunternehmer / Hosting / AI-/Mail-Anbieter

10. **Vertraulichkeit**
    - Beidseitige Geheimhaltung für Betriebs- und Projektdaten

11. **IP / Nutzungsrechte**
    - Software und Rechte verbleiben bei Daniel / LUMA
    - Kunde erhält einfaches, nicht ausschließliches, nicht übertragbares Nutzungsrecht für Vertragsdauer

12. **Haftung**
    - Unbeschränkt nur bei Vorsatz, grober Fahrlässigkeit, Personenschäden und zwingender Haftung
    - Bei leichter Fahrlässigkeit nur für wesentliche Vertragspflichten
    - Cap für typische B2B-Schäden
    - Datenverlust auf typischen Wiederherstellungsaufwand begrenzen

13. **Laufzeit / Kündigung / Folgen der Beendigung**
    - Laufzeitmodell, Verlängerung, Fristen
    - Datenexport / Zugriff nach Vertragsende / Löschfristen

14. **Schlussbestimmungen**
    - Deutsches Recht
    - Gerichtsstand B2B
    - Rangfolge der Vertragsdokumente

### Stark empfohlen
- Hinweis auf **keine Rechts-/Steuer-/Architekturberatung** durch die Software
- **Support- und Reaktionsmodell** in einfacher Form
- **Sperrungsrechte** bei Sicherheitsvorfällen oder Missbrauch
- **Subprocessor-/Drittanbieter-Hinweise**
- **Beta-/AI-Zusatzklausel** für Copilot, Voice, E-Mail-Agent

### Nice to have
- Separate SLA
- Security Addendum
- Acceptable Use Policy als separates Dokument
- Separate AI Terms

---

## 2) Risiko-Checkliste für Daniel als Solo-Founder ohne GmbH

### Rot = jetzt angehen
- [ ] **B2B-only in Vertrag und Produktfluss klarziehen**
- [ ] **AGB mit Haftungsbegrenzung** sauber aufsetzen
- [ ] **AVV** erstellen
- [ ] **Datenschutzerklärung** für Website + App + Demo-Flow erstellen
- [ ] **Impressum** sauber live haben
- [ ] **Subprocessor-Liste** dokumentieren (z. B. Hosting, Auth, Mail, AI, Storage)
- [ ] **TOMs** dokumentieren
- [ ] **Datenpannen-Prozess** definieren: Erkennen, intern eskalieren, dokumentieren, Kunden informieren, Fristen beachten
- [ ] **Backup- und Restore-Prozess** nicht nur technisch haben, sondern dokumentieren
- [ ] **Cyber-/Vermögensschadenhaftpflicht prüfen**

### Orange = kurzfristig nachziehen
- [ ] Beta-Funktionen markieren (z. B. AI, Voice, Inbox-Agent)
- [ ] Security-Claims auf Website prüfen: nichts versprechen, was operativ nicht belegt ist
- [ ] Pricing / Kündigungsfristen / Trial-Regeln schriftlich vereinheitlichen
- [ ] Lösch- und Exportprozess nach Vertragsende festlegen
- [ ] Rollen- und Berechtigungsmodell dokumentieren

### Grün = später professionalisieren
- [ ] UG/GmbH-Struktur prüfen
- [ ] SLA / Security Annex für größere Kunden
- [ ] DPA/TOM-Review durch Anwalt oder Datenschutzberater
- [ ] Vendor-Management / jährliche Sicherheitsreview

### Operative Leitfragen vor Go-Live mit zahlenden Kunden
1. Welche personenbezogenen Daten verarbeitet LUMA tatsächlich?
2. Welche Anbieter sehen diese Daten mit?
3. Kann ein Kunde seine Daten exportieren?
4. Kannst du einen Tenant sauber sperren, exportieren und löschen?
5. Wie würdest du in den ersten 24h nach einem Leak handeln?
6. Welche Features sind stabil, welche experimentell?

---

## 3) Erster Draft für `LUMA_AGB_B2B.md`

# Allgemeine Geschäftsbedingungen (AGB) für LUMA B2B SaaS

**Anbieter:** Daniel Mehlhart, Wiederholstraße 5, 61440 Oberursel, E-Mail: daniel@mehlhart.de

**Stand:** 22.04.2026  
**Hinweis:** Arbeitsentwurf, vor Einsatz rechtlich prüfen lassen.

## § 1 Geltungsbereich

(1) Diese AGB gelten für alle Verträge über die Nutzung der cloudbasierten Softwareplattform **LUMA** zwischen Daniel Mehlhart („Anbieter") und Unternehmern im Sinne des § 14 BGB („Kunde").

(2) Diese AGB gelten ausschließlich gegenüber Unternehmern. Ein Vertragsschluss mit Verbrauchern ist ausgeschlossen.

(3) Abweichende, entgegenstehende oder ergänzende Allgemeine Geschäftsbedingungen des Kunden werden nur dann Vertragsbestandteil, wenn der Anbieter ihrer Geltung ausdrücklich in Textform zugestimmt hat.

## § 2 Vertragsgegenstand

(1) Der Anbieter stellt dem Kunden die Softwareplattform LUMA als Software-as-a-Service über das Internet zur Verfügung.

(2) LUMA dient insbesondere der Projektsteuerung, Aufgabenkoordination, Dokumentation, Zusammenarbeit und – je nach gebuchtem Leistungsumfang – weiteren Modulen wie Dokumentenmanagement, Forecasting, E-Mail-bezogenen Workflows, KI-gestützten Funktionen oder Spracheingaben.

(3) Der konkrete Leistungsumfang ergibt sich aus dem jeweiligen Angebot, dem gebuchten Tarif, der Leistungsbeschreibung und etwaigen produktbezogenen Zusatzbedingungen.

(4) Der Anbieter schuldet die Zurverfügungstellung der vereinbarten Softwarefunktionalitäten, nicht jedoch einen bestimmten wirtschaftlichen Erfolg.

## § 3 Registrierung, Accounts und Nutzer

(1) Der Kunde benennt mindestens einen administrativen Hauptnutzer. Dieser ist berechtigt, weitere Nutzerkonten im Namen des Kunden anzulegen und zu verwalten.

(2) Der Kunde ist dafür verantwortlich, dass die von ihm angelegten Nutzer nur im vereinbarten Umfang auf LUMA zugreifen und die Zugangsdaten geheim halten.

(3) Der Kunde wird den Anbieter unverzüglich informieren, wenn Anhaltspunkte dafür bestehen, dass Zugangsdaten unbefugt genutzt wurden oder Sicherheitsvorfälle im Verantwortungsbereich des Kunden vorliegen.

(4) Der Kunde ist für alle Aktivitäten verantwortlich, die über seine Accounts im Rahmen seiner Sphäre erfolgen, es sei denn, er hat die missbräuchliche Nutzung nicht zu vertreten.

## § 4 Leistungsänderungen, Weiterentwicklung, Beta-Funktionen

(1) Der Anbieter ist berechtigt, LUMA weiterzuentwickeln, Funktionen anzupassen, zu verändern, zu erweitern oder durch funktional gleichwertige Lösungen zu ersetzen, sofern die wesentlichen vertraglichen Hauptleistungen für den Kunden erhalten bleiben.

(2) Der Anbieter ist berechtigt, technische Änderungen vorzunehmen, soweit diese aus Sicherheitsgründen, zur Anpassung an den Stand der Technik, zur Verbesserung der Benutzerfreundlichkeit oder aufgrund geänderter rechtlicher oder regulatorischer Anforderungen erforderlich sind.

(3) Als Beta-, Test-, Pilot- oder Early-Access-Funktionen gekennzeichnete Funktionen können von der allgemeinen Produktqualität abweichen, eingeschränkt verfügbar sein oder jederzeit geändert bzw. eingestellt werden. Soweit nicht ausdrücklich anders vereinbart, besteht auf solche Funktionen kein Anspruch auf unveränderte Bereitstellung.

## § 5 Preise, Abrechnung und Zahlungsbedingungen

(1) Es gelten die jeweils individuell vereinbarten Preise oder – soweit vereinbart – die zum Zeitpunkt des Vertragsschlusses gültige Preisübersicht des Anbieters, jeweils zuzüglich gesetzlicher Umsatzsteuer.

(2) Wiederkehrende Nutzungsgebühren sind im Voraus für die jeweilige Abrechnungsperiode fällig.

(3) Rechnungen sind, sofern nicht anders vereinbart, innerhalb von 14 Tagen ab Rechnungsdatum ohne Abzug zahlbar.

(4) Bei Zahlungsverzug ist der Anbieter berechtigt, die gesetzlichen Verzugszinsen sowie eine etwaige Verzugspauschale nach den gesetzlichen Vorschriften zu verlangen.

(5) Bei erheblichem Zahlungsverzug ist der Anbieter nach vorheriger Androhung berechtigt, den Zugang zu LUMA vorübergehend zu sperren, sofern berechtigte Interessen des Kunden hierdurch nicht unangemessen beeinträchtigt werden.

## § 6 Preisanpassung

(1) Der Anbieter ist berechtigt, die vereinbarten wiederkehrenden Preise mit Wirkung für zukünftige Abrechnungsperioden anzupassen, wenn und soweit sich die für die Leistungserbringung maßgeblichen Kosten verändern. Maßgebliche Faktoren sind insbesondere Kosten für Hosting, Infrastruktur, Speicher, Drittanbieter-Software, Authentifizierungs- und Kommunikationsdienste, Sicherheits- und Compliance-Maßnahmen, Personal sowie allgemeine Betriebs- und Verwaltungskosten.

(2) Der Anbieter ist ferner berechtigt, Preise anzupassen, wenn sich der Leistungsumfang, Sicherheitsanforderungen, gesetzliche Rahmenbedingungen oder die dem Vertrag zugrunde liegenden Nutzungsparameter wesentlich ändern.

(3) Preisanpassungen werden dem Kunden mindestens in Textform mit einer Frist von 8 Wochen vor ihrem Wirksamwerden angekündigt.

(4) Beträgt die Preiserhöhung für die betroffene Leistung mehr als 10 % gegenüber dem bisher geltenden wiederkehrenden Preis, ist der Kunde berechtigt, den betroffenen Vertrag mit Wirkung zum Zeitpunkt des Inkrafttretens der Preisanpassung außerordentlich in Textform zu kündigen. Hierauf wird der Anbieter in der Mitteilung gesondert hinweisen.

(5) Bereits bezahlte Vertragszeiträume bleiben von der Preisanpassung unberührt.

## § 7 Verfügbarkeit, Wartung und technische Voraussetzungen

(1) Der Anbieter bemüht sich um eine hohe Verfügbarkeit von LUMA. Sofern nicht ausdrücklich anders vereinbart, schuldet der Anbieter jedoch keine gesonderte Service-Level-Vereinbarung.

(2) Nicht als vom Anbieter zu vertretende Ausfallzeiten gelten insbesondere:
- geplante Wartungsfenster,
- Störungen der allgemeinen Internetinfrastruktur,
- Ausfälle von Drittanbietern, auf die der Anbieter keinen unmittelbaren Einfluss hat,
- höhere Gewalt,
- Störungen im Verantwortungsbereich des Kunden.

(3) Der Kunde ist dafür verantwortlich, die für die Nutzung der Software erforderlichen technischen Voraussetzungen in seinem Verantwortungsbereich bereitzustellen.

## § 8 Pflichten des Kunden / zulässige Nutzung

(1) Der Kunde wird LUMA nur im Rahmen der vertraglich vorausgesetzten Nutzung einsetzen.

(2) Dem Kunden ist es insbesondere untersagt,
- rechtswidrige Inhalte zu verarbeiten oder bereitzustellen,
- Schutzmechanismen der Plattform zu umgehen,
- unbefugt auf Daten anderer Mandanten zuzugreifen oder dies zu versuchen,
- die Software zu missbrauchen, automatisiert anzugreifen, zu überlasten oder sicherheitsgefährdend zu nutzen,
- Quellcode oder interne Sicherheitsmechanismen unbefugt zu analysieren, soweit dies nicht gesetzlich zwingend erlaubt ist.

(3) Der Kunde ist für die Rechtmäßigkeit der von ihm und seinen Nutzern in LUMA eingestellten, verarbeiteten oder übermittelten Inhalte und Daten verantwortlich.

## § 9 Datenschutz und Auftragsverarbeitung

(1) Soweit der Anbieter im Rahmen der Leistungserbringung personenbezogene Daten im Auftrag des Kunden verarbeitet, schließen die Parteien einen gesonderten Auftragsverarbeitungsvertrag (AVV).

(2) Der Anbieter verarbeitet personenbezogene Daten im Übrigen nach Maßgabe der anwendbaren datenschutzrechtlichen Bestimmungen.

(3) Der Kunde bleibt datenschutzrechtlich verantwortliche Stelle, soweit die Parteien nicht ausdrücklich etwas anderes vereinbaren.

## § 10 Vertraulichkeit

(1) Beide Parteien verpflichten sich, alle ihnen im Zusammenhang mit dem Vertragsverhältnis bekannt werdenden vertraulichen Informationen der jeweils anderen Partei geheim zu halten und nur für Zwecke der Vertragsdurchführung zu verwenden.

(2) Als vertraulich gelten insbesondere Geschäfts- und Betriebsgeheimnisse, Projektdaten, Kundendaten, nicht öffentlich bekannte Produktinformationen sowie interne Dokumentationen.

(3) Die Verpflichtung gilt nicht für Informationen, die
- allgemein bekannt sind oder ohne Vertragsverstoß allgemein bekannt werden,
- der empfangenden Partei bereits rechtmäßig bekannt waren,
- von einem berechtigten Dritten rechtmäßig offengelegt wurden,
- aufgrund gesetzlicher Verpflichtung oder behördlicher / gerichtlicher Anordnung offengelegt werden müssen.

## § 11 Nutzungsrechte an der Software

(1) Der Anbieter räumt dem Kunden für die Dauer des Vertrags ein einfaches, nicht ausschließliches, nicht unterlizenzierbares und nicht übertragbares Recht ein, LUMA im vertraglich vereinbarten Umfang für eigene geschäftliche Zwecke zu nutzen.

(2) Alle Rechte an der Software, an Weiterentwicklungen, an der Dokumentation sowie an sonstigen Schutzrechten verbleiben beim Anbieter.

(3) Soweit der Kunde Feedback, Verbesserungsvorschläge oder Hinweise zur Weiterentwicklung der Software gibt, ist der Anbieter berechtigt, diese ohne gesonderte Vergütung für Produktverbesserungen zu verwenden.

## § 12 Laufzeit, Kündigung, Folgen der Vertragsbeendigung

(1) Die Laufzeit und Kündigungsfrist richten sich nach dem jeweils vereinbarten Tarif oder Angebot.

(2) Soweit nicht abweichend vereinbart, verlängern sich laufende Verträge jeweils um die vereinbarte Abrechnungsperiode, wenn sie nicht mit einer Frist von 30 Tagen zum Ende der jeweiligen Abrechnungsperiode gekündigt werden.

(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.

(4) Nach Vertragsende endet der Zugang des Kunden zur Plattform. Der Anbieter kann dem Kunden für einen angemessenen Zeitraum Gelegenheit zum Datenexport geben, sofern keine gesetzlichen oder sicherheitsbedingten Gründe entgegenstehen.

(5) Nach Vertragsende ist der Anbieter berechtigt, Kundendaten nach Ablauf angemessener Aufbewahrungs- und Exportfristen zu löschen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.

## § 13 Haftung

(1) Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit sowie nach den Vorschriften des Produkthaftungsgesetzes und in allen Fällen zwingender gesetzlicher Haftung.

(2) Bei leicht fahrlässiger Verletzung einer wesentlichen Vertragspflicht ist die Haftung des Anbieters auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Wesentliche Vertragspflichten sind solche, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig vertrauen darf.

(3) Im Übrigen ist die Haftung des Anbieters bei leichter Fahrlässigkeit ausgeschlossen.

(4) Soweit gesetzlich zulässig, ist die Haftung des Anbieters nach Absatz 2 der Höhe nach auf den Betrag begrenzt, den der Kunde in den zwölf Monaten vor Eintritt des schadensbegründenden Ereignisses für die betroffene Leistung an den Anbieter gezahlt hat; mindestens jedoch auf EUR 5.000, soweit dies im Einzelfall einschlägig und rechtlich zulässig vereinbart werden kann.

(5) Bei Datenverlust haftet der Anbieter – außer in Fällen von Vorsatz, grober Fahrlässigkeit oder zwingender gesetzlicher Haftung – nur für den Aufwand, der bei ordnungsgemäßer und dem Risiko angemessener Datensicherung durch den Kunden für die Wiederherstellung der Daten erforderlich gewesen wäre.

(6) Eine weitergehende Haftung des Anbieters besteht nicht.

## § 14 Schlussbestimmungen

(1) Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.

(2) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist – soweit gesetzlich zulässig – Frankfurt am Main.

(3) Änderungen und Ergänzungen dieser AGB oder des Vertrags bedürfen mindestens der Textform, soweit nicht gesetzlich eine strengere Form vorgeschrieben ist.

(4) Sollten einzelne Bestimmungen dieses Vertrags ganz oder teilweise unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Anstelle der unwirksamen Bestimmung gilt die gesetzliche Regelung.
