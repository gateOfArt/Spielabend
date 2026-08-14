# Technisches Konzept

## Systemstand und Architektur

Spieleabend ist eine einzelne Next.js-16.3.1-Anwendung mit App Router, React 19.2.4 und strengem TypeScript. Implementiert sind Registrierung und atomare Vergabe des Startguthabens sowie Anmeldung, serverseitige Sitzungen, eine geschützte Lobby und Logout. Konten, Sitzungen und Credittransaktionen liegen im Speicher eines Node-Prozesses. Spiele, Leaderboard und REST Route Handlers sind geplant.

Physisch kommuniziert der Browser mit genau einem Next.js-Node-Prozess, der auf seinen eigenen Arbeitsspeicher zugreift. Logisch folgt die Anwendung einer kleinen Schichtenarchitektur:

```text
Server Components ───────────────────────────┐
Client Components ── Server Actions ─────────┤
                                             ▼
                                  Anwendungsservices
                                      ├─ Repositories ── InMemoryStore
                                      └─ RuntimeUnitOfWork ── InMemoryStore
```

| Schicht | Verantwortung |
| --- | --- |
| `src/app/` | Seiten und Server-Action-Grenzen des App Routers. |
| `src/components/` | Wiederverwendbare Darstellung und notwendige Clientinteraktion. |
| `src/domain/` | Frameworkunabhängige Konto-, Registrierungs-, Credit- und Formularverträge. |
| `src/server/services/` | Registrierung, atomare Unit of Work sowie Authentifizierungs- und Sitzungsabläufe. |
| `src/server/repositories/` | Schmale Lese- und Schreibzugriffe auf Konten, Credittransaktionen und Sitzungen. |
| `src/server/store/` | Private Maps, E-Mail- und Sitzungstoken-Indizes sowie geprüfte Zustandswechsel. |
| `src/server/auth/` | Passwort-Hashing und -Vergleich, Sitzungskryptografie, Request-Prüfung und autoritative Authentifizierungshilfe. |

Ausführbare Servermodule sind mit `server-only` markiert. Client Components importieren keine Servermodule. Fachregeln liegen in Domain und Services, nicht in Seiten, Komponenten oder Repositories.

Die Schichtenarchitektur passt zu den synchronen Registrierungs- und späteren Spielabläufen und lässt sich mit isolierten Services und Repositories testen. Eine ereignisgetriebene Architektur würde für den aktuellen Umfang unnötige Zustellungs- und Konsistenzprobleme einführen; direkter gemeinsamer Datenzugriff würde dagegen die serverseitigen Fachregeln verwischen.

## Datenmodell

| Objekt | Inhalt |
| --- | --- |
| `Account` | Interne ID, Anzeigename, normalisierte E-Mail-Adresse, Passwort-Hash, materialisierter Creditstand und Erstellungszeitpunkt. |
| `CreditTransaction` | Interne ID, Konto-ID, vorzeichenbehafteter Betrag, Transaktionsgrund, resultierender Creditstand und Erstellungszeitpunkt. |
| `Session` | Interne ID, Konto-ID, SHA-256-Hash des Sitzungstokens sowie Erstellungs- und Ablaufzeitpunkt. |

Nach erfolgreicher Registrierung besitzt ein Konto genau eine Starttransaktion. `STARTING_CREDITS` ist zentral auf 100 gesetzt, der Grund lautet `STARTING_CREDIT`. Positive Beträge erhöhen und negative Beträge vermindern den Creditstand. Beträge und resultierende Stände müssen sichere Ganzzahlen sein; der Stand darf nicht negativ werden.

IDs werden serverseitig als undurchsichtige UUIDs erzeugt; Zeitpunkte werden als UTC-ISO-Zeichenketten gespeichert. Darstellungsergebnisse enthalten nur die jeweils benötigten Kontoangaben. Passwort-Hashes, rohe Sitzungstokens und interne technische Datensätze werden nicht als Client-DTOs ausgegeben.

