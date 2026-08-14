# KI-Einsatz

KI wurde als Werkzeug für Strukturierung, Entwürfe, Implementierungsunterstützung, Tests und redaktionelle Überarbeitung eingesetzt. Der Studierende gab Anforderungen und Umsetzungsweise vor, prüfte Code und Diffs, führte die fachliche und technische Bewertung durch und entschied über Korrekturen und Commits.

## Projektgrundlage

- **Zweck:** Das vorhandene Next.js-Gerüst an der Repository-Wurzel ordnen und eine arbeitsfähige technische Grundlage schaffen.
- **Betroffener Bereich:** Projektstruktur, App Router, TypeScript, ESLint und projektspezifische Arbeitsanweisungen.
- **Technische Validierung:** Lint, Typprüfung, Produktionsbuild sowie Struktur- und Konfigurationsprüfungen waren erfolgreich.
- **Menschliche Entscheidung:** Der Studierende legte Zielstruktur und zulässigen Umfang fest, prüfte Code, Konfiguration und Diff und verlangte eine kleinere Foundation, bevor er den Commit freigab.

## Test- und UI-Grundlage

- **Zweck:** Eine kleine Testinfrastruktur und wiederverwendbare UI-Basiskomponenten aufbauen.
- **Betroffener Bereich:** Vitest, React Testing Library, Playwright, `Button`, `Input`, `Card` und die zugehörigen Styles.
- **Technische Validierung:** Lint, Typprüfung, Komponenten- und Browsertests sowie Produktionsbuild waren erfolgreich; die Abhängigkeiten wurden geprüft.
- **Menschliche Entscheidung:** Der Studierende bestimmte den begrenzten Umfang der Test- und UI-Basis, prüfte Implementierung, Tests und Commit-Diff und entschied anschließend über die Freigabe.

## Registrierung: RED-Phase

- **Zweck:** Das erwartete Verhalten von Registrierung und Startguthaben vor der Produktivimplementierung durch ausführbare Tests festlegen.
- **Betroffener Bereich:** Servicevertrag, zentrale Startguthabenregel und Integrationstests für Validierung, Eindeutigkeit, Passwortschutz und Atomarität.
- **Technische Validierung:** Die Tests kompilierten und scheiterten wie beabsichtigt an fachlichen Assertions statt an fehlenden Importen.
- **Menschliche Entscheidung:** Der Studierende gab das erwartete Verhalten und die TDD-Vorgehensweise vor, prüfte Testumfang und RED-Fehlerbild und verlangte einen eigenständigen Testcommit vor der Produktivimplementierung.

## Registrierung: GREEN-Phase

- **Zweck:** Die getestete Registrierung mit serverseitiger Validierung, Passwort-Hashing, atomarem Startguthaben und nutzbarer Oberfläche implementieren.
- **Betroffener Bereich:** Domainmodell, In-Memory-Store, Repositories, Unit of Work, Registrierungsservice, Server Action und Registrierungsformular.
- **Technische Validierung:** Lint, strenge Typprüfung, Unit-, Integrations-, Komponenten- und Browsertests sowie Produktionsbuild waren erfolgreich.
- **Menschliche Entscheidung:** Der Studierende definierte die serverseitige Umsetzung und ihre Grenzen, prüfte den erzeugten Code, die Testergebnisse und den Diff und gab notwendige Korrekturen sowie die endgültige Commitfreigabe vor.

## Dokumentationskonsolidierung

- **Zweck:** Die für die Bewertung relevanten Anforderungen, technischen und gestalterischen Entscheidungen, Testfälle und den KI-Einsatz kompakt zusammenführen.
- **Betroffener Bereich:** Die fünf zentralen Projektdokumente.
- **Technische Validierung:** Die Aussagen wurden mit Code, Tests und Git-Historie abgeglichen. Tests, Produktionsbuild sowie Format- und Whitespace-Prüfung waren erfolgreich.
- **Menschliche Entscheidung:** Der Studierende prüfte Inhalt und Bewertungsrelevanz der Dokumentation, verwarf umfangreiche Feature-PRDs, Matrix-, Quellen- und Compliance-Dokumentation und definierte stattdessen die kompakte, dozentenorientierte Struktur.

## Authentifizierung und Sitzungen

- **Zweck:** Den Authentifizierungsvertrag zuerst als ausführbare RED-Tests festlegen und anschließend Anmeldung, serverseitige Sitzungen, Zugriffsschutz und Logout implementieren.
- **Betroffener Bereich:** Passwortprüfung, Sitzungsspeicher und -cookies, Same-Origin-Prüfung, Login- und Logout-Actions, geschützte Lobby, Navigation und Tests.
- **Technische Validierung:** Die RED-Tests kompilierten und scheiterten zunächst an fachlichen Assertions. Nach der Implementierung waren Lint, Typprüfung, Unit-, Integrations-, Komponenten- und Browsertests sowie Produktionsbuild erfolgreich; ein produktionsnaher Ablauf bestätigte Registrierung, Login, Logout, Zugriffsschutz und erneuten Login im selben Serverprozess.
- **Menschliche Entscheidung:** Der Studierende legte Sicherheitsregeln, Schichtengrenzen und den gewünschten Ablauf fest, prüfte Vertrag, Implementierung und Nachweise und verlangte getrennte RED- und GREEN-Phasen sowie logisch abgegrenzte Server-, UI- und Dokumentationscommits.

## Menschliche Steuerung und Prüfung

KI-Vorschläge wurden nicht automatisch übernommen. Der Studierende formulierte Anforderungen und konkrete Umsetzungsvorgaben, überprüfte den erzeugten Code und die Diffs, bewertete Test- und Buildnachweise und leitete daraus Korrekturen ab. Er reduzierte übergroße oder bewertungsferne Vorschläge, bestimmte die Trennung der Entwicklungsphasen und Commitgrenzen und traf die abschließenden Entscheidungen über Funktionsumfang, Architektur, Dokumentationsstruktur und Freigabe.
