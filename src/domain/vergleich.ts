import { berechneGesamtkosten, type Kostenaufstellung } from './kosten';
import type { Angebot, AppDaten, Geraet, Tarif } from './types';

export interface VergleichsTreffer {
    angebot: Angebot;
    tarif: Tarif;
    geraet: Geraet | undefined;
    kosten: Kostenaufstellung;
    mehrkostenCent: number; // gegenüber dem günstigsten Angebot, 0 beim günstigsten
}

export interface VergleichsFehler {
    angebot: Angebot;
    fehler: string;
}

export interface Vergleich {
    treffer: VergleichsTreffer[]; // günstigstes zuerst
    fehler: VergleichsFehler[];   // z. B. Tarif oder Gerät gelöscht
}

export function vergleicheAngebote(daten: AppDaten): Vergleich {
    const treffer: VergleichsTreffer[] = [];
    const fehler: VergleichsFehler[] = [];

    for (const angebot of daten.angebote) {
        const tarif = daten.tarife.find((t) => t.id === angebot.tarifId);
        if (!tarif) {
            fehler.push({ angebot, fehler: 'Tarif nicht gefunden.' });
            continue;
        }
        const geraet =
            angebot.art === 'simOnly' ? undefined : daten.geraete.find((g) => g.id === angebot.geraetId);
        if (angebot.art !== 'simOnly' && !geraet) {
            fehler.push({ angebot, fehler: 'Gerät nicht gefunden.' });
            continue;
        }
        try {
            const kosten = berechneGesamtkosten(angebot, tarif, geraet, daten.vergleichszeitraumMonate);
            treffer.push({ angebot, tarif, geraet, kosten, mehrkostenCent: 0 });
        } catch (e) {
            fehler.push({ angebot, fehler: e instanceof Error ? e.message : String(e) });
        }
    }

    treffer.sort((a, b) => a.kosten.gesamtCent - b.kosten.gesamtCent);
    const guenstigst = treffer[0]?.kosten.gesamtCent ?? 0;
    for (const t of treffer) {
        t.mehrkostenCent = t.kosten.gesamtCent - guenstigst;
    }
    return { treffer, fehler };
}
