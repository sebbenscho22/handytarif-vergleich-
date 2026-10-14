// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
import { describe, expect, it } from 'vitest';
import {
    SPALTEN,
    STANDARD_SPALTEN,
    bereinigeSpaltenAuswahl,
    filterAusEingaben,
    filtereTreffer,
    formatZelle,
    parseFilterGrenze,
    type Spalte,
} from './spalten';
import { vergleicheAngebote, type VergleichsTreffer } from './vergleich';
import type { AppDaten, Tarif } from './types';

function tarif(id: string, preisMonatlichCent: number, extra: Partial<Tarif> = {}): Tarif {
    return {
        id,
        anbieter: `TESTANBIETER ${id}`,
        name: `Testtarif ${id}`,
        preisMonatlichCent,
        bindungMonate: 0,
        einmaligCent: 0,
        servicepauschaleJahrCent: 0,
        rabatte: [],
        ...extra,
    };
}

const daten: AppDaten = {
    schemaVersion: 1,
    vergleichszeitraumMonate: 24,
    tarife: [
        tarif('a', 1000, { datenOesterreichGb: 20, netz: '5G' }), // 240,00
        tarif('b', 2000, { datenOesterreichGb: 'unbegrenzt', netz: 'LTE' }), // 480,00
        tarif('c', 1500), // 360,00 + Gerät
    ],
    geraete: [{ id: 'g1', modell: 'TESTGERÄT Phone', preisFreiCent: 50000, notiz: '  ' }],
    angebote: [
        { id: 'x1', tarifId: 'a', rabatte: [], art: 'simOnly' },
        { id: 'x2', tarifId: 'b', rabatte: [], art: 'simOnly', notiz: 'Online bestellen' },
        {
            id: 'x3',
            tarifId: 'c',
            rabatte: [{ bezeichnung: 'Handy-Bonus', art: 'einmalig', betragCent: 1000 }],
            art: 'geraetVertrag',
            geraetId: 'g1',
            anzahlungCent: 9900,
            rateMonatlichCent: 1000,
            rateAnzahlMonate: 24,
        },
    ],
};

const treffer = vergleicheAngebote(daten).treffer;

function spalte(id: string): Spalte {
    const s = SPALTEN.find((x) => x.id === id);
    if (!s) throw new Error(`Spalte ${id} fehlt`);
    return s;
}

function ids(liste: VergleichsTreffer[]): string[] {
    return liste.map((t) => t.angebot.id);
}

describe('SPALTEN', () => {
    it('hat eindeutige IDs', () => {
        const alle = SPALTEN.map((s) => s.id);
        expect(new Set(alle).size).toBe(alle.length);
    });

    it('stellt Anbieter, Tarif, Handy und Gesamtpreis hervorgehoben an den Anfang', () => {
        expect(SPALTEN.filter((s) => s.hervorgehoben).map((s) => s.id)).toEqual(['anbieter', 'tarif', 'handy', 'gesamt']);
        expect(SPALTEN.slice(0, 4).every((s) => s.hervorgehoben)).toBe(true);
    });

    it('Standardspalten existieren alle', () => {
        expect(bereinigeSpaltenAuswahl(STANDARD_SPALTEN)).toEqual(STANDARD_SPALTEN);
    });
});

describe('bereinigeSpaltenAuswahl', () => {
    it('entfernt Unbekanntes und Doppeltes und sortiert wie SPALTEN', () => {
        expect(bereinigeSpaltenAuswahl(['netz', 'gibtsnicht', 'anbieter', 'netz', 7])).toEqual(['anbieter', 'netz']);
    });

    it('liefert bei Unsinn die Standardauswahl', () => {
        expect(bereinigeSpaltenAuswahl(null)).toEqual(STANDARD_SPALTEN);
        expect(bereinigeSpaltenAuswahl('anbieter')).toEqual(STANDARD_SPALTEN);
    });

    it('erlaubt eine leere Auswahl', () => {
        expect(bereinigeSpaltenAuswahl([])).toEqual([]);
    });
});

