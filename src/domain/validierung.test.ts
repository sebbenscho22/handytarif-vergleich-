// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
// Sie stammen von keinem echten Anbieter und keinem echten Tarif.
import { describe, expect, it } from 'vitest';
import { fehlerAlsText, pruefeAngebot, pruefeAppDaten, pruefeGeraet, pruefeTarif } from './validierung';
import type { Angebot, AppDaten, Geraet, Tarif } from './types';

function testTarif(aenderungen: Record<string, unknown> = {}): Tarif {
    return {
        id: 't1',
        anbieter: 'TESTANBIETER',
        name: 'Testtarif',
        preisMonatlichCent: 2000,
        bindungMonate: 24,
        einmaligCent: 0,
        servicepauschaleJahrCent: 0,
        rabatte: [],
        ...aenderungen,
    } as Tarif;
}

function testGeraet(aenderungen: Record<string, unknown> = {}): Geraet {
    return { id: 'g1', modell: 'TESTGERÄT', preisFreiCent: 80000, ...aenderungen } as Geraet;
}

function testVertrag(aenderungen: Record<string, unknown> = {}): Angebot {
    return {
        id: 'a1',
        tarifId: 't1',
        rabatte: [],
        art: 'geraetVertrag',
        geraetId: 'g1',
        anzahlungCent: 5000,
        rateMonatlichCent: 2500,
        rateAnzahlMonate: 24,
        ...aenderungen,
    } as Angebot;
}

function testDaten(aenderungen: Record<string, unknown> = {}): AppDaten {
    return {
        schemaVersion: 1,
        vergleichszeitraumMonate: 24,
        tarife: [testTarif()],
        geraete: [testGeraet()],
        angebote: [testVertrag()],
        ...aenderungen,
    } as AppDaten;
}

function pfade(fehler: { pfad: string }[]): string[] {
    return fehler.map((f) => f.pfad);
}

describe('pruefeTarif', () => {
    it('gültiger Tarif ohne optionale Felder: keine Fehler', () => {
        expect(pruefeTarif(testTarif())).toEqual([]);
    });

    it('gültiger Tarif mit allen optionalen Feldern: keine Fehler', () => {
        const tarif = testTarif({
            datenOesterreichGb: 'unbegrenzt',
            datenEuGb: 25.5,
            netz: '5G',
            netzbetreiber: 'TESTNETZ',
            downloadMbit: 300,
            uploadMbit: 50,
            minutenInland: 'unbegrenzt',
            minutenEu: 1000,
            minutenAusland: 0,
            smsInland: 'unbegrenzt',
            smsAusland: 50,
            auslandEuCentProMinute: 0,
            auslandWeltCentProMinute: 99.5,
            preisStand: '2026-10-14',
            notiz: '',
            rabatte: [
                { bezeichnung: 'Testrabatt', art: 'monatlich', betragCent: 500, dauerMonate: 6 },
                { bezeichnung: 'Gutschrift', art: 'einmalig', betragCent: 1000 },
            ],
        });
        expect(pruefeTarif(tarif)).toEqual([]);
    });

    it.each([
        ['preisMonatlichCent', 19.99],
        ['preisMonatlichCent', -100],
        ['preisMonatlichCent', '2000'],
        ['einmaligCent', undefined],
        ['servicepauschaleJahrCent', NaN],
        ['bindungMonate', 1.5],
        ['name', '   '],
        ['anbieter', undefined],
        ['id', ''],
    ])('Pflichtfeld %s = %s ist ein Fehler', (feld, wert) => {
        expect(pfade(pruefeTarif(testTarif({ [feld]: wert })))).toEqual([feld]);
    });

    it.each([
        ['datenOesterreichGb', -1],
        ['minutenEu', 'viele'],
        ['smsAusland', -5],
        ['downloadMbit', Infinity],
        ['netz', '4G'],
        ['preisStand', '14.10.2026'],
        ['preisStand', '2026-02-30'],
        ['notiz', 5],
    ])('optionales Feld %s = %s ist ein Fehler', (feld, wert) => {
        expect(pfade(pruefeTarif(testTarif({ [feld]: wert })))).toEqual([feld]);
    });

    it('fehlerhafte Rabatte werden mit Pfad gemeldet', () => {
        const tarif = testTarif({
            rabatte: [
                { bezeichnung: '', art: 'monatlich', betragCent: 500 },
                { bezeichnung: 'X', art: 'woechentlich', betragCent: 5.5 },
                { bezeichnung: 'X', art: 'einmalig', betragCent: 500, dauerMonate: 3 },
                { bezeichnung: 'X', art: 'monatlich', betragCent: 500, dauerMonate: 0 },
                'kein Rabatt',
            ],
        });
        expect(pfade(pruefeTarif(tarif))).toEqual([
            'rabatte[0].bezeichnung',
            'rabatte[1].betragCent',
            'rabatte[1].art',
            'rabatte[2].dauerMonate',
            'rabatte[3].dauerMonate',
            'rabatte[4]',
        ]);
    });

    it('rabatte ist keine Liste: Fehler', () => {
        expect(pfade(pruefeTarif(testTarif({ rabatte: undefined })))).toEqual(['rabatte']);
    });

    it('kein Objekt: genau ein Fehler', () => {
        expect(pruefeTarif(null)).toHaveLength(1);
        expect(pruefeTarif([])).toHaveLength(1);
    });

    it('Präfix wird vor den Pfad gesetzt', () => {
        expect(pfade(pruefeTarif(testTarif({ name: '' }), 'tarife[3]'))).toEqual(['tarife[3].name']);
    });
});

