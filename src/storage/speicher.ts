// Zugriff auf localStorage. Der Speicher wird übergeben, damit die Tests ohne Browser laufen.
import { alsJson, ausJson, leereDaten } from '../domain/backup';
import { pruefeSyncStand, type SyncStand } from '../domain/sync';
import type { AppDaten } from '../domain/types';

export const SPEICHER_SCHLUESSEL = 'handytarif-vergleich';
export const DEFEKT_SCHLUESSEL = 'handytarif-vergleich-defekt';
export const SYNC_SCHLUESSEL = 'handytarif-vergleich-sync';

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

// Stand des Cloud-Abgleichs. Gehört nicht zum Backup, darum ein eigener Schlüssel.
export function syncStandLaden(speicher: Speicher): SyncStand | null {
    try {
        const roh = speicher.getItem(SYNC_SCHLUESSEL);
        return roh === null ? null : pruefeSyncStand(JSON.parse(roh));
    } catch {
        return null;
    }
}

export function syncStandSpeichern(speicher: Speicher, stand: SyncStand): void {
    try {
        speicher.setItem(SYNC_SCHLUESSEL, JSON.stringify(stand));
    } catch {
        // Ohne gespeicherten Stand fragt die App beim nächsten Start nach, statt Daten zu verlieren.
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
