# Technisches Konzept

## Systemstand und Architektur

Spieleabend ist eine einzelne Next.js-16.3.1-Anwendung mit App Router, React 19.2.4 und strengem TypeScript. Implementiert und verifiziert sind Registrierung mit atomarer Vergabe des Startguthabens, Anmeldung mit serverseitigen Sitzungen, eine geschützte Lobby, Logout, die beiden serverautoritativen Spiele Dice und Roulette, ein Leaderboard, eine ressourcenorientierte REST-API sowie ein prozesslokaler Rate-Limiter für Authentifizierungs- und Spielaktionen. Konten, Sitzungen, Credittransaktionen und Spielrunden liegen im Speicher eines Node-Prozesses.

Physisch kommuniziert der Browser mit genau einem Next.js-Node-Prozess, der auf seinen eigenen Arbeitsspeicher zugreift. Logisch folgt die Anwendung einer kleinen Schichtenarchitektur:

```text
Server Components ───────────────────────────┐
Client Components ── Server Actions ─────────┤
External clients   ── Route Handlers ────────┤
                                             ▼
                                  Anwendungsservices
                                      ├─ Repositories ── InMemoryStore
                                      └─ RuntimeUnitOfWork ── InMemoryStore
```

| Schicht | Verantwortung |
| --- | --- |
| `src/app/` | Seiten, Server-Action-Grenzen und REST Route Handlers des App Routers. |
| `src/components/` | Wiederverwendbare Darstellung und notwendige Clientinteraktion. |
| `src/domain/` | Frameworkunabhängige Konto-, Registrierungs-, Credit-, Dice-, Roulette- und Formularverträge einschließlich des gemeinsamen `GameRound`-Union-Typs. |
| `src/server/services/` | Registrierung, atomare Unit of Work, Authentifizierungs- und Sitzungsabläufe, Dice-/Roulette-Regeln sowie Lese-Services für aktuelles Konto, Leaderboard und Spielrunden. |
| `src/server/repositories/` | Schmale Lese- und Schreibzugriffe auf Konten, Credittransaktionen, Sitzungen und Spielrunden. |
| `src/server/store/` | Private Maps, E-Mail- und Sitzungstoken-Indizes sowie geprüfte, atomare Zustandswechsel je Spiel. |
| `src/server/auth/` | Passwort-Hashing und -Vergleich, Sitzungskryptografie, Request-Prüfung (Same-Origin, IP-artige Rate-Limit-Schlüssel) und autoritative Authentifizierungshilfe. |
| `src/server/api/` | REST-Route-Handler-Logik und einheitliche Problem-Response-Helfer, getrennt von den Next.js-`route.ts`-Dateien. |
| `src/server/rate-limit/` | Deterministischer, prozesslokaler Fixed-Window-Rate-Limiter und seine Policies. |

Ausführbare Servermodule sind mit `server-only` markiert. Client Components importieren keine Servermodule. Fachregeln liegen in Domain und Services, nicht in Seiten, Komponenten oder Repositories. Dice und Roulette bleiben als eigenständige Regel-Dateien unabhängig lesbar; geteilt werden ausschließlich Infrastruktur (Credit-Policy, atomare Schreibgrenze, Fehlercode-Taxonomie, Round-Union-Typ), keine generische Spiel-Engine.

Die Schichtenarchitektur passt zu den synchronen Registrierungs-, Authentifizierungs- und Spielabläufen und lässt sich mit isolierten Services und Repositories testen. Eine ereignisgetriebene Architektur würde für den aktuellen Umfang unnötige Zustellungs- und Konsistenzprobleme einführen; direkter gemeinsamer Datenzugriff würde dagegen die serverseitigen Fachregeln verwischen.

## Datenmodell

| Objekt | Inhalt |
| --- | --- |
| `Account` | Interne ID, Anzeigename, normalisierte E-Mail-Adresse, Passwort-Hash, materialisierter Creditstand und Erstellungszeitpunkt. |
| `CreditTransaction` | Interne ID, Konto-ID, Runden-ID (oder `null` für die Starttransaktion), vorzeichenbehafteter Betrag, Transaktionsgrund (`STARTING_CREDIT`, `DICE_ROUND` oder `ROULETTE_ROUND`), resultierender Creditstand und Erstellungszeitpunkt. |
| `Session` | Interne ID, Konto-ID, SHA-256-Hash des Sitzungstokens sowie Erstellungs- und Ablaufzeitpunkt. |
| `GameRound` (`DiceGameRound \| RouletteGameRound`) | Interne ID, Konto-ID, Transaktions-ID, client-erzeugte `requestId`, Spielkennung (`DICE`/`ROULETTE`), Einsatz, spielspezifische Eingabe (Vorhersage bzw. Farbwahl), serverseitiges Ergebnis, Gewinnstatus, Nettoänderung, resultierender Endstand und Erstellungszeitpunkt. |

