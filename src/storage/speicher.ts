// Zugriff auf localStorage. Der Speicher wird übergeben, damit die Tests ohne Browser laufen.
import { alsJson, ausJson, leereDaten } from '../domain/backup';
import { bereinigeSpaltenAuswahl } from '../domain/spalten';
import type { AppDaten } from '../domain/types';

export const SPEICHER_SCHLUESSEL = 'handytarif-vergleich';
export const DEFEKT_SCHLUESSEL = 'handytarif-vergleich-defekt';
// Anzeige-Einstellung, gehört nicht zum Backup
export const SPALTEN_SCHLUESSEL = 'handytarif-vergleich-spalten';

export type Speicher = Pick<Storage, 'getItem' | 'setItem'>;

export interface Ladeergebnis {
    daten: AppDaten;
    // Gesetzt, wenn gespeicherte Daten nicht gelesen werden konnten.
    // Die Rohdaten liegen dann unter DEFEKT_SCHLUESSEL und werden nicht überschrieben.
    warnung?: string;
}

export function laden(speicher: Speicher): Ladeergebnis {
    let roh: string | null;
    try {
        roh = speicher.getItem(SPEICHER_SCHLUESSEL);
    } catch {
        return { daten: leereDaten(), warnung: 'Der Browser-Speicher ist nicht verfügbar. Es wird nichts gespeichert.' };
    }
    if (roh === null) return { daten: leereDaten() };

    const r = ausJson(roh);
    if (r.ok) return { daten: r.wert };

    try {
        speicher.setItem(DEFEKT_SCHLUESSEL, roh);
    } catch {
        // Sichern ging nicht; die Warnung unten weist trotzdem auf das Problem hin.
    }
    return {
        daten: leereDaten(),
        warnung: `Gespeicherte Daten konnten nicht gelesen werden (${r.fehler[0]}). Sie wurden unter „${DEFEKT_SCHLUESSEL}“ im Browser-Speicher gesichert. Es wird mit leeren Daten begonnen.`,
    };
}

// Liefert eine Fehlermeldung oder undefined bei Erfolg.
export function speichern(speicher: Speicher, daten: AppDaten): string | undefined {
    try {
        speicher.setItem(SPEICHER_SCHLUESSEL, alsJson(daten));
        return undefined;
    } catch (e) {
        return `Speichern fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`;
    }
}

// Gewählte Tabellenspalten. Fehlt oder kaputt → Standardauswahl.
export function ladeSpaltenAuswahl(speicher: Speicher): string[] {
    try {
        const roh = speicher.getItem(SPALTEN_SCHLUESSEL);
        return bereinigeSpaltenAuswahl(roh === null ? null : JSON.parse(roh));
    } catch {
        return bereinigeSpaltenAuswahl(null);
    }
}

// Fehler werden ignoriert: Die Auswahl gilt dann nur bis zum Neuladen.
export function speichereSpaltenAuswahl(speicher: Speicher, ids: string[]): void {
    try {
        speicher.setItem(SPALTEN_SCHLUESSEL, JSON.stringify(ids));
    } catch {
        // bewusst leer
    }
}

// localStorage kann fehlen oder beim Zugriff werfen (z. B. gesperrte Website-Daten).
export function browserSpeicher(): Speicher {
    try {
        return window.localStorage;
    } catch {
        return {
            getItem: () => {
                throw new Error('localStorage nicht verfügbar');
            },
            setItem: () => {
                throw new Error('localStorage nicht verfügbar');
            },
        };
    }
}
