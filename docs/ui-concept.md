# UI-Konzept

## Seitenübersicht

| Route | Zweck | Stand |
| --- | --- | --- |
| `/` | Öffentliche Einstiegsseite mit Projektname, kurzer Beschreibung und Links zu Registrierung und Anmeldung. | Verifiziert |
| `/register` | Registrierung mit Anzeigename, E-Mail-Adresse, Passwort, sichtbaren Fehlern und Pending-Zustand. | Verifiziert |
| `/login` | Öffentliche Anmeldung mit neutraler Fehlermeldung bei ungültigen Zugangsdaten. | Verifiziert |
| `/lobby` | Geschützter Einstieg mit Anzeigename, Creditstand, Navigation und Logout; Spielauswahl folgt später. | Verifiziert als minimale Authentifizierungsoberfläche |
| `/games/dice` | Geschützte Seite für eine vollständige Spielrunde. | Geplant; Regeln und Bedienelemente noch offen |
| `/leaderboard` | Geschützte Rangliste nach Credits. | Geplant |
| `/games/roulette` | Zweite Spielseite zum Nachweis gemeinsam genutzter Spiel- und Creditstrukturen. | Zielumfang nach abgeschlossenem Kern |
| `/history` | Persönliche Übersicht der eigenen abgerechneten Spielrunden. | Nachrangig; noch nicht aktiviert |

Nur tatsächlich vorhandene Seiten werden verlinkt. Die Lobby soll später die Spielübersicht übernehmen; eine zusätzliche gleichartige `/games`-Übersichtsseite ist nicht vorgesehen.

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
└── LobbyPage [Server; geschützt]
    ├── AppNavigation [serverkompatibel]
    │   ├── Link zur Lobby
    │   └── LogoutControl [Client]
    └── Card [serverkompatibel] → Anzeigename und Credits
```

Der geplante Ausbau bleibt bis zur jeweiligen Implementierung ausdrücklich ein Entwurf:

```text
RootLayout [Server]
└── geschützte Bereiche [Server]
    ├── LobbyPage → Spielübersicht
    ├── DicePage → DiceGamePanel [Client]
    ├── LeaderboardPage → LeaderboardTable [Server]
    ├── RoulettePage → RouletteGamePanel [Client; Zielumfang]
    └── HistoryPage → HistoryList [Server; nachrangig]
```

## Wiederverwendbare Komponenten und Props

| Komponente | Props und Verhalten |
| --- | --- |
| `Button` | `ButtonProps` erweitert native Buttonattribute. Unterstützt `primary`, `secondary` und `outlined`; der Standardtyp ist `button`. |
| `Input` | `InputProps` verlangt `id`, `name` und ein sichtbares `label`, unterstützt kontrollierte Eingaben und verknüpft Fehler über ARIA-Attribute. |
| `Card` | `CardProps` rendert Inhalt wahlweise als `div`, `section` oder `article`. |
| `RegisterForm` | `RegisterFormProps` erlaubt eine typisierte Action; lokale React-Zustände kontrollieren die drei editierbaren Felder. |
| `LoginForm` | `LoginFormProps` erlaubt eine typisierte Action; lokale React-Zustände kontrollieren E-Mail-Adresse und Passwort. |
| `LogoutControl` | `LogoutControlProps` erlaubt eine typisierte Action und zeigt einen deaktivierten Pending-Zustand sowie sichere Fehler. |
| `AppNavigation` | `AppNavigationProps` enthält ausschließlich den anzuzeigenden Namen; Navigation und Logout werden semantisch zusammengefasst. |

Kontrollierter Zustand dient nur der Eingabe und Rückmeldung. Konto-ID, Guthaben und Transaktionsdaten sind weder editierbare Props noch autoritativer Browserzustand. Während einer laufenden Übertragung sind Felder und Submit-Button deaktiviert; ein weiterer Klick löst keine zweite Action aus.

## Server- und Clientgrenzen

Seiten, Layout, Navigation und UI-Basiskomponenten benötigen keine Browserhooks und bleiben Server Components beziehungsweise serverkompatibel. `RegisterForm` und `LoginForm` bilden kleine Clientgrenzen für `useState`, `useActionState`, Ereignisse und Pending-Feedback. `LogoutControl` kapselt nur den interaktiven Logout-Zustand. Die darin verwendeten `Input`- und `Button`-Instanzen werden Teil des jeweiligen Client-Teilbaums, ohne selbst generell als Client Components markiert zu sein. Clientcode importiert keine Servermodule; Server Actions bilden die Mutationsgrenzen.

Die Lobby liest Sitzung, Anzeigename und Credits serverseitig. Der Proxy ist nur eine grobe Cookie-Prüfung; die Seite prüft die Sitzung erneut. Zukünftige Spielpanels können für ihre Interaktion Client Components sein. Navigation, Überschriften, Creditanzeige und Leaderboard bleiben serverseitig, solange sie keine eigene Browserinteraktion benötigen.

## Grid, Flexbox und Gestaltung

- Der globale `body` verwendet ein vertikales Flex-Layout.
- Landingpage, Registrierungs-, Anmelde- und Lobbyseite sowie Formulare und Eingabefelder verwenden CSS Grid für Zentrierung, Abstände und die einspaltige Struktur.
- Linkgruppen, Navigation und Logout-Zeile verwenden Flexbox und brechen bei schmalen Ansichten passend um. Ein mehrspaltiges Lobby-Karten-Grid ist erst mit den Spielen geplant.
- Komponentenstile liegen in CSS Modules. Globale Regeln enthalten Grundlayout, Reset und gemeinsame Designtokens.

Registrierung, Anmeldung und die minimale Lobby sind funktional, responsiv und zugänglich, aber noch nicht visuell final ausgearbeitet.

## Semantik und Zustände

Formularfelder besitzen sichtbare Labels, native Eingabeelemente und zugeordnete Fehlermeldungen. Allgemeine Fehler werden als `alert`, Erfolg als `status` ausgegeben. Fokus- und Disabled-Zustände sind sichtbar; Rückmeldungen werden nicht nur durch Farbe vermittelt.

Anmeldung und Logout zeigen sichere Inline-Fehler und deaktivieren ihre Schaltflächen während der Übertragung. Weitere Loading-, Fehler-, Leer- und Erfolgszustände werden mit der jeweiligen Funktion konkretisiert. Geschützte Navigation ersetzt keine serverseitige Authentifizierung.

## Wireframes

Im Repository befinden sich derzeit keine echten Wireframe-Bilder, Fotos oder Scans. Deshalb wird kein Wireframe-Nachweis behauptet. Reale, vom Studierenden erstellte Wireframes können später mit Route und Ansichtsgröße ergänzt werden.