describe('formatZelle', () => {
    const vertrag = treffer.find((t) => t.angebot.id === 'x3')!;
    const sim = treffer.find((t) => t.angebot.id === 'x2')!;

    it('formatiert Text, Cent, Zahl und Kontingent', () => {
        expect(formatZelle(spalte('handy'), vertrag)).toBe('TESTGERÄT Phone');
        expect(formatZelle(spalte('anzahlung'), vertrag)).toBe('99,00 €');
        expect(formatZelle(spalte('rateMonate'), vertrag)).toBe('24 Mon.');
        expect(formatZelle(spalte('datenAt'), sim)).toBe('unbegrenzt');
        expect(formatZelle(spalte('rabattNamen'), vertrag)).toBe('Handy-Bonus');
    });

    it('zeigt "–" bei fehlender oder leerer Angabe', () => {
        expect(formatZelle(spalte('handy'), sim)).toBe('–');
        expect(formatZelle(spalte('anzahlung'), sim)).toBe('–');
        expect(formatZelle(spalte('download'), sim)).toBe('–');
        expect(formatZelle(spalte('notizGeraet'), vertrag)).toBe('–');
    });
});

describe('parseFilterGrenze', () => {
    it('liest Euro als Cent', () => {
        expect(parseFilterGrenze(spalte('gesamt'), '300')).toBe(30000);
        expect(parseFilterGrenze(spalte('gesamt'), '12,5')).toBe(1250);
    });

    it('liest unbegrenzt bei Kontingenten als Infinity', () => {
        expect(parseFilterGrenze(spalte('datenAt'), 'unbegrenzt')).toBe(Infinity);
        expect(parseFilterGrenze(spalte('datenAt'), '20')).toBe(20);
    });

    it('leer → undefined, ungültig → null', () => {
        expect(parseFilterGrenze(spalte('bindung'), '  ')).toBeUndefined();
        expect(parseFilterGrenze(spalte('bindung'), 'abc')).toBeNull();
        expect(parseFilterGrenze(spalte('gesamt'), '-5')).toBeNull();
    });
});

describe('filterAusEingaben', () => {
    it('übernimmt gültige Werte und meldet ungültige', () => {
        const { filter, ungueltig } = filterAusEingaben({
            anbieter: { text: '  test ' },
            gesamt: { min: '', max: '400' },
            bindung: { min: 'x' },
            netz: { text: '' },
        });
        expect(filter).toEqual({ anbieter: { text: 'test' }, gesamt: { max: 40000 } });
        expect(ungueltig).toEqual(['bindung.min']);
    });
});

describe('filtereTreffer', () => {
    it('ohne Filter bleibt alles, in gleicher Reihenfolge', () => {
        expect(ids(filtereTreffer(treffer, {}))).toEqual(['x1', 'x2', 'x3']);
    });

    it('filtert Text ohne Groß-/Kleinschreibung, fehlender Wert passt nicht', () => {
        expect(ids(filtereTreffer(treffer, { notizAngebot: { text: 'ONLINE' } }))).toEqual(['x2']);
        expect(ids(filtereTreffer(treffer, { handy: { text: 'phone' } }))).toEqual(['x3']);
    });

    it('filtert Zahlen von/bis inklusive', () => {
        expect(ids(filtereTreffer(treffer, { gesamt: { min: 24000, max: 48000 } }))).toEqual(['x1', 'x2']);
        expect(ids(filtereTreffer(treffer, { gesamt: { max: 23999 } }))).toEqual([]);
    });

    it('behandelt unbegrenzt als größer als jede Zahl', () => {
        expect(ids(filtereTreffer(treffer, { datenAt: { min: 50 } }))).toEqual(['x2']);
        expect(ids(filtereTreffer(treffer, { datenAt: { max: 100 } }))).toEqual(['x1']);
    });

    it('verknüpft mehrere Filter mit UND', () => {
        expect(ids(filtereTreffer(treffer, { netz: { text: 'g' }, gesamt: { min: 30000 } }))).toEqual([]);
        expect(ids(filtereTreffer(treffer, { netz: { text: '5g' }, gesamt: { max: 30000 } }))).toEqual(['x1']);
    });

    it('berechnet Mehrkosten neu gegenüber dem günstigsten verbliebenen Angebot', () => {
        const ohneX1 = filtereTreffer(treffer, { anbieter: { text: 'anbieter b' } });
        expect(ohneX1.map((t) => t.mehrkostenCent)).toEqual([0]);
        const ohneSim = filtereTreffer(treffer, { gesamt: { min: 40000 } });
        expect(ids(ohneSim)).toEqual(['x2', 'x3']);
        expect(ohneSim[0].mehrkostenCent).toBe(0);
        expect(ohneSim[1].mehrkostenCent).toBe(ohneSim[1].kosten.gesamtCent - 48000);
    });

    it('verändert die übergebenen Treffer nicht', () => {
        filtereTreffer(treffer, { gesamt: { min: 40000 } });
        expect(treffer[1].mehrkostenCent).toBe(24000);
    });
});
