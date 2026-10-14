import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { startStand, syncAktion, type SyncStand } from '../domain/sync';
import type { AppDaten } from '../domain/types';
import { cloudClient, cloudLaden, cloudSpeichern, type CloudStand } from '../storage/cloud';
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
function erstelleAbgleich(client: SupabaseClient, startDaten: AppDaten, meldeStatus: (s: CloudStatus) => void) {
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
        setStand({ basis: cloud.geaendertAm, lokalGeaendert: false });
        meldeStatus({ art: 'synchron' });
    }

    async function abgleichen(id: string): Promise<void> {
        meldeStatus({ art: 'laeuft' });
        const r = await cloudLaden(client);
        if (!r.ok) return meldeStatus({ art: 'fehler', text: r.fehler.join(' ') });
        const cloud = r.wert;
        switch (syncAktion(stand, cloud?.geaendertAm ?? null)) {
            case 'nichts':
                return meldeStatus({ art: 'synchron' });
            case 'herunterladen':
                return uebernehmen(cloud!);
            case 'hochladen':
                return hochladen(id, cloud?.geaendertAm ?? null);
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
            setStand({ basis: r.geaendertAm, lokalGeaendert: daten !== gesendet });
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
            einreihen((id) => hochladen(id, cloud.geaendertAm));
        },
    };
}

// Gleicht die Daten mit Supabase ab, sobald jemand angemeldet ist.
// Ohne Konfiguration (keine Umgebungsvariablen) ist verfuegbar false und es passiert nichts.
export function useCloud(daten: AppDaten, ersetzen: (daten: AppDaten) => void) {
    const [session, setSession] = useState<Session | null>(null);
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
        // Liefert sofort die gespeicherte Sitzung und danach jede An- und Abmeldung.
        const { data } = client.auth.onAuthStateChange((_ereignis, s) => setSession(s));
        return () => data.subscription.unsubscribe();
    }, []);

    const userId = session?.user.id ?? null;

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
        email: session?.user.email,
        // null = nicht angemeldet
        status: userId ? status : null,
        // Liefert eine Fehlermeldung oder undefined bei Erfolg.
        async anmelden(email: string): Promise<string | undefined> {
            if (!client) return 'Cloud ist nicht eingerichtet.';
            const { error } = await client.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: window.location.origin + window.location.pathname },
            });
            return error?.message;
        },
        async abmelden() {
            await client?.auth.signOut();
        },
        cloudUebernehmen: (cloud: CloudStand) => abgleich?.cloudUebernehmen(cloud),
        lokalHochladen: (cloud: CloudStand) => abgleich?.lokalHochladen(cloud),
    };
}

export type CloudAktionen = ReturnType<typeof useCloud>;
