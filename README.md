# Handytarif-Vergleich

Private Web-App zum Vergleich von Handytarifen und Handys (frei und mit Vertrag) für Österreich.
Die Daten liegen im Browser (localStorage), optional zusätzlich in Firebase Firestore (siehe unten).

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
Öffentlich ist nur der Code; deine Tarifdaten bleiben in deinem Browser bzw. deinem Firebase-Projekt.

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

## Cloud-Abgleich (Firebase Firestore, optional)

Mit Anmeldung per Google-Konto werden die Daten zusätzlich in Firestore gespeichert und zwischen
Geräten abgeglichen. Ohne Einrichtung läuft die App wie bisher nur mit localStorage.

Kosten: Der Tarif „Spark“ ist kostenlos und braucht keine Kreditkarte. Werden die Gratis-Grenzen
erreicht, sperrt Firebase bis zum nächsten Tag, es entstehen keine Kosten. Kein Upgrade auf „Blaze“ machen.

Einmalig einrichten in der [Firebase-Konsole](https://console.firebase.google.com/):

1. **Projekt anlegen:** „Projekt hinzufügen“, Name frei wählen, Google Analytics ausschalten.
2. **Datenbank:** Build → Firestore Database → Datenbank erstellen → Standort `eur3 (europe-west)`
   → im Produktionsmodus starten.
3. **Regeln:** Firestore Database → Regeln → Inhalt von `firebase/firestore.rules` einfügen → Veröffentlichen.
   Soll nur dein Konto Zugriff haben, dort (nicht im Repository) die im Kommentar beschriebene E-Mail-Bedingung ergänzen.
4. **Anmeldung:** Build → Authentication → Jetzt starten → Anbieter „Google“ aktivieren.
   Unter Einstellungen → Autorisierte Domains `sebbenscho22.github.io` hinzufügen (`localhost` ist schon drin).
5. **Web-App:** Projekteinstellungen → Allgemein → Meine Apps → Web (`</>`) → App registrieren (ohne Hosting).
6. **Schlüssel lokal:** `.env.example` nach `.env.local` kopieren und `apiKey`, `authDomain`, `projectId`
   und `appId` aus der angezeigten Konfiguration eintragen.
7. **Schlüssel für GitHub Pages:** Repository → Settings → Secrets and variables → Actions → Variables:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` anlegen.
   Die Werte sind öffentlich, geschützt wird über Login und die Firestore-Regeln.

Verhalten:

- Jede Änderung wird zuerst lokal gespeichert und etwa eine Sekunde später hochgeladen.
- Beim Öffnen des Tabs werden Änderungen anderer Geräte geholt.
- Haben zwei Geräte unabhängig geändert, fragt die App, welcher Stand gelten soll.

## Entwicklung

- `npm test`: Tests (Vitest)
- `npm run build`: prüft auch die Typen
- Logik in `src/domain` (ohne React, mit Tests), Speicherzugriff in `src/storage`, UI in `src/components`.
