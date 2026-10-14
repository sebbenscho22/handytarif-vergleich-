import type { Angebot, Geraet, Rabatt, Tarif } from './types';

export interface Kostenaufstellung {
    zeitraumMonate: number;
    tarifCent: number;            // Monatspreis × Zeitraum, vor Rabatten
    rabattCent: number;           // alle Rabatte zusammen, positiv = Ersparnis
    einmaligCent: number;         // Aktivierung, SIM usw.
    servicepauschaleCent: number; // pro angefangenem Jahr
    geraetCent: number;           // Kaufpreis bzw. Anzahlung + alle Raten
    gesamtCent: number;
    proMonatCent: number;         // nur zur Anzeige, gerundet
    hinweise: string[];           // Warnungen, z. B. Zeitraum kürzer als Bindung
}

function rabattSumme(rabatte: Rabatt[], zeitraumMonate: number): number {
    let summe = 0;
    for (const r of rabatte) {
        if (r.art === 'einmalig') {
            summe += r.betragCent;
        } else {
            const monate = Math.min(r.dauerMonate ?? zeitraumMonate, zeitraumMonate);
            summe += r.betragCent * Math.max(0, monate);
        }
    }
    return summe;
}

export function berechneGesamtkosten(
    angebot: Angebot,
    tarif: Tarif,
    geraet: Geraet | undefined,
    zeitraumMonate: number,
): Kostenaufstellung {
    if (!Number.isInteger(zeitraumMonate) || zeitraumMonate < 1) {
        throw new Error(`Ungültiger Vergleichszeitraum: ${zeitraumMonate}`);
    }
    if (angebot.tarifId !== tarif.id) {
        throw new Error('Das Angebot gehört nicht zu diesem Tarif.');
    }

    const hinweise: string[] = [];

    const tarifCent = tarif.preisMonatlichCent * zeitraumMonate;
    const rabattCent = rabattSumme([...tarif.rabatte, ...angebot.rabatte], zeitraumMonate);
    const einmaligCent = tarif.einmaligCent;
    const servicepauschaleCent = Math.ceil(zeitraumMonate / 12) * tarif.servicepauschaleJahrCent;

    let geraetCent = 0;
    if (angebot.art !== 'simOnly') {
        if (!geraet) {
            throw new Error('Das Angebot braucht ein Gerät, es wurde aber keins übergeben.');
        }
        if (geraet.id !== angebot.geraetId) {
            throw new Error('Das übergebene Gerät gehört nicht zu diesem Angebot.');
        }
        if (angebot.art === 'geraetFrei') {
            geraetCent = geraet.preisFreiCent;
        } else {
            geraetCent = angebot.anzahlungCent + angebot.rateMonatlichCent * angebot.rateAnzahlMonate;
            if (angebot.rateAnzahlMonate > zeitraumMonate) {
                hinweise.push(
                    `Die Raten laufen ${angebot.rateAnzahlMonate} Monate, der Vergleichszeitraum ist ${zeitraumMonate} Monate. Alle Raten sind in den Gerätekosten enthalten.`,
                );
            }
        }
    }

    if (tarif.bindungMonate > zeitraumMonate) {
        hinweise.push(
            `Die Bindung beträgt ${tarif.bindungMonate} Monate, der Vergleichszeitraum ist nur ${zeitraumMonate} Monate.`,
        );
    }

    const gesamtCent = tarifCent - rabattCent + einmaligCent + servicepauschaleCent + geraetCent;

    return {
        zeitraumMonate,
        tarifCent,
        rabattCent,
        einmaligCent,
        servicepauschaleCent,
        geraetCent,
        gesamtCent,
        proMonatCent: Math.round(gesamtCent / zeitraumMonate),
        hinweise,
    };
}