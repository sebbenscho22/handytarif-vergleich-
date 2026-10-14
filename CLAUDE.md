# Handytarif-Vergleich (privates Projekt, Österreich)

## Ziel
Kleine Web-App zum Vergleich von Handytarifen und Handys (frei und mit Vertrag) für den privaten Gebrauch. Keine Benutzerkonten, kein Backend. Daten im localStorage, Backup per JSON-Export/Import.

## Stack und Befehle
TypeScript, React, Vite, Vitest. Windows 10, WebStorm, PowerShell.
- npm run dev: Entwicklungsserver
- npm test: Tests
- npm run build: prüft auch die Typen
  Nach jeder Änderung npm test und npm run build ausführen und das Ergebnis melden.

## Regeln
- Alles muss kostenlos bleiben: keine kostenpflichtigen Bibliotheken, Dienste oder Hosting-Angebote.
- Keine neuen Abhängigkeiten ohne vorherige Rückfrage. Kein Router, keine UI-Bibliothek, kein Tailwind, keine State-Bibliothek, kein Zod.
- Tarif- und Preisdaten niemals erfinden. Beispiel- und Testdaten klar als TESTWERT oder PLATZHALTER kennzeichnen.
- Geldbeträge sind ganze Cent (41,05 € = 4105), Preise inkl. USt.
- Logik (Berechnung, Validierung, Vergleich) liegt in src/domain und kennt kein React. Zu jeder Funktion dort gehört ein Test.
- Das Datenmodell steht in src/domain/types.ts. Änderungen daran vorher ansprechen, sie betreffen das Backup-Format (schemaVersion).
- Vorgehen in kleinen Schritten. Pro Schritt kurz sagen, was du änderst und warum. Bei Unklarheit höchstens eine Rückfrage.

## Ton
Deutsch, direkt, ohne Floskeln, kein Lob. Schwache Entscheidungen klar benennen und eine konkrete Empfehlung geben. Der Nutzer hat Grundkenntnisse: kurz und verständlich erklären.

## Git
- Arbeite pro Feature auf einem eigenen Branch (feature/<name>), nie direkt auf main.
- Committe nach jeder abgeschlossenen Teilaufgabe mit einer kurzen, klaren Nachricht auf Deutsch.
- Führe Tests und npm run build vor jedem Commit aus und committe nur, wenn beides fehlerfrei läuft.
- Mergen in main, pushen und Branches löschen mache ich selbst. Tu das nur auf ausdrückliche Anweisung.
- Nutze nie git push --force oder git reset --hard ohne meine ausdrückliche Zustimmung.