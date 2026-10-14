import { useState } from 'react';
import type { Angebot, AppDaten, Geraet, Tarif } from '../domain/types';

const LEER: AppDaten = {
    schemaVersion: 1,
    vergleichszeitraumMonate: 24,
    tarife: [],
    geraete: [],
    angebote: [],
};

function speichern<T extends { id: string }>(liste: T[], eintrag: T): T[] {
    return liste.some((x) => x.id === eintrag.id)
        ? liste.map((x) => (x.id === eintrag.id ? eintrag : x))
        : [...liste, eintrag];
}

// Hält den gesamten App-Zustand.
// TODO: an src/storage (localStorage) anbinden, sobald das fertig ist. Bis dahin gehen Daten beim Neuladen verloren.
export function useAppDaten() {
    const [daten, setDaten] = useState<AppDaten>(LEER);

    return {
        daten,
        setZeitraum: (monate: number) => setDaten((d) => ({ ...d, vergleichszeitraumMonate: monate })),
        tarifSpeichern: (t: Tarif) => setDaten((d) => ({ ...d, tarife: speichern(d.tarife, t) })),
        // Entfernt auch alle Angebote mit diesem Tarif.
        tarifLoeschen: (id: string) =>
            setDaten((d) => ({
                ...d,
                tarife: d.tarife.filter((t) => t.id !== id),
                angebote: d.angebote.filter((a) => a.tarifId !== id),
            })),
        geraetSpeichern: (g: Geraet) => setDaten((d) => ({ ...d, geraete: speichern(d.geraete, g) })),
        // Entfernt auch alle Angebote mit diesem Gerät.
        geraetLoeschen: (id: string) =>
            setDaten((d) => ({
                ...d,
                geraete: d.geraete.filter((g) => g.id !== id),
                angebote: d.angebote.filter((a) => a.art === 'simOnly' || a.geraetId !== id),
            })),
        angebotSpeichern: (a: Angebot) => setDaten((d) => ({ ...d, angebote: speichern(d.angebote, a) })),
        angebotLoeschen: (id: string) =>
            setDaten((d) => ({ ...d, angebote: d.angebote.filter((a) => a.id !== id) })),
    };
}

export type AppAktionen = ReturnType<typeof useAppDaten>;
