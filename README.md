# Handytarif-Vergleich

Private Web-App zum Vergleich von Handytarifen und Handys (frei und mit Vertrag) für Österreich.
Kein Konto, kein Server: Die Daten liegen im Browser (localStorage).

## Starten

```powershell
npm install        # einmalig
npm run dev        # Entwicklung, http://localhost:5173
```

Fertige Version lokal nutzen:

```powershell
npm run build
npm run preview    # http://localhost:4173
```

`dist/index.html` per Doppelklick zu öffnen funktioniert nicht, der Browser blockiert das. Immer über einen Server starten.

## Bedienung

1. **Tarife** und **Geräte** anlegen (Preise inkl. USt., mit Preisstand).
2. Unter **Angebote** kombinieren: nur SIM, Gerät frei gekauft oder Gerät mit Vertrag.
3. **Vergleich** zeigt die Gesamtkosten über den gewählten Zeitraum, das günstigste Angebot zuerst.

## Daten und Backup

- Jede Änderung wird sofort im Browser gespeichert, getrennt pro Browser und Gerät.
- Unter **Daten** ein Backup als JSON herunterladen und wieder laden.
  Regelmäßig sichern: Wenn du die Browserdaten löschst, ist sonst alles weg.
- Sind die gespeicherten Daten unlesbar, startet die App leer und sichert die alten Daten
  im localStorage unter `handytarif-vergleich-defekt`.

## Entwicklung

- `npm test`: Tests (Vitest)
- `npm run build`: prüft auch die Typen
- Logik in `src/domain` (ohne React, mit Tests), Speicherzugriff in `src/storage`, UI in `src/components`.