Aktuell gelten `Account 1 ── 1 CreditTransaction` und `Account 1 ── 0..* Session`. Die Transaktionsbeziehung erweitert sich erst mit Spielrunden. Das Zielmodell lautet:

```text
Account 1 ── 0..* Session
Account 1 ── 1..* CreditTransaction
Account 1 ── 0..* GameRound
GameRound 1 ── 1 CreditTransaction
```

Sitzung, Spielrunde und Transaktion gehören jeweils genau einem Konto; die Konto-ID wird bei geschützten Vorgängen aus der geprüften Sitzung abgeleitet. Sitzungen sind implementiert. Spielrunden sind geplant und sollen nur nach vollständiger Abrechnung gespeichert werden.

## Laufzeitpersistenz und Atomarität

Der exportierte `InMemoryStore` bleibt bei gewöhnlichen Importen innerhalb desselben Node-Prozesses erhalten. Seine Maps und die Indizes für normalisierte E-Mail-Adressen und gehashte Sitzungstokens sind privat; Lesezugriffe geben Kopien zurück. Bei einem Serverneustart geht der Zustand verloren, und mehrere Prozesse würden getrennte Zustände führen.

`RuntimeUnitOfWork.createAccountWithStartingCredit` bereitet Konto und Starttransaktion vollständig vor. Der Store prüft an der Schreibgrenze erneut E-Mail-Eindeutigkeit, IDs, Verknüpfung, Betrag, Grund und resultierenden Stand. Erst danach wird der vorbereitete Zustand in einem synchronen Schritt übernommen. Bei einem Fehler bleiben Konto, Index, Creditstand und Transaktionen unverändert.

Tests verwenden isolierte Store-Instanzen und injizierbare Abhängigkeiten. Es gibt weder eine Produktions-Reset-Route noch eine öffentliche Operation zum beliebigen Gutschreiben von Credits.

Eine Sitzung wird erst nach erfolgreicher Passwortprüfung gespeichert. Ihr rohes, aus 32 Zufallsbytes erzeugtes Base64URL-Token erscheint ausschließlich als Server-Credential und Cookie-Wert; der Store erhält nur den SHA-256-Hash. Logout entfernt gezielt den Datensatz dieses Token-Hashes. Konten, Credits und Transaktionen werden dabei nicht verändert.

## Schnittstellen

### Registrierungs-Server-Action

`registerAccountAction` akzeptiert die Formularfelder `displayName`, `email` und `password`. Eine strikte Zod-Validierung weist unbekannte oder doppelte Felder zurück, normalisiert die erlaubten Werte und ruft den Registrierungsservice auf. Das Ergebnis ist ein typisierter Formularzustand mit Feldfehlern, einer sicheren allgemeinen Fehlermeldung oder einer Erfolgsmeldung. Eine erfolgreiche Registrierung erzeugt noch keine Sitzung und keinen Login-Redirect.

### Anmeldung und Logout

Die Login-Server-Action akzeptiert ausschließlich `email` und `password`, prüft Request-Origin und Formdaten unabhängig und delegiert an den Authentifizierungsservice. Dieser normalisiert die E-Mail-Adresse, vergleicht das Passwort über Argon2id und verwendet für unbekannte Konten einen Dummy-Hash. Falsche, unbekannte und formal ungültige Zugangsdaten erhalten dieselbe Meldung. Bei Erfolg setzt die Action das acht Stunden gültige Sitzungscookie und leitet zur Lobby weiter.

Die Logout-Server-Action akzeptiert keine fachlichen Formularfelder, prüft Same-Origin und die aktuelle Sitzung erneut, widerruft ausschließlich diese Sitzung, setzt das Cookie abgelaufen und leitet zur Anmeldung weiter. Ein bereits fehlendes oder widerrufenes Token wird idempotent behandelt. Beide Actions geben weder Passwort-Hashes noch Sitzungstokens als Formularzustand aus.

