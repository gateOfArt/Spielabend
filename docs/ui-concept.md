# UI-Konzept

## Seitenübersicht

| Route | Zweck | Stand |
| --- | --- | --- |
| `/` | Öffentliche Einstiegsseite mit Projektname und kurzer Beschreibung. | Verifiziert; noch ohne Navigation |
| `/register` | Registrierung mit Anzeigename, E-Mail-Adresse, Passwort, sichtbaren Fehlern und Pending-Zustand. | Verifiziert |
| `/login` | Öffentliche Anmeldung mit neutraler Fehlermeldung bei ungültigen Zugangsdaten. | Geplant |
| `/lobby` | Geschützter Einstieg mit Creditstand, Navigation und verfügbaren Spielen. | Geplant |
| `/games/dice` | Geschützte Seite für eine vollständige Spielrunde. | Geplant; Regeln und Bedienelemente noch offen |
| `/leaderboard` | Geschützte Rangliste nach Credits. | Geplant |
| `/games/roulette` | Zweite Spielseite zum Nachweis gemeinsam genutzter Spiel- und Creditstrukturen. | Zielumfang nach abgeschlossenem Kern |
| `/history` | Persönliche Übersicht der eigenen abgerechneten Spielrunden. | Nachrangig; noch nicht aktiviert |

Nur tatsächlich vorhandene Seiten werden verlinkt. Die Lobby soll später die Spielübersicht übernehmen; eine zusätzliche gleichartige `/games`-Übersichtsseite ist nicht vorgesehen.

## Aktueller Komponentenbaum

```text
RootLayout [Server]
├── Home [Server]
└── RegisterPage [Server]
    ├── Einführungsbereich
    └── Card [serverkompatibel]
        └── RegisterForm [Client]
            ├── Input: Anzeigename
            ├── Input: E-Mail-Adresse
            ├── Input: Passwort
            └── Button: Absenden
```

Der geplante Ausbau bleibt bis zur jeweiligen Implementierung ausdrücklich ein Entwurf:

```text
RootLayout [Server]
├── LoginPage [Server] → LoginForm [Client]
└── ProtectedLayout [Server]
    ├── AppNavigation [Server] → LogoutControl [Client]
    ├── LobbyPage [Server] → CreditDisplay + Card[]
    ├── DicePage [Server] → DiceGamePanel [Client]
    ├── LeaderboardPage [Server] → LeaderboardTable [Server]
    ├── RoulettePage [Server] → RouletteGamePanel [Client; Zielumfang]
    └── HistoryPage [Server] → HistoryList [Server; nachrangig]
```

## Wiederverwendbare Komponenten und Props

| Komponente | Props und Verhalten |
| --- | --- |
| `Button` | `ButtonProps` erweitert native Buttonattribute. Unterstützt `primary`, `secondary` und `outlined`; der Standardtyp ist `button`. |
| `Input` | `InputProps` verlangt `id`, `name` und ein sichtbares `label`, unterstützt kontrollierte Eingaben und verknüpft Fehler über ARIA-Attribute. |
| `Card` | `CardProps` rendert Inhalt wahlweise als `div`, `section` oder `article`. |
| `RegisterForm` | `RegisterFormProps` erlaubt eine typisierte Action; lokale React-Zustände kontrollieren die drei editierbaren Felder. |

Kontrollierter Zustand dient nur der Eingabe und Rückmeldung. Konto-ID, Guthaben und Transaktionsdaten sind weder editierbare Props noch autoritativer Browserzustand. Während einer laufenden Übertragung sind Felder und Submit-Button deaktiviert; ein weiterer Klick löst keine zweite Action aus.

## Server- und Clientgrenzen

Seiten, Layout und UI-Basiskomponenten benötigen keine Browserhooks und bleiben Server Components beziehungsweise serverkompatibel. `RegisterForm` bildet die kleinste Clientgrenze für `useState`, `useActionState`, Ereignisse und Pending-Feedback. Die darin verwendeten `Input`- und `Button`-Instanzen werden Teil dieses Client-Teilbaums, ohne selbst generell als Client Components markiert zu sein. Clientcode importiert keine Servermodule; die Server Action bildet die Mutationsgrenze.

Zukünftige Login- und Spielpanels können für ihre Interaktion Client Components sein. Navigation, Überschriften, Creditanzeige und Leaderboard sollen serverseitig bleiben, solange sie keine eigene Browserinteraktion benötigen.

## Grid, Flexbox und Gestaltung

- Der globale `body` verwendet ein vertikales Flex-Layout.
- Landingpage, Registrierungsseite, Formular und Eingabefelder verwenden CSS Grid für Zentrierung, Abstände und die einspaltige Struktur.
- Geplante Navigations- und Aktionszeilen eignen sich für Flexbox; die Lobby für ein responsives Karten-Grid. Diese Elemente sind noch nicht implementiert.
- Komponentenstile liegen in CSS Modules. Globale Regeln enthalten Grundlayout, Reset und gemeinsame Designtokens.

Die Registrierungsoberfläche ist funktional, responsiv und zugänglich, aber noch nicht visuell final ausgearbeitet.

## Semantik und Zustände

Formularfelder besitzen sichtbare Labels, native Eingabeelemente und zugeordnete Fehlermeldungen. Allgemeine Fehler werden als `alert`, Erfolg als `status` ausgegeben. Fokus- und Disabled-Zustände sind sichtbar; Rückmeldungen werden nicht nur durch Farbe vermittelt.

Loading-, Fehler-, Leer- und Erfolgszustände zukünftiger Seiten werden mit der jeweiligen Funktion konkretisiert. Geschützte Navigation ersetzt keine serverseitige Authentifizierung.

## Wireframes

Im Repository befinden sich derzeit keine echten Wireframe-Bilder, Fotos oder Scans. Deshalb wird kein Wireframe-Nachweis behauptet. Reale, vom Studierenden erstellte Wireframes können später mit Route und Ansichtsgröße ergänzt werden.
