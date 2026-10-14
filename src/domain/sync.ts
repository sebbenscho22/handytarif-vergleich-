// Entscheidet, wie lokale Daten und Cloud-Daten abgeglichen werden.
import type { AppDaten } from './types';

export interface SyncStand {
    // Revision des Cloud-Stands beim letzten erfolgreichen Abgleich, null = noch nie abgeglichen.
    basis: string | null;
    // true, wenn lokal seit dem letzten Abgleich etwas geändert wurde.
    lokalGeaendert: boolean;
}

export type SyncAktion = 'nichts' | 'hochladen' | 'herunterladen' | 'konflikt';

export function istLeer(daten: AppDaten): boolean {
    return daten.tarife.length + daten.geraete.length + daten.angebote.length === 0;
}

// Ohne gespeicherten Stand gelten vorhandene lokale Daten als Änderung, damit sie nicht stillschweigend
// von der Cloud überschrieben werden.
export function startStand(daten: AppDaten): SyncStand {
    return { basis: null, lokalGeaendert: !istLeer(daten) };
}

// cloudRevision: Revision des Cloud-Dokuments, null = in der Cloud liegt noch nichts.
export function syncAktion(stand: SyncStand, cloudRevision: string | null): SyncAktion {
    if (cloudRevision === null) return 'hochladen';
    if (cloudRevision === stand.basis) return stand.lokalGeaendert ? 'hochladen' : 'nichts';
    // Die Cloud wurde von einem anderen Gerät geändert.
    return stand.lokalGeaendert ? 'konflikt' : 'herunterladen';
}

export function pruefeSyncStand(wert: unknown): SyncStand | null {
    if (typeof wert !== 'object' || wert === null) return null;
    const { basis, lokalGeaendert } = wert as Record<string, unknown>;
    if (basis !== null && typeof basis !== 'string') return null;
    if (typeof lokalGeaendert !== 'boolean') return null;
    return { basis, lokalGeaendert };
}
