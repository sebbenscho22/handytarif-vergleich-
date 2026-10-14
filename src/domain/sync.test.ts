// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
import { describe, expect, it } from 'vitest';
import { leereDaten } from './backup';
import { istLeer, pruefeSyncStand, startStand, syncAktion } from './sync';

const T1 = '2026-01-01T10:00:00.000001+00:00';
const T2 = '2026-01-02T10:00:00.000001+00:00';
const mitGeraet = { ...leereDaten(), geraete: [{ id: 'g1', modell: 'TESTGERÄT', preisFreiCent: 1 }] };

describe('istLeer', () => {
    it('erkennt leere und nicht leere Daten', () => {
        expect(istLeer(leereDaten())).toBe(true);
        expect(istLeer(mitGeraet)).toBe(false);
    });
});

describe('startStand', () => {
    it('leere Daten gelten als unverändert, vorhandene als geändert', () => {
        expect(startStand(leereDaten())).toEqual({ basis: null, lokalGeaendert: false });
        expect(startStand(mitGeraet)).toEqual({ basis: null, lokalGeaendert: true });
    });
});

describe('syncAktion', () => {
    it('Cloud leer → hochladen', () => {
        expect(syncAktion({ basis: null, lokalGeaendert: false }, null)).toBe('hochladen');
        expect(syncAktion({ basis: T1, lokalGeaendert: true }, null)).toBe('hochladen');
    });

    it('Cloud unverändert → nur bei lokaler Änderung hochladen', () => {
        expect(syncAktion({ basis: T1, lokalGeaendert: false }, T1)).toBe('nichts');
        expect(syncAktion({ basis: T1, lokalGeaendert: true }, T1)).toBe('hochladen');
    });

    it('Cloud von anderem Gerät geändert → herunterladen oder Konflikt', () => {
        expect(syncAktion({ basis: T1, lokalGeaendert: false }, T2)).toBe('herunterladen');
        expect(syncAktion({ basis: T1, lokalGeaendert: true }, T2)).toBe('konflikt');
        expect(syncAktion({ basis: null, lokalGeaendert: false }, T2)).toBe('herunterladen');
        expect(syncAktion({ basis: null, lokalGeaendert: true }, T2)).toBe('konflikt');
    });
});

describe('pruefeSyncStand', () => {
    it('akzeptiert gültige Werte', () => {
        expect(pruefeSyncStand({ basis: T1, lokalGeaendert: true })).toEqual({ basis: T1, lokalGeaendert: true });
        expect(pruefeSyncStand({ basis: null, lokalGeaendert: false })).toEqual({ basis: null, lokalGeaendert: false });
    });

    it('lehnt ungültige Werte ab', () => {
        expect(pruefeSyncStand(null)).toBeNull();
        expect(pruefeSyncStand('x')).toBeNull();
        expect(pruefeSyncStand({ basis: 5, lokalGeaendert: true })).toBeNull();
        expect(pruefeSyncStand({ basis: T1 })).toBeNull();
    });
});
