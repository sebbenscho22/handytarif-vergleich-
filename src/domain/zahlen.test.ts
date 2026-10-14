import { describe, expect, it } from 'vitest';
import { centAlsEingabe, formatEuro, formatKontingent, parseEuro, parseGanzzahl, parseKontingent } from './zahlen';

describe('formatEuro', () => {
    it('formatiert mit Komma und Tausenderpunkt', () => {
        expect(formatEuro(4105)).toBe('41,05 €');
        expect(formatEuro(5)).toBe('0,05 €');
        expect(formatEuro(0)).toBe('0,00 €');
        expect(formatEuro(123456789)).toBe('1.234.567,89 €');
        expect(formatEuro(-1500)).toBe('-15,00 €');
    });
    it('lehnt Bruchteile von Cent ab', () => {
        expect(() => formatEuro(1.5)).toThrow();
    });
});

describe('centAlsEingabe', () => {
    it('liefert einen Wert, den parseEuro wieder versteht', () => {
        expect(centAlsEingabe(123456)).toBe('1234,56');
        expect(parseEuro(centAlsEingabe(123456))).toBe(123456);
    });
});

describe('parseEuro', () => {
    it.each([
        ['41,05', 4105],
        ['41,5', 4150],
        ['41', 4100],
        ['41.05', 4105],
        ['1.234,56', 123456],
        ['1.234', 123400],
        [' 41,05 € ', 4105],
        ['0', 0],
    ])('%s → %i', (eingabe, cent) => {
        expect(parseEuro(eingabe)).toBe(cent);
    });
    it.each(['', 'abc', '41,055', '-5', '4,1,2'])('ungültig: "%s"', (eingabe) => {
        expect(parseEuro(eingabe)).toBeNull();
    });
});

describe('parseGanzzahl', () => {
    it('akzeptiert nur nicht-negative ganze Zahlen', () => {
        expect(parseGanzzahl('24')).toBe(24);
        expect(parseGanzzahl(' 0 ')).toBe(0);
        expect(parseGanzzahl('')).toBeNull();
        expect(parseGanzzahl('2,5')).toBeNull();
        expect(parseGanzzahl('-1')).toBeNull();
    });
});

describe('parseKontingent', () => {
    it('unterscheidet leer, unbegrenzt, Zahl und ungültig', () => {
        expect(parseKontingent('')).toBeUndefined();
        expect(parseKontingent('Unbegrenzt')).toBe('unbegrenzt');
        expect(parseKontingent('u')).toBe('unbegrenzt');
        expect(parseKontingent('20')).toBe(20);
        expect(parseKontingent('20,5')).toBe(20.5);
        expect(parseKontingent('viel')).toBeNull();
    });
});

describe('formatKontingent', () => {
    it('formatiert alle Fälle', () => {
        expect(formatKontingent(undefined, 'GB')).toBe('–');
        expect(formatKontingent('unbegrenzt', 'GB')).toBe('unbegrenzt');
        expect(formatKontingent(20.5, 'GB')).toBe('20,5 GB');
    });
});
