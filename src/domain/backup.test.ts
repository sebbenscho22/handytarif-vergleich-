// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
import { describe, expect, it } from 'vitest';
import { alsJson, ausJson, backupDateiname, leereDaten, pruefeBackup } from './backup';
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

// Die einzelnen Regeln testet validierung.test.ts; hier nur, dass pruefeBackup sie nutzt.
describe('pruefeBackup', () => {
    it('lehnt Nicht-Objekte und fremde schemaVersion ab', () => {
        expect(pruefeBackup([]).ok).toBe(false);
        expect(pruefeBackup(null).ok).toBe(false);
        expect(pruefeBackup({ ...volleDaten(), schemaVersion: 2 })).toEqual({
            ok: false,
            fehler: ['schemaVersion: wird nicht unterstützt (erwartet: 1)'],
        });
    });

    it('meldet falsche Felder mit Pfad', () => {
        const r = pruefeBackup({
            ...volleDaten(),
            vergleichszeitraumMonate: 0,
            tarife: [{ ...volleDaten().tarife[0], preisMonatlichCent: 20.5, datenEuGb: 'viel' }],
            geraete: 'keine Liste',
        });
        expect(r).toEqual({
            ok: false,
            fehler: [
                'vergleichszeitraumMonate: muss eine ganze Zahl ab 1 sein',
                'geraete: muss eine Liste sein',
                'tarife[0].preisMonatlichCent: muss ein Betrag in ganzen Cent ab 0 sein',
                "tarife[0].datenEuGb: muss eine Zahl ab 0 oder 'unbegrenzt' sein",
            ],
        });
    });

    it('meldet Angebote mit Rate ohne Ratenanzahl', () => {
        const r = pruefeBackup({
            ...volleDaten(),
            angebote: [
                {
                    id: 'a1',
                    tarifId: 't1',
                    rabatte: [],
                    art: 'geraetVertrag',
                    geraetId: 'g1',
                    anzahlungCent: 0,
                    rateMonatlichCent: 1500,
                    rateAnzahlMonate: 0,
                },
            ],
        });
        expect(!r.ok && r.fehler).toEqual([
            'angebote[0].rateAnzahlMonate: Rate und Anzahl der Raten müssen beide 0 oder beide größer als 0 sein',
        ]);
    });

    it('meldet Angebote, deren Gerät fehlt', () => {
        const r = pruefeBackup({ ...volleDaten(), geraete: [] });
        expect(!r.ok && r.fehler).toEqual([
            'angebote[1].geraetId: verweist auf ein Gerät, das es nicht gibt',
            'angebote[2].geraetId: verweist auf ein Gerät, das es nicht gibt',
        ]);
    });

    it('meldet doppelte IDs', () => {
        const d = volleDaten();
        const r = pruefeBackup({ ...d, geraete: [d.geraete[0], d.geraete[0]] });
        expect(!r.ok && r.fehler).toEqual(['geraete[1].id: kommt mehrfach vor']);
    });
});

describe('backupDateiname', () => {
    it('enthält das lokale Datum', () => {
        expect(backupDateiname(new Date(2026, 9, 4))).toBe('handytarif-backup-2026-10-04.json');
    });
});