Nach erfolgreicher Registrierung besitzt ein Konto genau eine Starttransaktion. `STARTING_CREDITS` ist zentral auf 100 gesetzt, der Grund lautet `STARTING_CREDIT`. Jede abgerechnete Spielrunde erzeugt genau eine weitere, damit verknüpfte Transaktion mit dem spielspezifischen Grund. Positive Beträge erhöhen und negative Beträge vermindern den Creditstand. Beträge und resultierende Stände müssen sichere Ganzzahlen sein; der Stand darf nicht negativ werden.

IDs werden serverseitig als undurchsichtige UUIDs erzeugt; Zeitpunkte werden als UTC-ISO-Zeichenketten gespeichert. Darstellungsergebnisse enthalten nur die jeweils benötigten Angaben. Passwort-Hashes, rohe oder gehashte Sitzungstokens sowie interne Konto-, Sitzungs-, Runden- und Transaktions-IDs werden nicht als Client-DTOs ausgegeben.

Es gelten `Account 1 ── 0..* Session`, `Account 1 ── 1..* CreditTransaction`, `Account 1 ── 0..* GameRound` und `GameRound 1 ── 1 CreditTransaction`:

```text
Account 1 ── 0..* Session
Account 1 ── 1..* CreditTransaction
Account 1 ── 0..* GameRound
GameRound 1 ── 1 CreditTransaction
```

Sitzung, Spielrunde und Transaktion gehören jeweils genau einem Konto; die Konto-ID wird bei geschützten Vorgängen ausschließlich aus der geprüften Sitzung abgeleitet, niemals aus Clienteingaben. `GameRound` ist als diskriminierte Vereinigung modelliert: `domain/dice.ts` und `domain/roulette.ts` definieren ihre jeweils eigene, unabhängig lesbare Form; `domain/game-round.ts` bündelt beide ausschließlich für die gemeinsame Persistenz- und Lese-Infrastruktur (Store, Repository, Query-Service).

## Laufzeitpersistenz und Atomarität

Der exportierte `InMemoryStore` bleibt bei gewöhnlichen Importen innerhalb desselben Node-Prozesses erhalten. Seine Maps und die Indizes für normalisierte E-Mail-Adressen und gehashte Sitzungstokens sind privat; Lesezugriffe geben Kopien zurück. Bei einem Serverneustart geht der Zustand verloren, und mehrere Prozesse würden getrennte Zustände führen.

`RuntimeUnitOfWork.createAccountWithStartingCredit` bereitet Konto und Starttransaktion vollständig vor. Der Store prüft an der Schreibgrenze erneut E-Mail-Eindeutigkeit, IDs, Verknüpfung, Betrag, Grund und resultierenden Stand. Erst danach wird der vorbereitete Zustand in einem synchronen Schritt übernommen. Bei einem Fehler bleiben Konto, Index, Creditstand und Transaktionen unverändert.

`RuntimeUnitOfWork.settleDiceRound` und `settleRouletteRound` bereiten je eine vollständig abgerechnete `GameRound` und ihre `CreditTransaction` vor und übergeben sie an `commitDiceRound` beziehungsweise `commitRouletteRound`. Beide delegieren an einen gemeinsamen privaten Store-Schritt (`#commitGameRound`), der die Idempotenzbindung aus Konto und `requestId` prüft, den erwarteten gegen den tatsächlichen Kontostand vergleicht (optimistische Nebenläufigkeitskontrolle: weicht der Stand ab, schlägt der Schreibvorgang sicher fehl, statt zu überschreiben) und alle Karten in einem synchronen Schritt ohne `await` aktualisiert. Spielspezifisch bleiben nur die Formprüfung des jeweiligen `GameRound` und der Replay-Vergleich (Einsatz und Vorhersage bei Dice, Einsatz und Farbwahl bei Roulette); die übrige Invariantenprüfung, das Kartenschreiben und die Fehlerbehandlung sind identisch und werden nicht dupliziert.

Tests verwenden isolierte Store-Instanzen und injizierbare Abhängigkeiten, einschließlich einer injizierbaren `RandomSource` für Dice (`rollDie`) und Roulette (`spin`). Es gibt weder eine Produktions-Reset-Route noch eine öffentliche Operation zum beliebigen Gutschreiben von Credits oder Erzwingen eines Spielausgangs.

Eine Sitzung wird erst nach erfolgreicher Passwortprüfung gespeichert. Ihr rohes, aus 32 Zufallsbytes erzeugtes Base64URL-Token erscheint ausschließlich als Server-Credential und Cookie-Wert; der Store erhält nur den SHA-256-Hash. Logout entfernt gezielt den Datensatz dieses Token-Hashes. Konten, Credits und Transaktionen werden dabei nicht verändert.

## Schnittstellen