describe('pruefeGeraet', () => {
    it('gültiges Gerät: keine Fehler', () => {
        expect(pruefeGeraet(testGeraet({ preisStand: '2026-10-14', notiz: 'TESTNOTIZ' }))).toEqual([]);
    });

    it.each([
        ['modell', ''],
        ['preisFreiCent', 799.99],
        ['preisFreiCent', -1],
        ['preisStand', '2026-13-01'],
    ])('%s = %s ist ein Fehler', (feld, wert) => {
        expect(pfade(pruefeGeraet(testGeraet({ [feld]: wert })))).toEqual([feld]);
    });

    it('kein Objekt: genau ein Fehler', () => {
        expect(pruefeGeraet('Handy')).toHaveLength(1);
    });
});

describe('pruefeAngebot', () => {
    it('gültiges SIM-only-Angebot: keine Fehler', () => {
        const angebot = { id: 'a1', tarifId: 't1', rabatte: [], art: 'simOnly' };
        expect(pruefeAngebot(angebot)).toEqual([]);
    });

    it('gültiges Angebot mit frei gekauftem Gerät: keine Fehler', () => {
        const angebot = { id: 'a1', tarifId: 't1', rabatte: [], art: 'geraetFrei', geraetId: 'g1' };
        expect(pruefeAngebot(angebot)).toEqual([]);
    });

    it.each([
        ['Anzahlung und Raten', 5000, 2500, 24],
        ['nur Raten', 0, 2500, 24],
        ['nur Einmalbetrag', 19900, 0, 0],
    ])('gültiges Vertragsangebot (%s): keine Fehler', (_, anzahlungCent, rateMonatlichCent, rateAnzahlMonate) => {
        const angebot = testVertrag({ anzahlungCent, rateMonatlichCent, rateAnzahlMonate });
        expect(pruefeAngebot(angebot)).toEqual([]);
    });

    it.each([
        ['Rate ohne Anzahl', 2500, 0],
        ['Anzahl ohne Rate', 0, 24],
    ])('%s ist ein Fehler', (_, rateMonatlichCent, rateAnzahlMonate) => {
        const angebot = testVertrag({ rateMonatlichCent, rateAnzahlMonate });
        expect(pfade(pruefeAngebot(angebot))).toEqual(['rateAnzahlMonate']);
    });

    it.each([
        ['anzahlungCent', 50.5],
        ['rateMonatlichCent', -2500],
        ['rateAnzahlMonate', 2.5],
    ])('Vertragsfeld %s = %s ist ein Fehler', (feld, wert) => {
        expect(pfade(pruefeAngebot(testVertrag({ [feld]: wert })))).toEqual([feld]);
    });

    it('unbekannte IDs prüft pruefeAngebot nicht', () => {
        expect(pruefeAngebot(testVertrag({ tarifId: 't9', geraetId: 'g9' }))).toEqual([]);
    });

    it('fehlende geraetId bei Gerät-Angebot ist ein Fehler', () => {
        const angebot = { id: 'a1', tarifId: 't1', rabatte: [], art: 'geraetFrei' };
        expect(pfade(pruefeAngebot(angebot))).toEqual(['geraetId']);
    });

    it('unbekannte Angebotsart ist ein Fehler', () => {
        const angebot = { id: 'a1', tarifId: 't1', rabatte: [], art: 'leasing' };
        expect(pfade(pruefeAngebot(angebot))).toEqual(['art']);
    });

    it('fehlerhafter Angebotsrabatt wird gemeldet', () => {
        const angebot = testVertrag({ rabatte: [{ bezeichnung: 'Bonus', art: 'monatlich', betragCent: -1 }] });
        expect(pfade(pruefeAngebot(angebot))).toEqual(['rabatte[0].betragCent']);
    });

    it('Präfix wird vor den Pfad gesetzt', () => {
        expect(pfade(pruefeAngebot(testVertrag({ id: '' }), 'angebote[1]'))).toEqual(['angebote[1].id']);
    });

    it('kein Objekt: genau ein Fehler', () => {
        expect(pruefeAngebot(42)).toHaveLength(1);
    });
});

