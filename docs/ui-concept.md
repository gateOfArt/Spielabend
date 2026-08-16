# UI-Konzept

## Seitenübersicht

| Route | Zweck | Stand |
| --- | --- | --- |
| `/` | Öffentliche Einstiegsseite mit Projektname, kurzer Beschreibung und Links zu Registrierung und Anmeldung. | Verifiziert |
| `/register` | Registrierung mit Anzeigename, E-Mail-Adresse, Passwort, sichtbaren Fehlern und Pending-Zustand. | Verifiziert |
| `/login` | Öffentliche Anmeldung mit neutraler Fehlermeldung bei ungültigen Zugangsdaten. | Verifiziert |
| `/lobby` | Geschützter Einstieg mit Anzeigename, prominentem Creditstand, Navigation zu allen Bereichen und Logout. | Verifiziert |
| `/dice` | Geschützte Dice-Spielseite mit serverautoritativer Abrechnung. | Verifiziert |
| `/roulette` | Geschützte Roulette-Spielseite; verwendet dieselbe Credit- und Atomaritätsarchitektur wie Dice mit eigenständiger Spielregel. | Verifiziert |
| `/leaderboard` | Geschützte Rangliste nach Credits mit Markierung des eigenen Kontos. | Verifiziert |
| `/history` | Persönliche Übersicht der eigenen abgerechneten Spielrunden. | Nachrangig; bewusst nicht umgesetzt |

Nur tatsächlich vorhandene Seiten werden verlinkt. Eine zusätzliche gleichartige `/games`-Übersichtsseite ist nicht vorgesehen; die Lobby übernimmt diese Rolle bereits mit direkten Links zu Dice, Roulette und Rangliste.

## Aktueller Komponentenbaum

```text
RootLayout [Server]
├── Home [Server] → Links zu Registrierung und Anmeldung
├── RegisterPage [Server]
│   ├── Einführungsbereich
│   └── Card [serverkompatibel]
│       └── RegisterForm [Client]
│           ├── Input: Anzeigename
│           ├── Input: E-Mail-Adresse
│           ├── Input: Passwort
│           └── Button: Absenden
├── LoginPage [Server]
│   └── Card [serverkompatibel]
│       └── LoginForm [Client]
│           ├── Input: E-Mail-Adresse
│           ├── Input: Passwort
│           └── Button: Absenden
└── geschützte Bereiche [Server; AppNavigation + Logout auf jeder Seite]
    ├── AppNavigation [serverkompatibel]
    │   ├── Linkliste: Lobby, Dice, Roulette, Rangliste
    │   ├── Guthaben-Chip (aria-live)
    │   └── LogoutControl [Client]
    ├── LobbyPage
    │   ├── Card [serverkompatibel] → Anzeigename und Credits
    │   └── Bereichsliste → Links zu Dice, Roulette, Rangliste
    ├── DicePage
    │   └── Card [serverkompatibel]
    │       └── DiceGame [Client] → Einsatz, Vorhersage, Ergebnis
    ├── RoulettePage
    │   └── Card [serverkompatibel]
    │       └── RouletteGame [Client] → Einsatz, Farbwahl, Ergebnis
    └── LeaderboardPage
        └── Card [serverkompatibel] → Ranglistentabelle
```

`/history` bleibt nachrangig und ist bewusst nicht umgesetzt; es existiert kein Platzhalter-Knoten dafür.

## Wiederverwendbare Komponenten und Props

| Komponente | Props und Verhalten |
| --- | --- |
| `Button` | `ButtonProps` erweitert native Buttonattribute. Unterstützt `primary`, `secondary` und `outlined`; der Standardtyp ist `button`. |
| `Input` | `InputProps` verlangt `id`, `name` und ein sichtbares `label`, unterstützt kontrollierte Eingaben und verknüpft Fehler über ARIA-Attribute. |
| `Card` | `CardProps` rendert Inhalt wahlweise als `div`, `section` oder `article`. |
| `RegisterForm` | `RegisterFormProps` erlaubt eine typisierte Action; lokale React-Zustände kontrollieren die drei editierbaren Felder. |
| `LoginForm` | `LoginFormProps` erlaubt eine typisierte Action; lokale React-Zustände kontrollieren E-Mail-Adresse und Passwort. |
| `LogoutControl` | `LogoutControlProps` erlaubt eine typisierte Action und zeigt einen deaktivierten Pending-Zustand sowie sichere Fehler. |
| `AppNavigation` | `AppNavigationProps` enthält Anzeigename und Creditstand; Linkliste, Guthaben-Chip und Logout werden semantisch zusammengefasst. |
| `DiceGame` | `DiceGameProps` erlaubt eine typisierte Action sowie Regelgrenzen (Einsatz, Augenzahl) als Props; lokaler Zustand kontrolliert Einsatz und Vorhersage. |
| `RouletteGame` | `RouletteGameProps` erlaubt eine typisierte Action sowie Regelgrenzen (Einsatz) als Props; lokaler Zustand kontrolliert Einsatz und Farbwahl. |

Kontrollierter Zustand dient nur der Eingabe und Rückmeldung. Konto-ID, Guthaben, Spielergebnis und Transaktionsdaten sind weder editierbare Props noch autoritativer Browserzustand; Ergebnis, Auszahlung und Endstand kommen ausschließlich aus der Serverantwort. Während einer laufenden Übertragung sind Felder und Submit-Button deaktiviert; ein weiterer Klick löst keine zweite Action aus.