### Registrierungs-Server-Action

`registerAccountAction` akzeptiert die Formularfelder `displayName`, `email` und `password`. Eine strikte Zod-Validierung weist unbekannte oder doppelte Felder zurück, normalisiert die erlaubten Werte und ruft den Registrierungsservice auf. Das Ergebnis ist ein typisierter Formularzustand mit Feldfehlern, einer sicheren allgemeinen Fehlermeldung oder einer Erfolgsmeldung. Eine erfolgreiche Registrierung erzeugt noch keine Sitzung und keinen Login-Redirect.

### Anmeldung und Logout

Die Login-Server-Action akzeptiert ausschließlich `email` und `password`, prüft Request-Origin und Formdaten unabhängig und delegiert an den Authentifizierungsservice. Dieser normalisiert die E-Mail-Adresse, vergleicht das Passwort über Argon2id und verwendet für unbekannte Konten einen Dummy-Hash. Falsche, unbekannte und formal ungültige Zugangsdaten erhalten dieselbe Meldung. Bei Erfolg setzt die Action das acht Stunden gültige Sitzungscookie und leitet zur Lobby weiter.

Die Logout-Server-Action akzeptiert keine fachlichen Formularfelder, prüft Same-Origin und die aktuelle Sitzung erneut, widerruft ausschließlich diese Sitzung, setzt das Cookie abgelaufen und leitet zur Anmeldung weiter. Ein bereits fehlendes oder widerrufenes Token wird idempotent behandelt. Beide Actions geben weder Passwort-Hashes noch Sitzungstokens als Formularzustand aus.

### Dice- und Roulette-Server-Actions

Beide Actions validieren Formdaten strikt mit Zod (unbekannte Felder werden abgelehnt), prüfen Same-Origin/CSRF-Nachweis und Sitzung unabhängig vom Routen-Proxy erneut, konsumieren danach ein geteiltes, kontobezogenes Rate-Limit-Kontingent für authentifizierte Spielaktionen und delegieren erst dann an den jeweiligen Regel-Service. Der Client liefert ausschließlich Einsatz, Spielinput (Vorhersage bei Dice, Farbwahl bei Roulette) und eine selbst erzeugte `requestId`; Konto, Ergebnis, Auszahlung und Endstand bestimmt ausschließlich der Server. Eine identische `requestId` wird ohne zweiten Zufallszug oder zweite Mutation als sicheres Ergebnis mit `replayed: true` wiedergegeben; ein Konflikt oder Teilfehler verändert den Zustand nicht. Beide Actions revalidieren nach Erfolg die betroffenen Ansichten (`/dice` beziehungsweise `/roulette` und `/lobby`).

### Implementierte REST-API

Die HTTP/JSON-API ergänzt die Server Actions für externe/versionierte Zugriffe und wird über dieselben Anwendungsservices bedient; sie folgt REST-Konventionen für Ressourcen, Methoden und Statuscodes, ist wegen der serverseitigen Sitzungen jedoch nicht streng zustandslos.

| Methode und Ressource | Eingabe und Autorität | Erfolg |
| --- | --- | --- |
| `GET /api/v1/users/me` | Geprüfte Sitzung; keine auswählbare Konto-ID. | `200` mit sicherer Konto- und Creditdarstellung. |
| `GET /api/v1/leaderboard` | Geprüfte Sitzung; nur öffentliche Ranglistendaten. | `200` mit Rang, Anzeigename, Credits und Markierung des aktuellen Kontos. |
| `GET /api/v1/game-rounds` | Geprüfte Sitzung; Besitzer wird serverseitig bestimmt. | `200` mit den eigenen abgerechneten Dice- und Roulette-Runden, neueste zuerst. |
| `POST /api/v1/game-rounds` | Diskriminiert nach `game` (`DICE` oder `ROULETTE`); erlaubter Einsatz, Spielinput und Request-ID; Konto, Ergebnis und Creditänderung bestimmt der Server. | `201` für eine neu abgerechnete Runde, `200` für eine idempotent wiedergegebene. |
| `DELETE /api/v1/sessions/current` | Geprüfte aktuelle Sitzung. | `204` ohne Response-Body nach dem Widerruf. |

Route Handlers und Server Actions verwenden dieselben Anwendungsservices und rufen einander nicht per HTTP auf. Erwartete Fehler verwenden sichere, einheitliche Problemantworten (`application/problem+json`) ohne Stacktraces oder Geheimnisse: `401` für fehlende Authentifizierung, `403` für eine unsichere Mutationsanfrage, `404` für unbekannte API-Pfade, `409` für einen Request-ID-Konflikt, `422` für ungültige Facheingaben, `429` mit numerischem `Retry-After` für ein überschrittenes Rate-Limit und ein neutraler `500`-Fehler für unerwartete Ausnahmen. Anfragen mit einer `Content-Length` oberhalb des zulässigen JSON-Limits werden vor dem vollständigen Einlesen abgelehnt.

