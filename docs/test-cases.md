# Testfälle

**Verifiziert** bezeichnet einen im aktuellen Repository vorhandenen und erfolgreich ausgeführten automatisierten Test. Für bewusst nicht umgesetzte Funktionen werden keine Platzhalter-Testfälle geführt.

Unit Tests prüfen reine Regeln, Komponententests die Browserinteraktion, Integrationstests Server-, Service- und Speichergrenzen und ausgewählte E2E-Tests vollständige Nutzerabläufe im Produktionsserver. Verwendet wird jeweils die niedrigste Ebene, die das Verhalten zuverlässig beweist. Veränderliche Effekte wie IDs, Zeit, Zufall und Fehler werden injiziert; Produktions-Testendpunkte, Test-Bypässe und beliebige Wartezeiten sind ausgeschlossen.

## Implementiert und verifiziert

| Testfall | Ebene | Erwartetes Ergebnis |
| --- | --- | --- |
| Landingpage | E2E | Der Produktionsserver liefert `/` aus und zeigt die Überschrift „Spieleabend“. |
| UI-Basiskomponenten | Komponente | `Button` berücksichtigt Varianten und Disabled-Zustand, `Input` verbindet Label und Fehler, `Card` rendert das gewählte semantische Element. |
| Gültige Registrierung | Integration | Genau ein Konto und eine zugehörige Starttransaktion werden angelegt. |
| Startguthaben | Unit und Integration | Ein Stand von null wird um die zentralen 100 Credits erhöht; Konto und Transaktion verwenden denselben Wert und Grund. |
| Passwort-Hashing | Integration | Argon2id erzeugt einen verifizierbaren Hash; das Klartextpasswort wird nicht gespeichert. |
| Server Action | Integration | Gültige Formdaten liefern eine sichere Erfolgsmeldung ohne Passwort-, E-Mail- oder ID-Daten. |
| Registrierungsformular | Komponente | Pending-Zustand, deaktivierte Felder, Schutz vor Doppelklicks sowie Fehler- und Erfolgsmeldungen funktionieren zugänglich. |
| Registrierung im Browser | E2E | Ein Konto wird einmal erstellt, erhält 100 Credits und bleibt ohne vorgetäuschte Anmeldung auf `/register`. |
| Gültige Anmeldung | Integration | Normalisierte Zugangsdaten werden mit Argon2id geprüft und erzeugen genau eine acht Stunden gültige Sitzung. Persistiert wird nur der Hash des zufälligen Tokens. |
| Login-Server-Action | Integration | Eine erlaubte Anfrage setzt das konfigurierte HttpOnly-Cookie und gibt weder Hash noch Token als Formularzustand aus. |
| Login- und Logout-Steuerung | Komponente | Kontrollierte Felder, Pending-Zustände, deaktivierte Schaltflächen und sichere Inline-Fehler funktionieren zugänglich. |
| Geschützte Lobby | Unit und E2E | Nur eine serverseitig bestätigte Sitzung gewährt Zugriff; Anzeigename und bestehende 100 Credits werden angezeigt. |
| Logout und erneute Anmeldung | Integration und E2E | Logout widerruft die aktuelle Sitzung und leert das Cookie. Eine erneute Anmeldung im selben Serverprozess zeigt dasselbe Konto und Startguthaben. |
| Dice-Spielrunde | Integration, Komponente und E2E | Einsatz 1–100 und Vorhersage 1–6; der Server bestimmt Ergebnis, Gewinnstatus (Treffer = `+5×Einsatz`, sonst `−Einsatz`), genau eine `GameRound` und eine passende `CreditTransaction`. Ein produktionsnaher Browserlauf bestätigt das Ergebnis nach einem Reload. |
| Roulette-Spielrunde | Integration, Komponente und E2E | Einsatz 1–100 und Farbwahl Rot/Schwarz; der Server bestimmt Ergebnis (0–36), zentrale Rot/Schwarz/Grün-Zuordnung, Gewinnstatus (Treffer = `+1×Einsatz`, sonst `−Einsatz`), genau eine `GameRound` und eine passende `CreditTransaction`. Ein produktionsnaher Browserlauf bestätigt das Ergebnis nach einem Reload. |
| Idempotente Spielrunden | Integration | Eine identische Wiederholung derselben `requestId` gibt für Dice und Roulette das ursprüngliche Ergebnis mit `replayed: true` zurück, ohne erneuten Zufallszug oder zweite Mutation. |
| Leaderboard | Integration und E2E | Konten werden nach Creditstand absteigend dargestellt, Gleichstände teilen sich den Rang und werden nach Anzeigename geordnet; das eigene Konto ist markiert und keine Zugangsdaten werden ausgegeben. |
| REST-API | Integration und E2E | `GET /api/v1/users/me`, `GET /api/v1/leaderboard`, `GET`/`POST /api/v1/game-rounds` und `DELETE /api/v1/sessions/current` liefern sichere DTOs, korrekte Erfolgsstatus (200/201/204) und dispatchen Dice- sowie Roulette-Runden über dieselben Anwendungsservices wie die Server Actions. |
| Same-Origin-Schutz der Registrierung | Integration | Die Registrierungs-Server-Action prüft Origin und `Sec-Fetch-Site` wie Anmeldung, Logout, Dice und Roulette, bevor Eingaben verarbeitet werden. |
| Rate-Limiting | Unit und Integration | Ein deterministischer, injizierbarer Fixed-Window-Limiter erlaubt eine konfigurierte Anzahl Versuche pro Zeitfenster, blockiert danach mit korrektem `Retry-After`, setzt pro Schlüssel isoliert zurück und begrenzt die Anzahl gleichzeitig verfolgter Schlüssel. Login, Registrierung sowie Dice- und Roulette-Aktionen (Server Action und REST-API mit gemeinsamem Kontingent) geben bei Überschreitung eine sichere Fehlermeldung beziehungsweise `429` mit `Retry-After` zurück, ohne die geschützte Aktion aufzurufen. |

