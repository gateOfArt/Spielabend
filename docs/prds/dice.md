# Dice: Regel- und Settlementvertrag

**Status:** Regelentwurf für menschliche Freigabe. Dieser Vertrag darf erst nach ausdrücklicher Zustimmung in GREEN implementiert werden.

## Spielregel

- Die spielende Person setzt eine ganze Anzahl Credits zwischen 1 und 100 einschließlich und sagt genau eine Augenzahl zwischen 1 und 6 voraus.
- Der Server erzeugt anschließend genau ein Ergebnis zwischen 1 und 6.
- **Gewinn:** Vorhersage und Ergebnis sind gleich. Der eine Netto-Ledgerbetrag beträgt `+5 × Einsatz`.
- **Verlust:** Vorhersage und Ergebnis sind verschieden. Der eine Netto-Ledgerbetrag beträgt `−Einsatz`.
- Der Einsatz wird nicht zusätzlich abgezogen oder gutgeschrieben. Die Transaktion enthält ausschließlich den Nettoeffekt der vollständig abgerechneten Runde.

Beispiele bei einem Anfangsstand von 100 Credits:

- Einsatz 10, Vorhersage 4, Ergebnis 4: Gewinn, Nettoänderung `+50`, Endstand 150.
- Einsatz 10, Vorhersage 4, Ergebnis 2: Verlust, Nettoänderung `−10`, Endstand 90.

## Eingabe und Validierung

Die fachliche Clienteingabe besteht ausschließlich aus:

- `requestId`: clientseitig erzeugte UUID v4;
- `bet`: ganzzahliger Einsatz von 1 bis 100;
- `prediction`: ganzzahlige Vorhersage von 1 bis 6.

Die Servergrenze lehnt unbekannte, fehlende oder doppelte Felder ab. Konto-ID, Session-ID, Würfelergebnis, Gewinnstatus, Auszahlung, Nettoänderung, Endstand, Round-ID, Transaction-ID und Zeitstempel sind keine vertrauenswürdigen Clientwerte. Der Server leitet das Konto aus der erneut geprüften Sitzung ab.

Eine formal gültige Wette über dem aktuellen Creditstand wird mit `INSUFFICIENT_CREDITS` abgelehnt. Null, negative, nicht ganzzahlige oder über 100 liegende Einsätze sowie ungültige Vorhersagen oder Request-IDs ergeben `INVALID_INPUT`. Fehlende oder ungültige Authentifizierung ergibt `AUTHENTICATION_REQUIRED`. Unerwartete Infrastruktur- oder Atomaritätsfehler ergeben die neutrale Antwort `ROUND_FAILED`.

## Settlement und Atomarität

Eine erfolgreiche neue Anfrage erzeugt atomar:

1. genau eine vollständig abgerechnete `GameRound` für das serverseitig bestimmte Konto;
2. genau eine damit verknüpfte `CreditTransaction` mit dem Grund `DICE_ROUND` und dem vorzeichenbehafteten Nettobetrag;
3. den entsprechend aktualisierten materialisierten Creditstand;
4. die Idempotenzbindung aus Konto und `requestId`.

Round und Transaktion referenzieren einander eindeutig und gehören demselben Konto. `transaction.resultingBalance`, `round.finalCredits` und der materialisierte Kontostand sind identisch. Sichere Ganzzahlen und ein nicht negativer Endstand bleiben gemeinsame Creditinvarianten. Scheitert irgendein Teil, bleiben Konto, Balance, Ledger, Runden und Idempotenzbindung vollständig unverändert.

## Idempotenz

`requestId` ist pro Konto eindeutig. Eine identische Wiederholung einer bereits erfolgreich abgerechneten Anfrage gibt das ursprüngliche sichere Ergebnis mit `replayed: true` zurück und erzeugt weder einen neuen Würfelwurf noch eine zweite Mutation. Derselbe Schlüssel mit einem abweichenden Einsatz oder einer abweichenden Vorhersage ergibt `REQUEST_CONFLICT` und verändert nichts. Fehlgeschlagene, nicht geschriebene Anfragen reservieren den Schlüssel nicht.

## Zufall und sichere Antwort

