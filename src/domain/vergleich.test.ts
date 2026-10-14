// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
import { describe, expect, it } from 'vitest';
import { vergleicheAngebote } from './vergleich';
import type { AppDaten, Tarif } from './types';

function tarif(id: string, preisMonatlichCent: number): Tarif {
    return {
        id,
        anbieter: 'TESTANBIETER',
        name: `Testtarif ${id}`,
        preisMonatlichCent,
        bindungMonate: 0,
        einmaligCent: 0,
        servicepauschaleJahrCent: 0,
        rabatte: [],
    };
}

function daten(aenderungen: Partial<AppDaten>): AppDaten {
    return {
        schemaVersion: 1,
        vergleichszeitraumMonate: 24,
        tarife: [tarif('teuer', 3000), tarif('billig', 1000)],
        geraete: [{ id: 'g1', modell: 'TESTGERÄT', preisFreiCent: 50000 }],
        angebote: [],
        ...aenderungen,
    };
}

describe('vergleicheAngebote', () => {
    it('sortiert nach Gesamtkosten, günstigstes zuerst', () => {
        const { treffer, fehler } = vergleicheAngebote(
            daten({
                angebote: [
                    { id: 'a1', tarifId: 'teuer', rabatte: [], art: 'simOnly' }, // 24 × 30 = 720,00
                    { id: 'a2', tarifId: 'billig', rabatte: [], art: 'geraetFrei', geraetId: 'g1' }, // 240 + 500 = 740,00
                    { id: 'a3', tarifId: 'billig', rabatte: [], art: 'simOnly' }, // 24 × 10 = 240,00
                ],
            }),
        );
        expect(treffer.map((t) => [t.angebot.id, t.kosten.gesamtCent])).toEqual([
            ['a3', 24000],
            ['a1', 72000],
            ['a2', 74000],
        ]);
        expect(fehler).toEqual([]);
    });

    it('meldet fehlende Tarife und Geräte getrennt', () => {
        const { treffer, fehler } = vergleicheAngebote(
            daten({
                angebote: [
                    { id: 'a1', tarifId: 'weg', rabatte: [], art: 'simOnly' },
                    { id: 'a2', tarifId: 'billig', rabatte: [], art: 'geraetFrei', geraetId: 'weg' },
                    { id: 'a3', tarifId: 'billig', rabatte: [], art: 'simOnly' },
                ],
            }),
        );
        expect(treffer.map((t) => t.angebot.id)).toEqual(['a3']);
        expect(fehler.map((f) => [f.angebot.id, f.fehler])).toEqual([
            ['a1', 'Tarif nicht gefunden.'],
            ['a2', 'Gerät nicht gefunden.'],
        ]);
    });

    it('liefert leere Listen ohne Angebote', () => {
        expect(vergleicheAngebote(daten({}))).toEqual({ treffer: [], fehler: [] });
    });
});