## Negative und Grenzfälle, implementiert und verifiziert

| Testfall | Ebene | Erwartetes Ergebnis |
| --- | --- | --- |
| Ungültige Eingaben | Integration | Ungültige E-Mail-Adresse, zu kurzes Passwort und ungültiger Anzeigename werden ohne Schreibvorgang abgelehnt. |
| Normalisierte E-Mail-Adresse | Integration und E2E | Groß-/Kleinschreibung und äußere Leerzeichen umgehen die Eindeutigkeit nicht; es bleibt bei einem Konto und einer Starttransaktion. |
| Manipulierte Felder | Integration | Zusätzliche Felder für ID, Credits, Betrag oder Grund werden vor Hashing und Schreiben abgelehnt. |
| Fehler während der Vorbereitung | Integration | Fehler nach dem vorbereiteten Konto- oder Ledger-Schritt hinterlassen weder Konto noch Transaktion. |
| Creditgrenzen | Unit und Integration | Negative resultierende Stände und Werte außerhalb sicherer Ganzzahlen werden verworfen. |
| Gleichzeitige Duplikate | Integration | Von zwei konkurrierenden Registrierungen mit derselben normalisierten E-Mail-Adresse kann höchstens eine schreiben. |
| Sichere Fehlerdarstellung | Komponente und E2E | Feldfehler sind mit dem Eingabefeld verknüpft; Duplikate und allgemeine Fehler geben keine internen Details preis. |
| Ungültige Zugangsdaten | Integration | Falsche, unbekannte und formal ungültige Zugangsdaten liefern dieselbe neutrale Meldung; unbekannte Konten durchlaufen einen Dummy-Passwortvergleich. |
| Ungültige Sitzung | Integration und Unit | Fehlende, falsch geformte, unbekannte oder abgelaufene Tokens werden abgelehnt; abgelaufene Sitzungen werden entfernt. |
| Grober Proxy-Guard | Unit | Ohne Cookie leitet der Proxy zur Anmeldung um. Ein vorhandenes Cookie allein gilt nicht als Authentifizierungsnachweis für die Lobbyseite. |
| Logout-Isolation | Integration | Logout entfernt nur die aktuelle Sitzung; eine zweite Sitzung sowie Konto, Credits und Transaktionen bleiben erhalten. Wiederholter Logout ist sicher. |
| Manipulierter Auth-Request | Integration | Zusätzliche Login- oder Logout-Felder, eine fehlende oder fremde Origin und ein unzulässiger `Sec-Fetch-Site`-Wert werden sicher abgelehnt. |
| Same-Origin-Mutation | Integration | Eine unsichere HTTP-Methode wird nur mit exakt passender Origin, zulässigem Fetch-Site-Nachweis und gültiger aktueller Sitzung autorisiert. |
| Unicode-Zeichenlänge bei Passwort und Anzeigename | Integration und E2E | Passwort und Anzeigename werden serverseitig nach Unicode-Codepoints (`Array.from(...).length`) statt UTF-16-Codeeinheiten geprüft; das Formular begrenzt die Länge nicht mehr clientseitig, damit mehrteilige Zeichen wie Emoji nicht vor der Serverprüfung stillschweigend abgeschnitten werden. Ein 128-Codepoint-Passwort und ein 40-Codepoint-Anzeigename aus Emoji durchlaufen Registrierung und Anmeldung unverändert. |
| Ungültige Dice-/Roulette-Einsätze | Integration | Null, negative, nicht ganzzahlige oder über der Obergrenze liegende Einsätze sowie eine ungültige Roulette-Farbwahl werden ohne Zufallszug und ohne Mutation abgelehnt. |
| Unbezahlbarer Einsatz | Integration | Ein formal gültiger Einsatz über dem aktuellen Creditstand wird ohne Zufallszug abgelehnt. |
| Konfligierende Request-ID | Integration | Dieselbe `requestId` mit abweichendem Einsatz oder abweichender Auswahl wird abgelehnt, ohne den ursprünglichen Zustand zu verändern. |
| Atomarer Schreibfehler bei Dice/Roulette | Integration | Ein simulierter Fehler beim atomaren Schreiben lässt Konto, Saldo, Runden und Idempotenzbindung unverändert. |
| Nicht authentifizierte oder clientseitig autoritäre Spielaktion | Integration | Fehlende Sitzung wird abgelehnt; vom Client mitgesendete Konto-ID, Ergebnis, Auszahlung oder Endstand werden vor jeder Verarbeitung verworfen. |
| Rate-Limit-Überschreitung | Unit und Integration | Nach Erreichen des Schwellwerts liefert die REST-API `429` mit numerischem `Retry-After`; Login, Registrierung, Dice und Roulette geben über die jeweilige Server Action eine sichere Fehlermeldung zurück, ohne die geschützte Aktion aufzurufen. |
| Unbegrenztes Anfrage-Volumen | Integration | Eine `Content-Length` oberhalb des zulässigen Limits wird vor dem vollständigen Einlesen des Anfrage-Bodys abgelehnt. |

