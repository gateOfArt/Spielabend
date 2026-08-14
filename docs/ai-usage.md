# KI-Einsatz

KI wurde als Werkzeug für Strukturierung, Entwürfe, Implementierung, Tests und redaktionelle Überarbeitung eingesetzt. Die fachlichen Entscheidungen, der akzeptierte Umfang und die Freigabe von Commits blieben beim Studierenden.

## Projektgrundlage

- **Zweck:** Das vorhandene Next.js-Gerüst an der Repository-Wurzel ordnen und eine arbeitsfähige technische Grundlage schaffen.
- **Betroffener Bereich:** Projektstruktur, App Router, TypeScript, ESLint und projektspezifische Arbeitsanweisungen.
- **Technische Validierung:** Lint, Typprüfung, Produktionsbuild sowie Struktur- und Konfigurationsprüfungen waren erfolgreich.
- **Menschliche Entscheidung:** Der Studierende hinterfragte Größe und Umfang der vorgeschlagenen Foundation und gab erst danach den Commit frei.

## Test- und UI-Grundlage

- **Zweck:** Eine kleine Testinfrastruktur und wiederverwendbare UI-Basiskomponenten aufbauen.
- **Betroffener Bereich:** Vitest, React Testing Library, Playwright, `Button`, `Input`, `Card` und die zugehörigen Styles.
- **Technische Validierung:** Lint, Typprüfung, Komponenten- und Browsertests sowie Produktionsbuild waren erfolgreich; die Abhängigkeiten wurden geprüft.
- **Menschliche Entscheidung:** Der Studierende prüfte den Commitumfang und die gemeldeten Ergebnisse, bevor er die Phase freigab.

## Registrierung: RED-Phase

- **Zweck:** Das erwartete Verhalten von Registrierung und Startguthaben vor der Produktivimplementierung durch ausführbare Tests festlegen.
- **Betroffener Bereich:** Servicevertrag, zentrale Startguthabenregel und Integrationstests für Validierung, Eindeutigkeit, Passwortschutz und Atomarität.
- **Technische Validierung:** Die Tests kompilierten und scheiterten wie beabsichtigt an fachlichen Assertions statt an fehlenden Importen.
- **Menschliche Entscheidung:** Der Studierende verlangte die klare Trennung zwischen RED-Tests und späterer GREEN-Implementierung und gab den Testcommit separat frei.

## Registrierung: GREEN-Phase

- **Zweck:** Die getestete Registrierung mit serverseitiger Validierung, Passwort-Hashing, atomarem Startguthaben und nutzbarer Oberfläche implementieren.
- **Betroffener Bereich:** Domainmodell, In-Memory-Store, Repositories, Unit of Work, Registrierungsservice, Server Action und Registrierungsformular.
- **Technische Validierung:** Lint, strenge Typprüfung, Unit-, Integrations-, Komponenten- und Browsertests sowie Produktionsbuild waren erfolgreich.
- **Menschliche Entscheidung:** Der Studierende prüfte Scope und Validierungsergebnisse und entschied über die Freigabe des Implementierungscommits.

## Dokumentationskonsolidierung

- **Zweck:** Die für die Bewertung relevanten Anforderungen, technischen und gestalterischen Entscheidungen, Testfälle und den KI-Einsatz kompakt zusammenführen.
- **Betroffener Bereich:** Die fünf zentralen Projektdokumente.
- **Technische Validierung:** Die Aussagen wurden mit Code, Tests und Git-Historie abgeglichen. Tests, Produktionsbuild sowie Format- und Whitespace-Prüfung waren erfolgreich.
- **Menschliche Entscheidung:** Der Studierende verwarf umfangreiche Feature-PRDs, Matrix-, Quellen- und Compliance-Dokumentation und verlangte eine kleinere, auf die Bewertung ausgerichtete Struktur.

## Menschliche Steuerung und Prüfung

KI-Vorschläge wurden nicht automatisch übernommen. Der Studierende hinterfragte wiederholt Umfang, Bewertungsrelevanz und Commitgrenzen, prüfte die gemeldeten Validierungsergebnisse und verlangte Korrekturen an unnötiger Dokumentation. Er bestand auf getrennten RED-, GREEN- und Dokumentationsphasen und entschied abschließend über Funktionsumfang, Dokumentationsstruktur und Commitfreigaben.