### Geplante REST-API

Die vorgesehene HTTP/JSON-API ergänzt die Server Actions für die Bewertung der API-Kriterien. Sie ist noch nicht implementiert. Sie folgt REST-Konventionen für Ressourcen, Methoden und Statuscodes, ist wegen der serverseitigen Sitzungen jedoch nicht streng zustandslos.

| Methode und Ressource | Eingabe und Autorität | Erfolg |
| --- | --- | --- |
| `GET /api/v1/users/me` | Geprüfte Sitzung; keine auswählbare Konto-ID. | `200` mit sicherer Konto- und Creditdarstellung. |
| `GET /api/v1/leaderboard` | Geprüfte Sitzung; nur öffentliche Ranglistendaten. | `200` mit Rang, Anzeigename, Credits und Markierung des aktuellen Kontos. |
| `GET /api/v1/game-rounds` | Geprüfte Sitzung; Besitzer wird serverseitig bestimmt. | `200` mit den eigenen abgerechneten Runden. |
| `POST /api/v1/game-rounds` | Spielcode, erlaubter Einsatz, Spielinput und Request-ID; Konto, Ergebnis und Creditänderung bestimmt der Server. | `201` für eine neu abgerechnete Runde. |
| `DELETE /api/v1/sessions/current` | Geprüfte aktuelle Sitzung. | `204` ohne Response-Body nach dem Widerruf. |

Route Handlers und Server Actions sollen dieselben Anwendungsservices verwenden, einander jedoch nicht per HTTP aufrufen. Erwartete Fehler verwenden sichere, einheitliche Problemantworten ohne Stacktraces oder Geheimnisse. Geplant sind insbesondere `401` für fehlende Authentifizierung, `403` für fehlende Berechtigung, `404` für nicht sichtbare Ressourcen, `422` für validierte Facheingaben, `429` für begrenzte Anfragen und ein neutraler `500`-Fehler. Konkrete JSON-Schemata und Spielparameter werden zusammen mit den jeweiligen Funktionen festgelegt und getestet.

## Rendering und Clientgrenzen

`/`, `/register` und `/login` sind statisch erzeugbare Server-Component-Seiten. Überschriften, Beschreibung, Labels und die anfängliche Formularstruktur werden als HTML vom Server geliefert. `RegisterForm` und `LoginForm` sind Client Components, weil sie kontrollierte Eingaben, Pending-Zustand und Rückmeldungen verwalten. Ihre erste Darstellung wird serverseitig vorgerendert und anschließend im Browser hydratisiert; die Anwendung ist daher keine reine CSR-Anwendung.

`/lobby` wird wegen der Cookie- und Kontoprüfung dynamisch auf dem Server gerendert. `requireAuthenticatedUser` prüft das Cookie über den Sitzungsservice und lädt das Konto serverseitig; bei fehlender oder ungültiger Sitzung erfolgt eine Weiterleitung zu `/login`. Der Next.js-Proxy prüft vorher lediglich das Vorhandensein des Cookies und dient nur als grobe Navigationshilfe.

`Button`, `Input`, `Card` und `AppNavigation` besitzen keine eigene `"use client"`-Grenze. Sie bleiben serverkompatibel und werden nur innerhalb eines Client-Teilbaums Teil des Browserbundles. `LogoutControl` ist wegen Action-State und Pending-Feedback eine kleine Clientgrenze. Server Components greifen direkt auf serverseitige Services zu und rufen nicht die eigene geplante REST-API auf.

Bei der ersten Anfrage liefert der Server HTML und den React-Server-Component-Payload; nur Client-Teilbäume werden hydratisiert. Spätere Navigation mit dem App Router lädt den benötigten Server-Component-Payload nach und erhält geeigneten Layout- und Clientzustand, ohne die Anwendung zu einer reinen CSR-Anwendung zu machen.

