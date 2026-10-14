// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
import { describe, expect, it } from 'vitest';
import { leereDaten } from '../domain/backup';
import type { AppDaten } from '../domain/types';
import {
    DEFEKT_SCHLUESSEL,
    laden,
    SPEICHER_SCHLUESSEL,
    speichern,
    SYNC_SCHLUESSEL,
    syncStandLaden,
    syncStandSpeichern,
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

describe('Sync-Stand', () => {
    it('wird gespeichert und wieder geladen', () => {
        const { speicher } = testSpeicher();
        expect(syncStandLaden(speicher)).toBeNull();
        syncStandSpeichern(speicher, { basis: 'T1', lokalGeaendert: true });
        expect(syncStandLaden(speicher)).toEqual({ basis: 'T1', lokalGeaendert: true });
    });

    it('defekter oder nicht verfügbarer Speicher → null, kein Absturz', () => {
        expect(syncStandLaden(testSpeicher({ [SYNC_SCHLUESSEL]: '{kaputt' }).speicher)).toBeNull();
        expect(syncStandLaden(kaputt)).toBeNull();
        expect(() => syncStandSpeichern(kaputt, { basis: null, lokalGeaendert: false })).not.toThrow();
    });
});
