// Prüfen und Umwandeln der gespeicherten Daten (localStorage und JSON-Backup).
// Alles, was von außen kommt, ist unknown, bis es hier geprüft wurde.
import type { Ergebnis } from './formulare';
import type { AppDaten } from './types';
import { fehlerAlsText, pruefeAppDaten } from './validierung';

export const SCHEMA_VERSION = 1;

export function leereDaten(): AppDaten {
    return { schemaVersion: 1, vergleichszeitraumMonate: 24, tarife: [], geraete: [], angebote: [] };
}

export function alsJson(daten: AppDaten): string {
    return JSON.stringify(daten, null, 2);
}

// z. B. "handytarif-backup-2026-10-14.json" (lokales Datum)
export function backupDateiname(datum: Date): string {
    const zwei = (n: number) => n.toString().padStart(2, '0');
    return `handytarif-backup-${datum.getFullYear()}-${zwei(datum.getMonth() + 1)}-${zwei(datum.getDate())}.json`;
}

export function ausJson(text: string): Ergebnis<AppDaten> {
    let wert: unknown;
    try {
        wert = JSON.parse(text);
    } catch {
        return { ok: false, fehler: ['Kein gültiges JSON.'] };
    }
    return pruefeBackup(wert);
}

// Die Regeln stehen in validierung.ts; erst nach dieser Prüfung gilt der Wert als AppDaten.
export function pruefeBackup(wert: unknown): Ergebnis<AppDaten> {
    const fehler = pruefeAppDaten(wert);
    return fehler.length > 0 ? { ok: false, fehler: fehlerAlsText(fehler) } : { ok: true, wert: wert as AppDaten };
}
