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
- Arbeite pro Feature auf einem eigenen Branch (feature/<name>), nie direkt auf master.
- Committe nach jeder abgeschlossenen Teilaufgabe mit einer kurzen, klaren Nachricht auf Deutsch.
- Führe Tests und npm run build vor jedem Commit aus und committe nur, wenn beides fehlerfrei läuft.
- Mergen in master, pushen und Branches löschen mache ich selbst. Tu das nur auf ausdrückliche Anweisung.
- Nutze nie git push --force oder git reset --hard ohne meine ausdrückliche Zustimmung.

## Branches und Testen
- Verwende immer aussagekräftige Branch-Namen im Format feature/<kurze-beschreibung> oder fix/<kurze-beschreibung>, z. B. feature/gesamtkosten-berechnung. Keine Namen wie "test", "neu" oder "branch2".
- Prüfe vor jeder Änderung mit git branch, dass wir auf dem Feature-Branch sind und nicht auf master.
- Ports: 5173 für master, 5174 und höher für Feature-Branches.
- Starte den Dev-Server immer mit festem Port und --strictPort, z. B. npm run dev -- --port 5174 --strictPort.
- Ist der Port belegt und der Start bricht ab, brich die Aufgabe nicht ab und frag nicht nach. Probiere den nächsten Port (+1, +2, ...), wieder mit --strictPort, bis einer frei ist. Sag mir danach klar: "Info: Port 5174 war belegt, ich habe 5176 genommen."
- Lies die tatsächliche Adresse aus der Ausgabe des Servers und nenne genau diese. Rate den Port nie.
- Beende jede Aufgabe mit einem kurzen Block "Zum Testen":
  - Branch-Name
  - Ordner (voller Pfad, auch wenn es ein Worktree ist)
  - Der verwendete Startbefehl mit Port
  - Die Adresse, unter der ich testen kann, z. B. http://localhost:5174/
  - Was ich konkret testen soll (2 bis 4 Punkte)
- Zeige im Entwicklungsmodus unten rechts ein kleines Badge mit dem aktuellen Branch-Namen an (nicht im Produktions-Build).