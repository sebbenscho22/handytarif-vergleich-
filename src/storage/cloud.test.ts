// ACHTUNG: Alle Zahlen und Namen in dieser Datei sind TESTWERTE.
import { describe, expect, it } from 'vitest';
import { alsJson, leereDaten } from '../domain/backup';
import { dokumentAuswerten } from './cloud';

const ZEIT = '2026-01-01T10:00:00.000Z';
const zeitstempel = { toDate: () => new Date(ZEIT) };

describe('dokumentAuswerten', () => {
    it('kein Dokument → null', () => {
        expect(dokumentAuswerten(undefined)).toEqual({ ok: true, wert: null });
    });

    it('gültiges Dokument → Daten mit Revision und Zeit', () => {
        expect(dokumentAuswerten({ inhalt: alsJson(leereDaten()), revision: 'R1', geaendertAm: zeitstempel })).toEqual({
            ok: true,
            wert: { daten: leereDaten(), revision: 'R1', geaendertAm: ZEIT },
        });
    });

    it('fehlende oder ungültige Zeit → geaendertAm null, Daten trotzdem gültig', () => {
        const r = dokumentAuswerten({ inhalt: alsJson(leereDaten()), revision: 'R1', geaendertAm: 'gestern' });
        expect(r).toEqual({ ok: true, wert: { daten: leereDaten(), revision: 'R1', geaendertAm: null } });
    });

    it('fehlende Revision, fehlender oder ungültiger Inhalt → Fehler', () => {
        expect(dokumentAuswerten({ inhalt: alsJson(leereDaten()) }).ok).toBe(false);
        expect(dokumentAuswerten({ revision: 'R1' }).ok).toBe(false);
        expect(dokumentAuswerten({ inhalt: '{"schemaVersion":99}', revision: 'R1' }).ok).toBe(false);
        expect(dokumentAuswerten({ inhalt: '{kaputt', revision: 'R1' }).ok).toBe(false);
        expect(dokumentAuswerten(null).ok).toBe(false);
        expect(dokumentAuswerten('x').ok).toBe(false);
    });
});
