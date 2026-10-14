// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
import { describe, expect, it } from 'vitest';
import { alsJson, ausJson, backupDateiname, leereDaten, pruefeAppDaten } from './backup';
import type { AppDaten } from './types';

function volleDaten(): AppDaten {
    return {
        schemaVersion: 1,
        vergleichszeitraumMonate: 24,
        tarife: [
            {
                id: 't1',
                anbieter: 'TESTANBIETER',
                name: 'Testtarif',
                preisMonatlichCent: 2000,
                bindungMonate: 24,
                einmaligCent: 1000,
                servicepauschaleJahrCent: 2500,
                rabatte: [{ bezeichnung: 'Test', art: 'monatlich', betragCent: 500, dauerMonate: 6 }],
                datenOesterreichGb: 'unbegrenzt',
                datenEuGb: 25.5,
                netz: '5G',
                preisStand: '2026-10-14',
            },
        ],
        geraete: [{ id: 'g1', modell: 'TESTGERÄT', preisFreiCent: 80000 }],
        angebote: [
            { id: 'a1', tarifId: 't1', rabatte: [], art: 'simOnly' },
            { id: 'a2', tarifId: 't1', rabatte: [], art: 'geraetFrei', geraetId: 'g1' },
            {
                id: 'a3',
                tarifId: 't1',
                rabatte: [{ bezeichnung: 'Bonus', art: 'einmalig', betragCent: 5000 }],
                art: 'geraetVertrag',
                geraetId: 'g1',
                anzahlungCent: 0,
                rateMonatlichCent: 1500,
                rateAnzahlMonate: 24,
            },
        ],
    };
}

describe('alsJson / ausJson', () => {
    it('Hin- und Rückweg ergibt dieselben Daten', () => {
        expect(ausJson(alsJson(volleDaten()))).toEqual({ ok: true, wert: volleDaten() });
    });
    it('leere Daten sind gültig', () => {
        expect(ausJson(alsJson(leereDaten()))).toEqual({ ok: true, wert: leereDaten() });
    });
    it('meldet kaputtes JSON', () => {
        expect(ausJson('{ kaputt')).toEqual({ ok: false, fehler: ['Kein gültiges JSON.'] });
    });
});

describe('pruefeAppDaten', () => {
    it('lehnt Nicht-Objekte und fremde schemaVersion ab', () => {
        expect(pruefeAppDaten([]).ok).toBe(false);
        expect(pruefeAppDaten(null).ok).toBe(false);
        expect(pruefeAppDaten({ ...volleDaten(), schemaVersion: 2 })).toEqual({
            ok: false,
            fehler: ['Unbekannte schemaVersion "2", erwartet 1.'],
        });
    });

    it('meldet falsche Felder mit Pfad', () => {
        const d = volleDaten() as unknown as Record<string, unknown>;
        const r = pruefeAppDaten({
            ...d,
            vergleichszeitraumMonate: 0,
            tarife: [{ ...volleDaten().tarife[0], preisMonatlichCent: 20.5, datenEuGb: 'viel' }],
            geraete: 'keine Liste',
        });
        expect(r).toEqual({
            ok: false,
            fehler: [
                'daten.vergleichszeitraumMonate: ganze Zahl ab 1 erwartet.',
                'daten.tarife[0].preisMonatlichCent: ganze Zahl ab 0 erwartet.',
                'daten.tarife[0].datenEuGb: Zahl ab 0 oder "unbegrenzt" erwartet.',
                'daten.geraete: Liste erwartet.',
            ],
        });
    });

    it('prüft Angebote je nach Art', () => {
        const r = pruefeAppDaten({
            ...volleDaten(),
            angebote: [
                { id: 'a1', tarifId: 't1', rabatte: [], art: 'geraetVertrag', geraetId: 'g1' },
                { id: 'a2', tarifId: 't1', rabatte: [], art: 'irgendwas' },
            ],
        });
        expect(!r.ok && r.fehler).toEqual([
            'daten.angebote[0].anzahlungCent: ganze Zahl ab 0 erwartet.',
            'daten.angebote[0].rateMonatlichCent: ganze Zahl ab 0 erwartet.',
            'daten.angebote[0].rateAnzahlMonate: ganze Zahl ab 0 erwartet.',
            'daten.angebote[1].art: einer von simOnly, geraetFrei, geraetVertrag erwartet.',
        ]);
    });

    it('meldet doppelte IDs', () => {
        const d = volleDaten();
        const r = pruefeAppDaten({ ...d, geraete: [d.geraete[0], d.geraete[0]] });
        expect(!r.ok && r.fehler).toEqual(['geraete: ID "g1" kommt mehrfach vor.']);
    });
});

describe('backupDateiname', () => {
    it('enthält das lokale Datum', () => {
        expect(backupDateiname(new Date(2026, 9, 4))).toBe('handytarif-backup-2026-10-04.json');
    });
});
