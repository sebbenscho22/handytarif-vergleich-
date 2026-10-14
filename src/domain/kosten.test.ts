// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
// Sie stammen von keinem echten Anbieter und keinem echten Tarif.
import { describe, expect, it } from 'vitest';
import { berechneGesamtkosten } from './kosten';
import type { Angebot, Geraet, Rabatt, Tarif } from './types';

function testTarif(aenderungen: Partial<Tarif> = {}): Tarif {
    return {
        id: 't1',
        anbieter: 'TESTANBIETER',
        name: 'Testtarif',
        preisMonatlichCent: 2000, // 20,00 €
        bindungMonate: 0,
        einmaligCent: 0,
        servicepauschaleJahrCent: 0,
        rabatte: [],
        ...aenderungen,
    };
}

const testGeraet: Geraet = { id: 'g1', modell: 'TESTGERÄT', preisFreiCent: 80000 }; // 800,00 €

function simOnly(rabatte: Rabatt[] = []): Angebot {
    return { id: 'a1', tarifId: 't1', rabatte, art: 'simOnly' };
}

function geraetFrei(): Angebot {
    return { id: 'a2', tarifId: 't1', rabatte: [], art: 'geraetFrei', geraetId: 'g1' };
}

function geraetVertrag(
    anzahlungCent: number,
    rateMonatlichCent: number,
    rateAnzahlMonate: number,
    rabatte: Rabatt[] = [],
): Angebot {
    return {
        id: 'a3',
        tarifId: 't1',
        rabatte,
        art: 'geraetVertrag',
        geraetId: 'g1',
        anzahlungCent,
        rateMonatlichCent,
        rateAnzahlMonate,
    };
}