## Sicherheit

Implementiert sind strikte Eingabevalidierung, serverseitige Kontrolle über IDs und Credits, Argon2id-Hashing und -Vergleich, private Store-Strukturen, reduzierte Ergebnisobjekte, sichere Fehlermeldungen und atomare Registrierung. Die Eindeutigkeit der normalisierten E-Mail-Adresse wird an der atomaren Schreibgrenze erneut geprüft.

Sitzungstokens sind kryptografisch zufällig und undurchsichtig; serverseitig wird nur ihr SHA-256-Hash gespeichert. Die feste Ablaufzeit beträgt acht Stunden. Cookies sind `HttpOnly`, `SameSite=Lax`, auf `/` begrenzt und im Produktionsbetrieb `Secure`. Unsichere cookie-authentifizierte Methoden benötigen eine exakt passende Origin; ein vorhandener `Sec-Fetch-Site`-Wert muss `same-origin` sein. Proxy-Weiterleitungen ersetzen keine Prüfung: geschützte Seiten, Actions und Services authentifizieren erneut. Logout widerruft nur die aktuelle Sitzung. Passwort- und Sitzungsdaten sowie interne Fehlerdetails erscheinen nicht in Client Props oder öffentlichen Formularzuständen. Rate Limiting und differenzierte Rollen sind in diesem Slice nicht implementiert.

## Entwicklungsrichtlinien

- App Router und Server Components bleiben der Standard; Clientgrenzen benötigen einen konkreten Interaktionsgrund.
- Jede externe Grenze validiert unbekannte Daten. Browsertypen ersetzen keine Servervalidierung.
- Store-Sammlungen bleiben privat. Repositories und atomare Operationen sind auf konkrete Anwendungsfälle begrenzt.
- Abhängigkeiten werden bewusst festgeschrieben und gemeinsam mit dem Lockfile geprüft.
- Neue Funktionen erhalten positive, negative und relevante Grenz- oder Konkurrenztests, ohne Testendpunkte im Produktivcode.
- Dokumentation kennzeichnet geplante, implementierte und verifizierte Inhalte eindeutig.

## Mögliches verteiltes System

Die aktuelle Anwendung ist kein verteiltes Backend. Für einen realen Mehrinstanzbetrieb wäre folgende Architektur möglich, aber nicht Teil der Implementierung:

```text
Browser → Reverse Proxy → mehrere Next.js-Instanzen
                              ├─ relationale Datenbank
                              └─ gemeinsamer Sitzungsspeicher
```

Eine relationale Datenbank könnte Konten, Credittransaktionen und Spielrunden dauerhaft speichern und zusammengehörige Änderungen mit Constraints und Transaktionen absichern. Ein Dokumentenspeicher wäre für flexible Spielergebnisse geeignet, erschwert aber Eindeutigkeit, Beziehungen und atomare Änderungen über mehrere Datensätze. Deshalb wäre ein relationales Modell die naheliegende spätere Wahl. Ein gemeinsamer Sitzungsspeicher wäre nötig, damit Anmeldung und Logout auf allen Instanzen konsistent funktionieren. Erst gemeinsam genutzte Datenhaltung ermöglicht horizontale Skalierung; ein Load Balancer allein löst die getrennten In-Memory-Zustände nicht.

Konto-Eindeutigkeit, Creditänderungen und Sitzungswiderruf benötigen konsistente Lese- und Schreibvorgänge. Schlägt ein gemeinsamer Speicher vor dem Commit fehl, darf keine Instanz einen lokalen Ersatzstand erzeugen; die Mutation schlägt sicher fehl. Wiederholungen sind nur für idempotente Lesezugriffe oder ausdrücklich gegen Duplikate geschützte Mutationen zulässig. Netzwerkwege erhöhen die Latenz, ändern aber nicht die serverseitige Autorität über Konten, Spielausgänge und Credits.
