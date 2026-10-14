// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
import { describe, expect, it } from 'vitest';
import { leereDaten } from '../domain/backup';
import { zeileAuswerten } from './cloud';

const T1 = '2026-01-01T10:00:00.000001+00:00';

describe('zeileAuswerten', () => {
    it('keine Zeile → null', () => {
        expect(zeileAuswerten(null)).toEqual({ ok: true, wert: null });
    });

    it('gültige Zeile → Daten mit Zeitstempel', () => {
        expect(zeileAuswerten({ inhalt: leereDaten(), geaendert_am: T1 })).toEqual({
            ok: true,
            wert: { daten: leereDaten(), geaendertAm: T1 },
        });
    });

    it('fehlender Zeitstempel oder ungültiger Inhalt → Fehler', () => {
        expect(zeileAuswerten({ inhalt: leereDaten() }).ok).toBe(false);
        expect(zeileAuswerten({ inhalt: { schemaVersion: 99 }, geaendert_am: T1 }).ok).toBe(false);
        expect(zeileAuswerten('x').ok).toBe(false);
    });
});