describe('fehlerAlsText', () => {
    it('setzt Pfad und Meldung zusammen, ohne Pfad nur die Meldung', () => {
        expect(
            fehlerAlsText([
                { pfad: 'tarife[0].name', meldung: 'darf nicht leer sein' },
                { pfad: '', meldung: 'Die Daten sind kein gültiges Objekt.' },
            ]),
        ).toEqual(['tarife[0].name: darf nicht leer sein', 'Die Daten sind kein gültiges Objekt.']);
    });
});

describe('pruefeAppDaten', () => {
    it('gültige Daten: keine Fehler', () => {
        expect(pruefeAppDaten(testDaten())).toEqual([]);
    });

    it('leere Listen sind gültig', () => {
        expect(pruefeAppDaten(testDaten({ tarife: [], geraete: [], angebote: [] }))).toEqual([]);
    });

    it('kein Objekt: genau ein Fehler', () => {
        expect(pruefeAppDaten('{}')).toHaveLength(1);
        expect(pruefeAppDaten(null)).toHaveLength(1);
    });

    it('falsche schemaVersion: nur dieser eine Fehler', () => {
        expect(pfade(pruefeAppDaten(testDaten({ schemaVersion: 2, tarife: 'kaputt' })))).toEqual(['schemaVersion']);
    });

    it.each([0, 1.5, '24'])('Vergleichszeitraum %s ist ein Fehler', (wert) => {
        expect(pfade(pruefeAppDaten(testDaten({ vergleichszeitraumMonate: wert })))).toEqual([
            'vergleichszeitraumMonate',
        ]);
    });

    it('fehlende Liste ist ein Fehler, ohne Folgefehler bei Verweisen', () => {
        expect(pfade(pruefeAppDaten(testDaten({ geraete: undefined })))).toEqual(['geraete']);
    });

    it('doppelte IDs werden gemeldet', () => {
        const daten = testDaten({ tarife: [testTarif(), testTarif({ name: 'Zweiter' })] });
        expect(pfade(pruefeAppDaten(daten))).toEqual(['tarife[1].id']);
    });

    it('Fehler in Einträgen bekommen den Listenpfad', () => {
        const daten = testDaten({
            tarife: [testTarif({ preisMonatlichCent: 19.99 })],
            geraete: [testGeraet({ modell: '' })],
            angebote: [testVertrag({ geraetId: 'g9' })],
        });
        expect(pfade(pruefeAppDaten(daten))).toEqual([
            'tarife[0].preisMonatlichCent',
            'geraete[0].modell',
            'angebote[0].geraetId',
        ]);
    });

    it('Angebot auf fehlenden Tarif wird gemeldet', () => {
        expect(pfade(pruefeAppDaten(testDaten({ tarife: [] })))).toEqual(['angebote[0].tarifId']);
    });

    it('Angebot auf fehlendes Gerät wird gemeldet', () => {
        expect(pfade(pruefeAppDaten(testDaten({ geraete: [] })))).toEqual(['angebote[0].geraetId']);
    });

    it('SIM-only-Angebot braucht kein Gerät', () => {
        const daten = testDaten({ geraete: [], angebote: [{ id: 'a1', tarifId: 't1', rabatte: [], art: 'simOnly' }] });
        expect(pruefeAppDaten(daten)).toEqual([]);
    });
});
