// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
import { describe, expect, it } from 'vitest';
import { leereDaten } from '../domain/backup';
import type { AppDaten } from '../domain/types';
import { STANDARD_SPALTEN } from '../domain/spalten';
import {
    DEFEKT_SCHLUESSEL,
    FILTER_SCHLUESSEL,
    ladeFilterEingaben,
    ladeSpaltenAuswahl,
    laden,
    SPALTEN_SCHLUESSEL,
    SPEICHER_SCHLUESSEL,
    speichereFilterEingaben,
    speichereSpaltenAuswahl,
    speichern,
    type Speicher,
} from './speicher';

function testSpeicher(start: Record<string, string> = {}) {
    const inhalt = new Map(Object.entries(start));
    const speicher: Speicher = {
        getItem: (k) => inhalt.get(k) ?? null,
        setItem: (k, v) => void inhalt.set(k, v),
    };
    return { speicher, inhalt };
}

const kaputt: Speicher = {
    getItem: () => {
        throw new Error('gesperrt');
    },
    setItem: () => {
        throw new Error('voll');
    },
};

const daten: AppDaten = {
    ...leereDaten(),
    vergleichszeitraumMonate: 12,
    geraete: [{ id: 'g1', modell: 'TESTGERÄT', preisFreiCent: 50000 }],
};

describe('speichern und laden', () => {
    it('leerer Speicher → leere Daten ohne Warnung', () => {
        expect(laden(testSpeicher().speicher)).toEqual({ daten: leereDaten() });
    });

    it('Gespeichertes wird wieder geladen', () => {
        const { speicher } = testSpeicher();
        expect(speichern(speicher, daten)).toBeUndefined();
        expect(laden(speicher)).toEqual({ daten });
    });

    it('defekte Daten werden gesichert statt überschrieben', () => {
        const { speicher, inhalt } = testSpeicher({ [SPEICHER_SCHLUESSEL]: '{"schemaVersion": 99}' });
        const r = laden(speicher);
        expect(r.daten).toEqual(leereDaten());
        expect(r.warnung).toContain('schemaVersion');
        expect(inhalt.get(DEFEKT_SCHLUESSEL)).toBe('{"schemaVersion": 99}');
    });

    it('nicht verfügbarer Speicher führt zu Warnung bzw. Fehlermeldung', () => {
        expect(laden(kaputt).warnung).toContain('nicht verfügbar');
        expect(speichern(kaputt, daten)).toBe('Speichern fehlgeschlagen: voll');
    });
});

describe('Spaltenauswahl', () => {
    it('speichert und lädt die Auswahl unter eigenem Schlüssel', () => {
        const { speicher, inhalt } = testSpeicher();
        speichereSpaltenAuswahl(speicher, ['anbieter', 'netz']);
        expect(inhalt.has(SPEICHER_SCHLUESSEL)).toBe(false);
        expect(JSON.parse(inhalt.get(SPALTEN_SCHLUESSEL)!)).toEqual(['anbieter', 'netz']);
        expect(ladeSpaltenAuswahl(speicher)).toEqual(['anbieter', 'netz']);
    });

    it('liefert ohne gespeicherte Auswahl den Standard', () => {
        expect(ladeSpaltenAuswahl(testSpeicher().speicher)).toEqual(STANDARD_SPALTEN);
    });

    it('liefert bei kaputtem JSON oder gesperrtem Speicher den Standard', () => {
        expect(ladeSpaltenAuswahl(testSpeicher({ [SPALTEN_SCHLUESSEL]: '{kaputt' }).speicher)).toEqual(STANDARD_SPALTEN);
        expect(ladeSpaltenAuswahl(kaputt)).toEqual(STANDARD_SPALTEN);
    });

    it('wirft beim Speichern nicht, wenn der Speicher gesperrt ist', () => {
        expect(() => speichereSpaltenAuswahl(kaputt, ['anbieter'])).not.toThrow();
    });
});

describe('Filtereingaben', () => {
    it('speichert und lädt die Eingaben unter eigenem Schlüssel', () => {
        const { speicher, inhalt } = testSpeicher();
        speichereFilterEingaben(speicher, { anbieter: { text: 'test' }, gesamt: { max: '400' } });
        expect(inhalt.has(SPEICHER_SCHLUESSEL)).toBe(false);
        expect(inhalt.has(FILTER_SCHLUESSEL)).toBe(true);
        expect(ladeFilterEingaben(speicher)).toEqual({ anbieter: { text: 'test' }, gesamt: { max: '400' } });
    });

    it('liefert ohne, bei kaputten Daten oder gesperrtem Speicher keine Filter', () => {
        expect(ladeFilterEingaben(testSpeicher().speicher)).toEqual({});
        expect(ladeFilterEingaben(testSpeicher({ [FILTER_SCHLUESSEL]: '{kaputt' }).speicher)).toEqual({});
        expect(ladeFilterEingaben(kaputt)).toEqual({});
    });

    it('wirft beim Speichern nicht, wenn der Speicher gesperrt ist', () => {
        expect(() => speichereFilterEingaben(kaputt, {})).not.toThrow();
    });
});
