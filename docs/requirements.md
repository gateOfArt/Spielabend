# Anforderungen

Dieses Dokument beschreibt den verbindlichen Projektumfang und seinen aktuellen Stand:

- **Geplant:** fachlich vorgesehen, aber noch nicht umgesetzt.
- **Implementiert:** im aktuellen Code vorhanden.
- **Verifiziert:** implementiert und durch automatisierte Tests nachgewiesen.

## Funktionale Anforderungen

| Anforderung | Akzeptanzkriterium | Stand |
| --- | --- | --- |
| Registrierung | Eine Person kann mit Anzeigename, E-Mail-Adresse und Passwort genau ein Konto anlegen. Ungültige Eingaben und bereits verwendete normalisierte E-Mail-Adressen werden sicher abgelehnt. | Verifiziert |
| Anmeldung | Gültige Zugangsdaten erzeugen eine Sitzung; ungültige Zugangsdaten nicht. | Geplant |
| Virtuelle Credits | Neue Konten erhalten genau einmal das zentrale Startguthaben. Der aktuelle Stand ist sichtbar und wird durch Spielrunden konsistent verändert. | Startguthaben verifiziert; Anzeige und Spieländerungen geplant |
| Spielseite | Mindestens eine geschützte Spielseite führt eine vollständige, serverseitig entschiedene Runde aus und zeigt Ergebnis sowie neuen Creditstand. | Dice als Kernspiel geplant; Regeln noch nicht festgelegt |
| Leaderboard | Eine erreichbare Rangliste sortiert Konten nachvollziehbar nach ihrem Creditstand und enthält keine privaten Zugangsdaten. | Geplant |
| Laufzeitdaten | Konto-, Sitzungs-, Credit- und Spieldaten bleiben im selben laufenden Serverprozess verfügbar. | Konten und Starttransaktionen implementiert; Gesamtablauf geplant |
| Navigation | Alle implementierten Hauptbereiche sind über echte Links oder Schaltflächen erreichbar. | Geplant; `/` und `/register` sind noch nicht verknüpft |
| Logout | Die aktuelle Sitzung wird serverseitig ungültig. Konto-, Credit- und Spieldaten bleiben für eine spätere Anmeldung im selben Prozess erhalten. | Geplant |

## Registrierung und Startguthaben

- Anzeigenamen werden getrimmt, nach Unicode NFC normalisiert und müssen 2 bis 40 Zeichen lang sein. Steuerzeichen sind unzulässig.
- E-Mail-Adressen werden getrimmt, kleingeschrieben, auf ihr Format geprüft und auf 254 Zeichen begrenzt. Die normalisierte Adresse ist eindeutig.
- Passwörter werden nicht automatisch getrimmt oder normalisiert, müssen 12 bis 128 Zeichen lang sein und werden mit Argon2id gehasht. Klartextpasswörter werden nicht gespeichert oder ausgegeben.
- Der Client liefert ausschließlich Anzeigename, E-Mail-Adresse und Passwort. Konto-ID, Rolle, Guthaben und Transaktionsdaten werden serverseitig bestimmt.
- Das zentrale Startguthaben beträgt 100 Credits. Es erzeugt genau eine positive Transaktion mit dem Grund `STARTING_CREDIT`.
- Positive Transaktionen erhöhen, negative Transaktionen vermindern den Creditstand. Alle Werte sind sichere Ganzzahlen; ein Stand unter null ist unzulässig.
- Konto, eindeutige normalisierte E-Mail-Adresse, Creditstand und Starttransaktion werden vollständig oder gar nicht geschrieben.
- Feldfehler und erwartete allgemeine Fehler werden verständlich ausgegeben. Passwort-Hash, interne IDs und technische Fehlerdetails bleiben serverintern.

## Technische und gestalterische Vorgaben

- Das Projekt verwendet Next.js 16.3.1 mit App Router, React 19.2.4 und strengem TypeScript.
- Server Components sind der Standard. Client Components werden nur für notwendige Browserinteraktion eingesetzt und erhalten minimale, serialisierbare Props.
- Externe Eingaben werden serverseitig validiert. Identität, Berechtigung, Spielausgang und Credits bleiben serverautoritativ.
- Die eigene Oberfläche verwendet Server Actions. Zusätzlich ist eine ressourcenorientierte HTTP/JSON-API mit sinnvollen GET-, POST- und DELETE-Operationen vorgesehen. Derzeit ist nur die Registrierungs-Server-Action implementiert.
- Der aktuelle Datenspeicher gilt nur für einen einzelnen laufenden Node-Prozess. Eine reale Datenbank und Mehrinstanzbetrieb sind nicht implementiert.
- Wiederverwendbare Komponenten verwenden typisierte Props. Interaktive Formulare können kontrollierten Zustand verwenden, ohne Browserdaten zur fachlichen Wahrheit zu machen.
- Komponentenstile liegen in CSS Modules. Grid und Flexbox werden passend zur jeweiligen Anordnung eingesetzt.
- Positive, negative und Grenzfälle werden auf der niedrigsten geeigneten Testebene geprüft. Produktions-Testendpunkte und Sicherheitsumgehungen sind ausgeschlossen.

## Projektumfang

Implementiert sind die technische Grundlage, die Testinfrastruktur, die UI-Basiskomponenten sowie Registrierung und atomare Vergabe des Startguthabens. Zum geplanten Kern gehören Anmeldung, Sitzungen, geschützte Navigation, Dice als vollständiges Kernspiel, Creditdarstellung, Leaderboard, REST-API und Logout.

Roulette ist nach abgeschlossenem Kern der vorgesehene Zielumfang, um die Wiederverwendung der Spiel- und Creditarchitektur zu zeigen. Eine persönliche Spielhistorie bleibt nachrangig. Animationen, lokales Audio und dekorative Effekte werden erst nach technischer und dokumentarischer Fertigstellung erwogen.

OAuth, E-Mail-Verifikation, Passwort-Reset, Mehrfaktor-Authentifizierung, Echtgeld, Zahlungen, eine reale Datenbank, WebSockets, Multiplayer, Chat, ein drittes Spiel, ein Adminbereich und eine Microservice-Implementierung gehören nicht zum aktuellen Umfang.

## Bewertungsrelevante Nachweise

Für die Konzeptbewertung sind Anforderungen, Wireframes, Komponentenbaum, Datenmodell, Architektur, Schnittstellen, Entwicklungsrichtlinien, Testfälle, Rendering und das Konzept eines verteilten Systems nachzuweisen. Für die Implementierung sind insbesondere Unit Tests, Agents und Skills, Codequalität, Server-/Client-Rendering, API, Server Actions, Funktionalität, Struktur, typisierte Props mit kontrolliertem Zustand sowie Grid und Flexbox relevant.

Die Konzeptbewertung umfasst 40 Prozent, die Implementierungsbewertung 60 Prozent. Beide Bereiche werden jeweils anhand ihrer eigenen Kriterien bewertet; daraus wird hier keine Note abgeleitet.

## Formale Rahmenbedingungen

- Das Projekt ist eine Einzelarbeit und soll mindestens zehn inhaltlich nachvollziehbare Entwicklungscommits enthalten.
- Repository und PDF sollen nach der Matrikelnummer benannt werden; Code und PDF sind über das private GitHub-Repository sowie Moodle abzugeben.
- Für den Repository-Zugriff ist `wdski25b` mit der Kontaktadresse `wdski25b@jonas-heuer.com` vorgesehen.
- Als Abgabefrist ist der 16.08.2026 um 23:59 Uhr festgehalten.