## Server- und Clientgrenzen

Seiten, Layout, Navigation und UI-Basiskomponenten benötigen keine Browserhooks und bleiben Server Components beziehungsweise serverkompatibel. Genau fünf Komponenten sind `"use client"`: `RegisterForm`, `LoginForm` und `LogoutControl` für `useState`/`useActionState`, Ereignisse und Pending-Feedback, sowie `DiceGame` und `RouletteGame` für kontrollierten Einsatz/Auswahl, Pending-Zustand und die Anzeige des Serverergebnisses. Jede dieser Clientgrenzen ist durch eine echte Interaktion begründet; keine weitere Komponente ist als Client Component markiert. Die darin verwendeten `Input`- und `Button`-Instanzen werden Teil des jeweiligen Client-Teilbaums, ohne selbst generell als Client Components markiert zu sein. Clientcode importiert keine `server-only`-Module; Server Actions bilden die Mutationsgrenzen und prüfen Sitzung, Origin und (bei Dice/Roulette) das Rate-Limit unabhängig vom Routen-Proxy erneut.

Lobby, Dice-, Roulette- und Leaderboard-Seite lesen Sitzung, Anzeigename, Credits und Ranglisten- beziehungsweise Regeldaten serverseitig über die jeweiligen Query- oder Regel-Services. Der Proxy prüft bei Navigation zu `/lobby`, `/dice`, `/roulette` und `/leaderboard` nur grob das Vorhandensein des Sitzungscookies; jede Seite und jede Mutation validiert die Sitzung serverseitig erneut. Server Components rufen dafür nicht die eigene REST-API auf, sondern dieselben Anwendungsservices, die auch die Route Handler verwenden.

## Grid, Flexbox und Gestaltung

- Der globale `body` verwendet ein vertikales Flex-Layout.
- Landingpage, Registrierungs-, Anmelde-, Lobby-, Dice-, Roulette- und Leaderboard-Seite sowie Formulare, Eingabefelder und die Dice-/Roulette-Steuerung (Einsatz/Vorhersage beziehungsweise Einsatz/Farbwahl nebeneinander) verwenden CSS Grid für Zentrierung, Abstände und mehrspaltige Anordnung.
- Die Lobby ordnet ihre Bereichslinks (Dice, Roulette, Rangliste) in einem responsiven `auto-fit`-Grid mit Mindestbreite an, das sich auf schmalen Ansichten automatisch auf eine Spalte reduziert.
- Navigation, Linkliste, Konto-/Guthaben-Bereich, Logout-Zeile und die Roulette-Farbwahl verwenden Flexbox und brechen bei schmalen Ansichten passend um.
- Komponentenstile liegen in CSS Modules. Globale Regeln in `globals.css` enthalten Grundlayout, Reset und gemeinsame Designtokens (Farben, Radien, Schatten).

Alle implementierten Seiten folgen einer einheitlichen, zurückhaltenden Gestaltungsrichtung („Modern Night Casino / Premium Arcade“): ein einzelner warmer Gold-Akzent auf neutralem Hell- oder Dunkelgrund, abhängig von der Systemeinstellung des Betriebssystems. Der aktuelle Creditstand erscheint auf jeder geschützten Seite als auffälliger Chip in der Navigation. Die selbst gehostete Schriftart (`next/font`, keine externe Laufzeitabhängigkeit) gilt einheitlich für die gesamte Anwendung.

## Semantik und Zustände

Formularfelder besitzen sichtbare Labels, native Eingabeelemente und zugeordnete Fehlermeldungen. Allgemeine Fehler werden als `alert`, Erfolg als `status` ausgegeben. Die Navigationslinks und die Lobby-Bereichslinks sind als semantische Listen (`ul`/`li`) ausgezeichnet. Fokus- und Disabled-Zustände sind sichtbar (globaler `:focus-visible`-Fallback zusätzlich zu komponentenspezifischen Ringen); Rückmeldungen werden nicht nur durch Farbe vermittelt: Dice- und Roulette-Ergebnisse zeigen zusätzlich zur Farbe die Begriffe „Treffer“/„Daneben“, das Vorzeichen der Nettoänderung und den konkreten Wurf beziehungsweise die konkrete Farbe als Text; die eigene Ranglistenzeile trägt zusätzlich zur Hervorhebung ein sichtbares „Du“-Abzeichen.

Anmeldung, Logout, Registrierung, Dice und Roulette zeigen sichere Inline-Fehler (einschließlich einer sicheren Meldung bei überschrittenem Rate-Limit) und deaktivieren ihre Felder und Schaltflächen während der Übertragung, um Doppel-Submits zu verhindern. Für Bereiche ohne echte asynchrone Wartezeit (serverseitig synchrone In-Memory-Lesevorgänge) werden keine zusätzlichen Loading-Zustände vorgetäuscht; ein Leerzustand für Leaderboard oder Ergebnisanzeige wird nicht behauptet, da beide erst nach vorhandenen Daten sichtbar sind. Geschützte Navigation ersetzt keine serverseitige Authentifizierung.

## Wireframes

Im Repository befinden sich derzeit keine echten Wireframe-Bilder, Fotos oder Scans. Deshalb wird kein Wireframe-Nachweis behauptet. Reale, vom Studierenden erstellte Wireframes können später mit Route und Ansichtsgröße ergänzt werden.
