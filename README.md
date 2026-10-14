# Handytarif-Vergleich

Private Web-App zum Vergleich von Handytarifen und Handys (frei und mit Vertrag) für Österreich.
Die Daten liegen im Browser (localStorage), optional zusätzlich in Supabase (siehe unten).

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

## Online (GitHub Pages)

Jeder Push auf `master` (oder `main`) wird getestet, gebaut und veröffentlicht
(`.github/workflows/pages.yml`). Kostenlos, solange das Repository öffentlich ist.
Öffentlich ist nur der Code; deine Tarifdaten bleiben in deinem Browser bzw. deinem Supabase-Projekt.

Einmalig im Repository einstellen: **Settings → Pages → Source: GitHub Actions**.

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

## Cloud-Abgleich (Supabase, optional)

Mit Anmeldung per E-Mail-Link werden die Daten zusätzlich in Supabase gespeichert und zwischen
Geräten abgeglichen. Ohne Einrichtung läuft die App wie bisher nur mit localStorage.

Einmalig einrichten:

1. **Tabelle anlegen:** Supabase-Dashboard → SQL Editor → Inhalt von `supabase/schema.sql` ausführen.
2. **Login-Weiterleitung:** Authentication → URL Configuration
   - Site URL: `https://sebbenscho22.github.io/handytarif-vergleich-/`
   - Redirect URLs: dieselbe Adresse und `http://localhost:5173/`
3. **Schlüssel lokal:** `.env.example` nach `.env.local` kopieren und URL sowie Publishable Key
   (Project Settings → API Keys) eintragen. Nie den Secret- bzw. service_role-Key verwenden.
4. **Schlüssel für GitHub Pages:** Repository → Settings → Secrets and variables → Actions → Variables:
   `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` anlegen. Beide Werte sind öffentlich,
   geschützt wird über Login und Row Level Security.
5. **Fremde Anmeldungen sperren:** Nach deiner ersten Anmeldung unter Authentication → Sign In / Providers
   „Allow new users to sign up“ ausschalten. Sonst kann sich jeder ein Konto in deinem Projekt anlegen.

Verhalten:

- Jede Änderung wird zuerst lokal gespeichert und etwa eine Sekunde später hochgeladen.
- Beim Öffnen des Tabs werden Änderungen anderer Geräte geholt.
- Haben zwei Geräte unabhängig geändert, fragt die App, welcher Stand gelten soll.
- Supabase pausiert Gratis-Projekte nach längerer Inaktivität. Im Dashboard wieder starten, die Daten bleiben erhalten.

## Entwicklung

- `npm test`: Tests (Vitest)
- `npm run build`: prüft auch die Typen
- Logik in `src/domain` (ohne React, mit Tests), Speicherzugriff in `src/storage`, UI in `src/components`.
