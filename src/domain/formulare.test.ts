// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
import { describe, expect, it } from 'vitest';
import {
    angebotAuswerten,
    angebotEingabeAus,
    geraetAuswerten,
    geraetEingabeAus,
    rabatteAuswerten,
    rabattEingabenAus,
    tarifAuswerten,
    tarifEingabeAus,
    type TarifEingabe,
} from './formulare';
import type { Angebot, Tarif } from './types';

function tarifEingabe(aenderungen: Partial<TarifEingabe> = {}): TarifEingabe {
    return { ...tarifEingabeAus(), anbieter: 'TESTANBIETER', name: 'Testtarif', preisMonatlich: '20', ...aenderungen };
}

describe('rabatteAuswerten', () => {
    it('wandelt Eingaben in Rabatte um', () => {
        expect(
            rabatteAuswerten([
                { bezeichnung: 'Test', art: 'monatlich', betrag: '5', dauer: '6' },
                { bezeichnung: '', art: 'einmalig', betrag: '10,50', dauer: '99' },
                { bezeichnung: 'Immer', art: 'monatlich', betrag: '1', dauer: '' },
            ]),
        ).toEqual({
            ok: true,
            wert: [
                { bezeichnung: 'Test', art: 'monatlich', betragCent: 500, dauerMonate: 6 },
                { bezeichnung: 'Rabatt 2', art: 'einmalig', betragCent: 1050 },
                { bezeichnung: 'Immer', art: 'monatlich', betragCent: 100 },
            ],
        });
    });
    it('meldet fehlenden Betrag und ungültige Dauer', () => {
        const r = rabatteAuswerten([
            { bezeichnung: 'A', art: 'monatlich', betrag: '', dauer: '' },
            { bezeichnung: 'B', art: 'monatlich', betrag: '1', dauer: '0' },
        ]);
        expect(r.ok).toBe(false);
        expect(!r.ok && r.fehler).toHaveLength(2);
    });
    it('Hin- und Rückweg ergibt dieselben Rabatte', () => {
        const rabatte = [{ bezeichnung: 'X', art: 'monatlich' as const, betragCent: 333, dauerMonate: 3 }];
        expect(rabatteAuswerten(rabattEingabenAus(rabatte))).toEqual({ ok: true, wert: rabatte });
    });
});

describe('tarifAuswerten', () => {
    it('setzt leere Zahlenfelder auf 0 und lässt leere optionale Felder weg', () => {
        expect(tarifAuswerten(tarifEingabe(), 't1')).toEqual({
            ok: true,
            wert: {
                id: 't1',
                anbieter: 'TESTANBIETER',
                name: 'Testtarif',
                preisMonatlichCent: 2000,
                bindungMonate: 0,
                einmaligCent: 0,
                servicepauschaleJahrCent: 0,
                rabatte: [],
            },
        });
    });
    it('übernimmt Kontingente, Netz und Datum', () => {
        const r = tarifAuswerten(
            tarifEingabe({ datenOesterreichGb: 'unbegrenzt', datenEuGb: '25,5', netz: '5G', preisStand: '2026-10-14' }),
            't1',
        );
        expect(r.ok && r.wert).toMatchObject({
            datenOesterreichGb: 'unbegrenzt',
            datenEuGb: 25.5,
            netz: '5G',
            preisStand: '2026-10-14',
        });
    });
    it('übernimmt Geschwindigkeit, Minuten und SMS und liest sie zurück ins Formular', () => {
        const felder = {
            downloadMbit: '300',
            uploadMbit: '12,5',
            minutenInland: 'unbegrenzt',
            minutenAusland: '100',
            smsInland: '1000',
            smsAusland: '0',
        };
        const r = tarifAuswerten(tarifEingabe(felder), 't1');
        expect(r.ok && r.wert).toMatchObject({
            downloadMbit: 300,
            uploadMbit: 12.5,
            minutenInland: 'unbegrenzt',
            minutenAusland: 100,
            smsInland: 1000,
            smsAusland: 0,
        });
        expect(r.ok && tarifEingabeAus(r.wert)).toMatchObject(felder);
    });
    it('meldet ungültige Geschwindigkeit und Minuten', () => {
        const r = tarifAuswerten(tarifEingabe({ downloadMbit: 'unbegrenzt', minutenAusland: 'viele' }), 't1');
        expect(!r.ok && r.fehler).toEqual(['Download: Zahl erwartet.', 'Minuten Ausland: Zahl oder "unbegrenzt" erwartet.']);
    });
    it('sammelt alle Fehler', () => {
        const r = tarifAuswerten(
            tarifEingabe({ anbieter: ' ', name: '', preisMonatlich: '', bindungMonate: '1,5', datenEuGb: 'viel' }),
            't1',
        );
        expect(r.ok).toBe(false);
        expect(!r.ok && r.fehler).toEqual([
            'Anbieter fehlt.',
            'Tarifname fehlt.',
            'Monatspreis fehlt.',
            'Bindung: ganze Zahl erwartet.',
            'Daten EU: Zahl oder "unbegrenzt" erwartet.',
        ]);
    });
    it('behält Felder, die das Formular nicht kennt, und entfernt geleerte', () => {
        const alt: Tarif = {
            id: 't1',
            anbieter: 'TESTANBIETER',
            name: 'Testtarif',
            preisMonatlichCent: 2000,
            bindungMonate: 24,
            einmaligCent: 0,
            servicepauschaleJahrCent: 0,
            rabatte: [],
            minutenInland: 'unbegrenzt',
            notiz: 'alt',
        };
        const r = tarifAuswerten({ ...tarifEingabeAus(alt), notiz: '' }, 't1', alt);
        const ohneNotiz: Tarif = { ...alt };
        delete ohneNotiz.notiz;
        expect(r).toEqual({ ok: true, wert: ohneNotiz });
        expect(r.ok && 'notiz' in r.wert).toBe(false);
    });
});