describe('berechneGesamtkosten', () => {
    it('SIM-only: Handrechnung mit Rabatt, Servicepauschale und Einmalkosten', () => {
        // 24 × 20,00 = 480,00 − (6 × 5,00 = 30,00) + 10,00 + (2 Jahre × 25,00 = 50,00) = 510,00
        const tarif = testTarif({
            einmaligCent: 1000,
            servicepauschaleJahrCent: 2500,
            rabatte: [{ bezeichnung: 'Testrabatt', art: 'monatlich', betragCent: 500, dauerMonate: 6 }],
        });
        const r = berechneGesamtkosten(simOnly(), tarif, undefined, 24);
        expect(r).toMatchObject({
            tarifCent: 48000,
            rabattCent: 3000,
            einmaligCent: 1000,
            servicepauschaleCent: 5000,
            geraetCent: 0,
            gesamtCent: 51000,
            proMonatCent: 2125,
        });
    });

    it.each([
        [12, 1000],
        [13, 2000],
        [24, 2000],
        [25, 3000],
    ])('Servicepauschale: %i Monate kosten %i Cent (pro angefangenem Jahr)', (monate, erwartet) => {
        const tarif = testTarif({ servicepauschaleJahrCent: 1000 });
        const r = berechneGesamtkosten(simOnly(), tarif, undefined, monate);
        expect(r.servicepauschaleCent).toBe(erwartet);
    });

    it('monatlicher Rabatt ohne Dauer gilt für den ganzen Zeitraum', () => {
        const tarif = testTarif({
            rabatte: [{ bezeichnung: 'Dauerrabatt', art: 'monatlich', betragCent: 100 }],
        });
        const r = berechneGesamtkosten(simOnly(), tarif, undefined, 24);
        expect(r.rabattCent).toBe(2400);
    });

    it('monatlicher Rabatt wird auf den Vergleichszeitraum gekappt', () => {
        const tarif = testTarif({
            rabatte: [{ bezeichnung: 'Langer Rabatt', art: 'monatlich', betragCent: 100, dauerMonate: 36 }],
        });
        const r = berechneGesamtkosten(simOnly(), tarif, undefined, 12);
        expect(r.rabattCent).toBe(1200);
    });

    it('einmaliger Rabatt zählt genau einmal', () => {
        const tarif = testTarif({
            rabatte: [{ bezeichnung: 'Gutschrift', art: 'einmalig', betragCent: 1500 }],
        });
        const r = berechneGesamtkosten(simOnly(), tarif, undefined, 12);
        expect(r.rabattCent).toBe(1500);
        expect(r.gesamtCent).toBe(24000 - 1500); // 22.500 Cent
    });

    it('Gerät frei gekauft: voller Gerätepreis kommt dazu', () => {
        const r = berechneGesamtkosten(geraetFrei(), testTarif(), testGeraet, 24);
        expect(r.geraetCent).toBe(80000);
        expect(r.gesamtCent).toBe(48000 + 80000); // 1.280,00 €
    });

    it('Gerät im Vertrag: Anzahlung plus alle Raten', () => {
        // 50,00 + 24 × 25,00 = 650,00 Gerätekosten; Tarif 24 × 20,00 = 480,00
        const r = berechneGesamtkosten(geraetVertrag(5000, 2500, 24), testTarif(), testGeraet, 24);
        expect(r.geraetCent).toBe(65000);
        expect(r.gesamtCent).toBe(48000 + 65000); // 1.130,00 €
    });

    it('Rabatte von Tarif und Angebot addieren sich', () => {
        const tarif = testTarif({
            rabatte: [{ bezeichnung: 'Tarifrabatt', art: 'monatlich', betragCent: 500, dauerMonate: 6 }],
        });
        const angebot = geraetVertrag(0, 2500, 24, [
            { bezeichnung: 'Handy-Bonus', art: 'monatlich', betragCent: 500, dauerMonate: 24 },
        ]);
        const r = berechneGesamtkosten(angebot, tarif, testGeraet, 24);
        expect(r.rabattCent).toBe(3000 + 12000);
        expect(r.gesamtCent).toBe(48000 - 15000 + 60000); // 930,00 €
    });

    it('Raten länger als der Zeitraum: alle Raten zählen, dazu ein Hinweis', () => {
        const r = berechneGesamtkosten(geraetVertrag(5000, 2500, 24), testTarif(), testGeraet, 12);
        expect(r.geraetCent).toBe(65000);
        expect(r.hinweise).toHaveLength(1);
    });

    it('Bindung länger als der Zeitraum: Zeitraum wird auf die Bindung verlängert', () => {
        // 24 × 20,00 = 480,00 + (2 Jahre × 10,00 = 20,00) = 500,00; 500,00 / 24 ≈ 20,83
        const tarif = testTarif({ bindungMonate: 24, servicepauschaleJahrCent: 1000 });
        const r = berechneGesamtkosten(simOnly(), tarif, undefined, 12);
        expect(r).toMatchObject({
            zeitraumMonate: 24,
            tarifCent: 48000,
            servicepauschaleCent: 2000,
            gesamtCent: 50000,
            proMonatCent: 2083,
        });
        expect(r.hinweise).toEqual(['Zeitraum auf die Bindung von 24 Monaten verlängert.']);
    });

    it('Bindung länger als der Zeitraum: monatlicher Rabatt wird auf die Bindung gekappt', () => {
        const tarif = testTarif({
            bindungMonate: 24,
            rabatte: [{ bezeichnung: 'Langer Rabatt', art: 'monatlich', betragCent: 100, dauerMonate: 36 }],
        });
        const r = berechneGesamtkosten(simOnly(), tarif, undefined, 12);
        expect(r.rabattCent).toBe(2400);
    });

    it('Bindung deckt die Raten ab: nur der Bindungs-Hinweis', () => {
        const tarif = testTarif({ bindungMonate: 24 });
        const r = berechneGesamtkosten(geraetVertrag(5000, 2500, 24), tarif, testGeraet, 12);
        expect(r.geraetCent).toBe(65000);
        expect(r.hinweise).toEqual(['Zeitraum auf die Bindung von 24 Monaten verlängert.']);
    });

    it('Raten länger als die Bindung: Raten-Hinweis nennt den wirksamen Zeitraum', () => {
        const tarif = testTarif({ bindungMonate: 24 });
        const r = berechneGesamtkosten(geraetVertrag(0, 2500, 36), tarif, testGeraet, 12);
        expect(r.geraetCent).toBe(90000);
        expect(r.hinweise).toHaveLength(2);
        expect(r.hinweise[1]).toContain('der Vergleichszeitraum ist 24 Monate');
    });

    it('Gerät im Vertrag sofort bezahlt: Einmalbetrag als Anzahlung, keine Raten', () => {
        const r = berechneGesamtkosten(geraetVertrag(19900, 0, 0), testTarif(), testGeraet, 24);
        expect(r.geraetCent).toBe(19900);
        expect(r.hinweise).toEqual([]);
    });

    it('Bindung kürzer als der Zeitraum: nichts ändert sich', () => {
        const tarif = testTarif({ bindungMonate: 24, servicepauschaleJahrCent: 1000 });
        const r = berechneGesamtkosten(simOnly(), tarif, undefined, 36);
        expect(r).toMatchObject({
            zeitraumMonate: 36,
            tarifCent: 72000,
            servicepauschaleCent: 3000,
            gesamtCent: 75000,
            proMonatCent: 2083,
        });
        expect(r.hinweise).toEqual([]);
    });

    it.each([0, -1, 1.5])('ungültiger Vergleichszeitraum %s wirft einen Fehler', (zeitraum) => {
        expect(() => berechneGesamtkosten(simOnly(), testTarif(), undefined, zeitraum)).toThrow();
    });

    it('fehlendes Gerät wirft einen Fehler', () => {
        expect(() => berechneGesamtkosten(geraetFrei(), testTarif(), undefined, 24)).toThrow();
    });

    it('falsches Gerät wirft einen Fehler', () => {
        const fremdesGeraet: Geraet = { ...testGeraet, id: 'g2' };
        expect(() => berechneGesamtkosten(geraetFrei(), testTarif(), fremdesGeraet, 24)).toThrow();
    });

    it('falscher Tarif wirft einen Fehler', () => {
        const fremderTarif = testTarif({ id: 't2' });
        expect(() => berechneGesamtkosten(simOnly(), fremderTarif, undefined, 24)).toThrow();
    });
});