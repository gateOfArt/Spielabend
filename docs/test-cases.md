# Testfälle

**Verifiziert** bezeichnet einen im aktuellen Repository vorhandenen und erfolgreich ausgeführten automatisierten Test. **Geplant** bezeichnet Testfälle für noch nicht implementierte Funktionen.

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

Die aktuelle Vitest-Suite ist erfolgreich. Die vollständige Projektprüfung umfasste zusätzlich Lint, strenge Typprüfung, Produktionsbuild und die Playwright-Abläufe für Landingpage, Registrierung sowie Anmeldung, Schutz und Logout. Tests verwenden isolierte Store-Instanzen und injizierbare Abhängigkeiten; eine Produktions-Reset-Route existiert nicht.

## Geplante Testfälle

| Bereich | Positive Fälle | Negative und Grenzfälle |
| --- | --- | --- |
| Dice-Spielrunde | Eine gültige Runde erzeugt ein serverseitiges Ergebnis, eine Runde, eine passende Credittransaktion und den korrekten neuen Stand. | Ungültige oder unbezahlbare Einsätze, manipulierte Ergebnisse und konkurrierende Ausgaben erzeugen keinen Teilzustand oder negativen Stand. Konkrete Fälle folgen aus den noch festzulegenden Spielregeln. |
| Leaderboard | Konten werden nachvollziehbar nach Credits dargestellt. | Zugangsdaten und Sitzungsinformationen fehlen; Gleichstände werden reproduzierbar behandelt. |
| REST-API | GET-, POST- und DELETE-Ressourcen liefern sichere DTOs und passende Erfolgsstatus. | Ungültige Eingaben, fehlende Authentifizierung oder Berechtigung und interne Fehler liefern sichere Fehler ohne Teilwrites. |
| Roulette-Zielumfang | Rot/Schwarz-Runden verwenden dieselben Credit- und Atomaritätsregeln wie Dice, behalten aber eigenständige Spielregeln. | Null, ungültige Auswahl, manipulierte Ergebnisse und doppelte Requests werden nach dem später festgelegten Vertrag sicher behandelt. |

Geplante Fälle gelten erst nach Implementierung und erfolgreicher Ausführung als verifiziert.

## TDD-Nachweis

Registrierung und Authentifizierung wurden jeweils vor der Produktivimplementierung in einem eigenen RED-Commit festgelegt. Die Tests kompilierten und scheiterten an den erwarteten fachlichen Assertions. Der jeweilige GREEN-Slice implementierte das Verhalten und machte dieselben Verträge erfolgreich. Weitere vertikale Slices sollen diese Trennung beibehalten.
