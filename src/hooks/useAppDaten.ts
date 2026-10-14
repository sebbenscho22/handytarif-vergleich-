import { useState } from 'react';
import type { Angebot, AppDaten, Geraet, Tarif } from '../domain/types';
import { browserSpeicher, laden, speichern } from '../storage/speicher';

function speichereEintrag<T extends { id: string }>(liste: T[], eintrag: T): T[] {
    return liste.some((x) => x.id === eintrag.id)
        ? liste.map((x) => (x.id === eintrag.id ? eintrag : x))
        : [...liste, eintrag];
}

// Hält den gesamten App-Zustand und speichert jede Änderung im localStorage.
export function useAppDaten() {
    const [start] = useState(() => laden(browserSpeicher()));
    const [daten, setDaten] = useState<AppDaten>(start.daten);
    const [speicherFehler, setSpeicherFehler] = useState<string | undefined>();

    // Jede Änderung läuft hierüber und wird sofort gespeichert.
    function aendern(neu: (d: AppDaten) => AppDaten) {
        const naechste = neu(daten);
        setDaten(naechste);
        setSpeicherFehler(speichern(browserSpeicher(), naechste));
    }

    return {
        daten,
        ladeWarnung: start.warnung,
        speicherFehler,
        ersetzen: (neu: AppDaten) => aendern(() => neu),
        setZeitraum: (monate: number) => aendern((d) => ({ ...d, vergleichszeitraumMonate: monate })),
        tarifSpeichern: (t: Tarif) => aendern((d) => ({ ...d, tarife: speichereEintrag(d.tarife, t) })),
        // Entfernt auch alle Angebote mit diesem Tarif.
        tarifLoeschen: (id: string) =>
            aendern((d) => ({
                ...d,
                tarife: d.tarife.filter((t) => t.id !== id),
                angebote: d.angebote.filter((a) => a.tarifId !== id),
            })),
        geraetSpeichern: (g: Geraet) => aendern((d) => ({ ...d, geraete: speichereEintrag(d.geraete, g) })),
        // Entfernt auch alle Angebote mit diesem Gerät.
        geraetLoeschen: (id: string) =>
            aendern((d) => ({
                ...d,
                geraete: d.geraete.filter((g) => g.id !== id),
                angebote: d.angebote.filter((a) => a.art === 'simOnly' || a.geraetId !== id),
            })),
        angebotSpeichern: (a: Angebot) => aendern((d) => ({ ...d, angebote: speichereEintrag(d.angebote, a) })),
        angebotLoeschen: (id: string) =>
            aendern((d) => ({ ...d, angebote: d.angebote.filter((a) => a.id !== id) })),
    };
}

export type AppAktionen = ReturnType<typeof useAppDaten>;