Die aktuelle Vitest-Suite ist erfolgreich. Die vollständige Projektprüfung umfasste zusätzlich Lint, strenge Typprüfung, Produktionsbuild und die Playwright-Abläufe für Landingpage, Registrierung, Anmeldung, Schutz, Logout, Dice, Roulette, Rangliste und die REST-API. Tests verwenden isolierte Store-Instanzen und injizierbare Abhängigkeiten; eine Produktions-Reset-Route existiert nicht.

## Bewusst nicht umgesetzt

Eine persönliche Spielhistorie (`/history`), Reveal-Animationen und optionales lokales Audio sind nicht implementiert und haben daher keine Testfälle. Sie gelten erst nach tatsächlicher Umsetzung als verifizierbar; es werden keine Platzhalter-Testfälle für nicht vorhandene Funktionen geführt.

## TDD-Nachweis

Registrierung, Authentifizierung, Dice und Roulette wurden jeweils vor der Produktivimplementierung in einem eigenen RED-Commit festgelegt. Die Tests kompilierten und scheiterten an den erwarteten fachlichen Assertions statt an fehlenden Importen. Der jeweilige GREEN-Slice implementierte das Verhalten und machte dieselben Verträge erfolgreich, ohne die RED-Testfälle nachträglich abzuschwächen. Roulette übernahm dabei die bereits verifizierten Atomaritäts-, Ledger- und Idempotenzinvarianten von Dice und testete nur roulettespezifisches Verhalten erneut.
