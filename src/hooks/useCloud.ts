import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { startStand, syncAktion, type SyncStand } from '../domain/sync';
import type { AppDaten } from '../domain/types';
import { cloudClient, cloudLaden, cloudSpeichern, type CloudClient, type CloudStand } from '../storage/cloud';
import { browserSpeicher, syncStandLaden, syncStandSpeichern } from '../storage/speicher';

export type CloudStatus =
    | { art: 'laeuft' }
    | { art: 'synchron' }
    | { art: 'konflikt'; cloud: CloudStand }
    | { art: 'fehler'; text: string };

// Wartezeit nach einer Änderung, damit schnelle Änderungen gesammelt hochgeladen werden.
const HOCHLADEN_NACH_MS = 1000;

const client = cloudClient();

// Steuert den Abgleich. Alle Cloud-Zugriffe laufen nacheinander, damit sich Speichervorgänge nicht überholen.
function erstelleAbgleich(client: CloudClient, startDaten: AppDaten, meldeStatus: (s: CloudStatus) => void) {
    let daten = startDaten;
    let ersetzen: (daten: AppDaten) => void = () => {};
    let stand: SyncStand = syncStandLaden(browserSpeicher()) ?? startStand(startDaten);
    let userId: string | null = null;
    let kette = Promise.resolve();
    let timer: ReturnType<typeof setTimeout> | undefined;

    function setStand(neu: SyncStand) {
        stand = neu;
        syncStandSpeichern(browserSpeicher(), neu);
    }

    // Aufgaben einer abgemeldeten Sitzung werden übersprungen.
    function einreihen(aufgabe: (id: string) => Promise<void>) {
        const id = userId;
        if (!id) return;
        kette = kette
            .then(() => (id === userId ? aufgabe(id) : undefined))
            .catch((e: unknown) => meldeStatus({ art: 'fehler', text: e instanceof Error ? e.message : String(e) }));
    }

    function uebernehmen(cloud: CloudStand) {
        // Vorab eintragen, damit datenGeaendert die Cloud-Daten nicht als lokale Änderung zählt.
        daten = cloud.daten;
        ersetzen(cloud.daten);
        setStand({ basis: cloud.revision, lokalGeaendert: false });
        meldeStatus({ art: 'synchron' });
    }

    async function abgleichen(id: string): Promise<void> {
        meldeStatus({ art: 'laeuft' });
        const r = await cloudLaden(client, id);
        if (!r.ok) return meldeStatus({ art: 'fehler', text: r.fehler.join(' ') });
        const cloud = r.wert;
        switch (syncAktion(stand, cloud?.revision ?? null)) {
            case 'nichts':
                return meldeStatus({ art: 'synchron' });
            case 'herunterladen':
                return uebernehmen(cloud!);
            case 'hochladen':
                return hochladen(id, cloud?.revision ?? null);
            case 'konflikt':
                return meldeStatus({ art: 'konflikt', cloud: cloud! });
        }
    }

    async function hochladen(id: string, erwartet: string | null): Promise<void> {
        meldeStatus({ art: 'laeuft' });
        const gesendet = daten;
        const r = await cloudSpeichern(client, id, gesendet, erwartet);
        if (r.ok) {
            // Wurde während des Hochladens weiter geändert, ist schon der nächste Upload geplant.
            setStand({ basis: r.revision, lokalGeaendert: daten !== gesendet });
            return meldeStatus({ art: 'synchron' });
        }
        // Ein anderes Gerät war schneller: neu abgleichen, das führt zu Herunterladen oder Konflikt.
        if (r.konflikt) return abgleichen(id);
        meldeStatus({ art: 'fehler', text: r.fehler });
    }

    return {
        verbinde(neu: (daten: AppDaten) => void) {
            ersetzen = neu;
        },
        angemeldet(id: string | null) {
            userId = id;
            einreihen(abgleichen);
        },
        pruefen() {
            einreihen(abgleichen);
        },
        datenGeaendert(neu: AppDaten) {
            if (neu === daten) return; // erster Aufruf oder Daten aus der Cloud
            daten = neu;
            setStand({ ...stand, lokalGeaendert: true });
            if (!userId) return;
            meldeStatus({ art: 'laeuft' });
            clearTimeout(timer);
            // basis erst beim Ausführen lesen, ein vorheriger Upload kann sie geändert haben.
            timer = setTimeout(() => einreihen((id) => hochladen(id, stand.basis)), HOCHLADEN_NACH_MS);
        },
        cloudUebernehmen(cloud: CloudStand) {
            einreihen(async () => uebernehmen(cloud));
        },
        lokalHochladen(cloud: CloudStand) {
            einreihen((id) => hochladen(id, cloud.revision));
        },
    };
}

// Gleicht die Daten mit Firestore ab, sobald jemand angemeldet ist.
// Ohne Konfiguration (keine Umgebungsvariablen) ist verfuegbar false und es passiert nichts.
export function useCloud(daten: AppDaten, ersetzen: (daten: AppDaten) => void) {
    const [nutzer, setNutzer] = useState<User | null>(null);
    const [status, setStatus] = useState<CloudStatus>({ art: 'laeuft' });
    const [abgleich] = useState(() => client && erstelleAbgleich(client, daten, setStatus));

    useEffect(() => {
        abgleich?.verbinde(ersetzen);
    }, [abgleich, ersetzen]);

    useEffect(() => {
        abgleich?.datenGeaendert(daten);
    }, [abgleich, daten]);

    useEffect(() => {
        if (!client) return;
        // Liefert sofort die gespeicherte Anmeldung und danach jede An- und Abmeldung.
        return onAuthStateChanged(client.auth, setNutzer);
    }, []);

    const userId = nutzer?.uid ?? null;

    useEffect(() => {
        if (!abgleich) return;
        abgleich.angemeldet(userId);
        if (!userId) return;
        // Beim Zurückkehren in den Tab und nach Verbindungsabbruch Änderungen anderer Geräte holen.
        const pruefen = () => {
            if (document.visibilityState === 'visible') abgleich.pruefen();
        };
        document.addEventListener('visibilitychange', pruefen);
        window.addEventListener('online', pruefen);
        return () => {
            document.removeEventListener('visibilitychange', pruefen);
            window.removeEventListener('online', pruefen);
        };
    }, [abgleich, userId]);

    return {
        verfuegbar: client !== null,
        email: nutzer?.email ?? undefined,
        // null = nicht angemeldet
        status: userId ? status : null,
        // Öffnet das Google-Anmeldefenster. Liefert eine Fehlermeldung oder undefined bei Erfolg.
        async anmelden(): Promise<string | undefined> {
            if (!client) return 'Cloud ist nicht eingerichtet.';
            try {
                await signInWithPopup(client.auth, new GoogleAuthProvider());
                return undefined;
            } catch (e) {
                return e instanceof Error ? e.message : String(e);
            }
        },
        async abmelden() {
            if (client) await signOut(client.auth);
        },
        cloudUebernehmen: (cloud: CloudStand) => abgleich?.cloudUebernehmen(cloud),
        lokalHochladen: (cloud: CloudStand) => abgleich?.lokalHochladen(cloud),
    };
}

export type CloudAktionen = ReturnType<typeof useCloud>;