describe('geraetAuswerten', () => {
    it('wandelt um und prüft Pflichtfelder', () => {
        expect(geraetAuswerten({ ...geraetEingabeAus(), modell: 'TESTGERÄT', preisFrei: '799,90' }, 'g1')).toEqual({
            ok: true,
            wert: { id: 'g1', modell: 'TESTGERÄT', preisFreiCent: 79990 },
        });
        expect(geraetAuswerten(geraetEingabeAus(), 'g1')).toEqual({
            ok: false,
            fehler: ['Modell fehlt.', 'Preis ohne Vertrag fehlt.'],
        });
    });
    it('prüft zusätzlich mit den Modellregeln, z. B. eine leere ID', () => {
        expect(geraetAuswerten({ ...geraetEingabeAus(), modell: 'TESTGERÄT', preisFrei: '10' }, '')).toEqual({
            ok: false,
            fehler: ['id: darf nicht leer sein'],
        });
    });
});

describe('angebotAuswerten', () => {
    it('SIM-only braucht kein Gerät', () => {
        expect(angebotAuswerten({ ...angebotEingabeAus(), tarifId: 't1' }, 'a1')).toEqual({
            ok: true,
            wert: { id: 'a1', tarifId: 't1', rabatte: [], art: 'simOnly' },
        });
    });
    it('Gerät mit Vertrag: Raten werden übernommen', () => {
        const r = angebotAuswerten(
            {
                ...angebotEingabeAus(),
                art: 'geraetVertrag',
                tarifId: 't1',
                geraetId: 'g1',
                anzahlung: '99',
                rateMonatlich: '15',
                rateAnzahlMonate: '24',
            },
            'a1',
        );
        expect(r).toEqual({
            ok: true,
            wert: {
                id: 'a1',
                tarifId: 't1',
                rabatte: [],
                art: 'geraetVertrag',
                geraetId: 'g1',
                anzahlungCent: 9900,
                rateMonatlichCent: 1500,
                rateAnzahlMonate: 24,
            },
        });
    });
    it.each([
        ['Rate ohne Anzahl', '15', ''],
        ['Anzahl ohne Rate', '', '24'],
    ])('Gerät mit Vertrag: %s ist ein Fehler', (_, rateMonatlich, rateAnzahlMonate) => {
        const r = angebotAuswerten(
            { ...angebotEingabeAus(), art: 'geraetVertrag', tarifId: 't1', geraetId: 'g1', rateMonatlich, rateAnzahlMonate },
            'a1',
        );
        expect(r).toEqual({
            ok: false,
            fehler: ['Monatsrate und Anzahl Raten: entweder beide ausfüllen oder beide leer lassen.'],
        });
    });
    it('Gerät mit Vertrag: nur Einmalbetrag ohne Raten ist gültig', () => {
        const r = angebotAuswerten(
            { ...angebotEingabeAus(), art: 'geraetVertrag', tarifId: 't1', geraetId: 'g1', anzahlung: '199' },
            'a1',
        );
        expect(r.ok && r.wert).toMatchObject({ anzahlungCent: 19900, rateMonatlichCent: 0, rateAnzahlMonate: 0 });
    });
    it('meldet fehlenden Tarif und fehlendes Gerät', () => {
        expect(angebotAuswerten({ ...angebotEingabeAus(), art: 'geraetFrei' }, 'a1')).toEqual({
            ok: false,
            fehler: ['Tarif fehlt.', 'Gerät fehlt.'],
        });
    });
    it('Hin- und Rückweg ergibt dasselbe Angebot', () => {
        const a: Angebot = {
            id: 'a1',
            tarifId: 't1',
            rabatte: [{ bezeichnung: 'Bonus', art: 'einmalig', betragCent: 5000 }],
            art: 'geraetVertrag',
            geraetId: 'g1',
            anzahlungCent: 0,
            rateMonatlichCent: 1999,
            rateAnzahlMonate: 36,
            notiz: 'Test',
        };
        expect(angebotAuswerten(angebotEingabeAus(a), 'a1')).toEqual({ ok: true, wert: a });
    });
});