Die Produktion erzeugt den Wurf ausschließlich serverseitig. Der Anwendungsservice erhält dafür eine schmale synchrone `RandomSource` mit einem Ergebnis von 1 bis 6; Tests injizieren feste Ergebnisse. Ein Wert außerhalb dieses Bereichs gilt als `ROUND_FAILED` und darf keinen Zustand verändern.

Die erfolgreiche Clientantwort enthält nur:

- `requestId`, `bet` und `prediction`;
- `result` und `outcome` (`win` oder `loss`);
- `netDelta` und `finalCredits`;
- `replayed` zur Kennzeichnung einer idempotenten Wiederholung.

Interne Konto-, Session-, Round- und Transaction-IDs werden nicht ausgegeben. Fehlerantworten enthalten nur einen stabilen sicheren Fehlercode und keine internen Details.

## Geschützte Mutation und UI-Verhalten

Die spätere Server Action muss Formdaten strikt validieren, Same-Origin/CSRF-Nachweis prüfen und die Authentifizierung unabhängig vom Route Guard erneut verifizieren. Versteckte Felder und Browserzustand sind keine Autorität. Während einer laufenden Anfrage sind Einsatz, Vorhersage und Submit-Button deaktiviert; erneutes Absenden darf keine zweite Anfrage auslösen. Es werden in dieser RED-Phase weder Produktivservice noch UI, Route Handler oder Testendpunkt implementiert.

## RED-Nachweis

Ausgeführt wurde:

```text
npx vitest run tests/integration/dice-round.contract.test.ts --reporter=verbose
```

Vitest führte die Datei erfolgreich aus: 17 Prüfungen schlugen wie beabsichtigt auf Assertions fehl, eine Prüfung bestand. Die beobachteten Abweichungen waren:

- Mindesteinsatz: erwartet wurden Einsatz 1, Verlust, `-1` und Endstand 99; der Seam lieferte Einsatz 0, Gewinn, `0` und Endstand 0.
- Höchsteinsatz: erwartet wurden Einsatz 100, Ergebnis 6, `+500` und Endstand 600; der Seam lieferte Einsatz 0, Ergebnis 1, `0` und Endstand 0.
- Einsatz 0, negativer Einsatz, nicht ganzzahliger Einsatz und Einsatz über 100: jeweils wurde `{ ok: false, code: "INVALID_INPUT" }` erwartet; der Seam lieferte Erfolg.
- Einsatz über dem Kontostand: `{ ok: false, code: "INSUFFICIENT_CREDITS" }` wurde erwartet; der Seam lieferte Erfolg.
- Erzwungener Gewinn: erwartet wurden Anfragewerte, Ergebnis 4, `+50` und Endstand 150; der Seam lieferte seine Nullwerte.
- Erzwungener Verlust: erwartet wurden Anfragewerte, Ergebnis 2, `-10` und Endstand 90; der Seam lieferte seine Nullwerte als Gewinn.
- Persistenzbeziehung: eine Round und eine Transaktion wurden erwartet; beide Collections blieben leer (`expected [] to have a length of 1 but got +0`).
- Korrigierte Wiederholung nach abgelehnter Anfrage: zunächst wurde `INVALID_INPUT` erwartet; der Seam lieferte Erfolg.
- Identische Wiederholung: für die zweite Antwort wurde `replayed: true` erwartet; geliefert wurde `false`.
- Konfligierende Wiederverwendung der Request-ID: `REQUEST_CONFLICT` wurde erwartet; der Seam lieferte Erfolg.
- Simulierter atomarer Schreibfehler: `ROUND_FAILED` wurde erwartet; der Seam lieferte Erfolg.
- Nicht authentifizierter Aufruf: `AUTHENTICATION_REQUIRED` wurde erwartet; der Seam lieferte Erfolg.
- Vom Client ergänzte Autoritäts- und Settlementfelder: `INVALID_INPUT` wurde erwartet; der Seam lieferte Erfolg.
- Ungültiges Ergebnis der `RandomSource`: `ROUND_FAILED` wurde erwartet; der Seam lieferte Erfolg.

Die Prüfung der sicheren DTO-Schlüssel bestand bereits, weil der reine Contract-Seam keine geheimen oder internen Felder zurückgibt. Damit beruht RED nicht auf einem Import- oder Kompilierungsfehler. Bis zur ausdrücklichen menschlichen Bestätigung der Spielregel ist der Vertrag nicht für GREEN freigegeben.