## Rendering und Clientgrenzen

`/`, `/register` und `/login` sind statisch erzeugbare Server-Component-Seiten. Überschriften, Beschreibung, Labels und die anfängliche Formularstruktur werden als HTML vom Server geliefert. `RegisterForm` und `LoginForm` sind Client Components, weil sie kontrollierte Eingaben, Pending-Zustand und Rückmeldungen verwalten. Ihre erste Darstellung wird serverseitig vorgerendert und anschließend im Browser hydratisiert; die Anwendung ist daher keine reine CSR-Anwendung.

`/lobby`, `/dice`, `/roulette` und `/leaderboard` werden wegen der Cookie- und Kontoprüfung dynamisch auf dem Server gerendert. `requireAuthenticatedUser` prüft das Cookie über den Sitzungsservice und lädt das Konto serverseitig; bei fehlender oder ungültiger Sitzung erfolgt eine Weiterleitung zu `/login`. Der Next.js-Proxy deckt alle vier geschützten Routen ab, prüft dabei aber weiterhin nur das Vorhandensein des Cookies und dient nur als grobe Navigationshilfe.

`Button`, `Input`, `Card` und `AppNavigation` besitzen keine eigene `"use client"`-Grenze. Sie bleiben serverkompatibel und werden nur innerhalb eines Client-Teilbaums Teil des Browserbundles. `LogoutControl`, `DiceGame` und `RouletteGame` sind wegen Action-State, kontrolliertem Eingabezustand und Pending-Feedback kleine, gezielte Clientgrenzen. Server Components greifen direkt auf serverseitige Services zu und rufen nicht die eigene REST-API auf; die REST-API bedient ausschließlich externe/programmatische Clients.

Bei der ersten Anfrage liefert der Server HTML und den React-Server-Component-Payload; nur Client-Teilbäume werden hydratisiert. Spätere Navigation mit dem App Router lädt den benötigten Server-Component-Payload nach und erhält geeigneten Layout- und Clientzustand, ohne die Anwendung zu einer reinen CSR-Anwendung zu machen.

## Sicherheit

Implementiert sind strikte Eingabevalidierung, serverseitige Kontrolle über IDs, Ergebnisse und Credits, Argon2id-Hashing und -Vergleich, private Store-Strukturen, reduzierte Ergebnisobjekte, sichere Fehlermeldungen und atomare Registrierung sowie Spielabrechnung. Die Eindeutigkeit der normalisierten E-Mail-Adresse wird an der atomaren Schreibgrenze erneut geprüft.

Sitzungstokens sind kryptografisch zufällig und undurchsichtig; serverseitig wird nur ihr SHA-256-Hash gespeichert. Die feste Ablaufzeit beträgt acht Stunden. Cookies sind `HttpOnly`, `SameSite=Lax`, auf `/` begrenzt und im Produktionsbetrieb `Secure`. Unsichere cookie-authentifizierte Methoden (Login, Logout, Registrierung, Dice, Roulette sowie die REST-Mutationen) benötigen eine exakt passende Origin; ein vorhandener `Sec-Fetch-Site`-Wert muss `same-origin` sein. Proxy-Weiterleitungen ersetzen keine Prüfung: geschützte Seiten, Actions und Services authentifizieren erneut. Logout widerruft nur die aktuelle Sitzung. Passwort- und Sitzungsdaten sowie interne Fehlerdetails erscheinen nicht in Client Props, öffentlichen Formularzuständen oder API-DTOs.

Ein deterministischer, prozesslokaler Fixed-Window-Rate-Limiter (`server/rate-limit/`) begrenzt Login- und Registrierungsversuche (Schlüssel aus IP-artigem Kontext und normalisierter E-Mail-Adresse, vor Authentifizierung) sowie authentifizierte Dice-/Roulette-Aktionen (Schlüssel aus Konto-ID, nach Authentifizierung, geteiltes Kontingent über Server Action und REST-API). Die REST-API antwortet bei Überschreitung mit `429` und numerischem `Retry-After`; Server Actions geben eine sichere Fehlermeldung zurück. Der Limiter ist bewusst prozesslokal, verwendet eine begrenzte Anzahl verfolgter Schlüssel und schützt keine Mehrinstanzbereitstellung; eine produktive Mehrinstanzumgebung bräuchte einen geteilten Store wie Redis.

Die REST-API begrenzt eingehende JSON-Bodys über eine `Content-Length`-Vorprüfung, bevor der Body vollständig gelesen wird. `next.config.ts` setzt praxisnahe Security-Header (Content-Security-Policy ohne externe Skript-/Style-Quellen, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, restriktive `Permissions-Policy`). Differenzierte Rollen sind in diesem Umfang nicht implementiert.

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
