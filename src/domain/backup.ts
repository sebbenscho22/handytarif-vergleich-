// Prüfen und Umwandeln der gespeicherten Daten (localStorage und JSON-Backup).
// Alles, was von außen kommt, ist unknown, bis es hier geprüft wurde.
import type { Ergebnis } from './formulare';
import type { AppDaten } from './types';

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
    return pruefeAppDaten(wert);
}

// ---------- Prüfung ----------

type Obj = Record<string, unknown>;

function istObjekt(v: unknown): v is Obj {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

class Pruefer {
    fehler: string[] = [];

    melde(pfad: string, text: string) {
        this.fehler.push(`${pfad}: ${text}`);
    }

    text(o: Obj, feld: string, pfad: string, pflicht = true) {
        const v = o[feld];
        if (v === undefined && !pflicht) return;
        if (typeof v !== 'string' || (pflicht && v.trim() === '')) this.melde(`${pfad}.${feld}`, 'Text erwartet.');
    }

    ganzzahl(o: Obj, feld: string, pfad: string, pflicht = true, min = 0) {
        const v = o[feld];
        if (v === undefined && !pflicht) return;
        if (typeof v !== 'number' || !Number.isInteger(v) || v < min) {
            this.melde(`${pfad}.${feld}`, `ganze Zahl ab ${min} erwartet.`);
        }
    }

    kontingent(o: Obj, feld: string, pfad: string) {
        const v = o[feld];
        if (v === undefined || v === 'unbegrenzt') return;
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
            this.melde(`${pfad}.${feld}`, 'Zahl ab 0 oder "unbegrenzt" erwartet.');
        }
    }

    auswahl(o: Obj, feld: string, pfad: string, erlaubt: readonly string[], pflicht = true) {
        const v = o[feld];
        if (v === undefined && !pflicht) return;
        if (typeof v !== 'string' || !erlaubt.includes(v)) {
            this.melde(`${pfad}.${feld}`, `einer von ${erlaubt.join(', ')} erwartet.`);
        }
    }

    liste(o: Obj, feld: string, pfad: string, eintrag: (v: unknown, pfad: string) => void) {
        const v = o[feld];
        if (!Array.isArray(v)) {
            this.melde(`${pfad}.${feld}`, 'Liste erwartet.');
            return;
        }
        v.forEach((x, i) => eintrag(x, `${pfad}.${feld}[${i}]`));
    }

    objekt(v: unknown, pfad: string): v is Obj {
        if (istObjekt(v)) return true;
        this.melde(pfad, 'Objekt erwartet.');
        return false;
    }

    rabatt = (v: unknown, pfad: string) => {
        if (!this.objekt(v, pfad)) return;
        this.text(v, 'bezeichnung', pfad);
        this.auswahl(v, 'art', pfad, ['monatlich', 'einmalig']);
        this.ganzzahl(v, 'betragCent', pfad);
        this.ganzzahl(v, 'dauerMonate', pfad, false, 1);
    };

    tarif = (v: unknown, pfad: string) => {
        if (!this.objekt(v, pfad)) return;
        for (const f of ['id', 'anbieter', 'name']) this.text(v, f, pfad);
        for (const f of ['preisMonatlichCent', 'bindungMonate', 'einmaligCent', 'servicepauschaleJahrCent']) {
            this.ganzzahl(v, f, pfad);
        }
        this.liste(v, 'rabatte', pfad, this.rabatt);
        for (const f of ['datenOesterreichGb', 'datenEuGb', 'minutenInland', 'minutenEu', 'minutenAusland', 'smsInland']) {
            this.kontingent(v, f, pfad);
        }
        this.auswahl(v, 'netz', pfad, ['LTE', '5G'], false);
        for (const f of ['downloadMbit', 'uploadMbit', 'auslandEuCentProMinute', 'auslandWeltCentProMinute']) {
            this.ganzzahl(v, f, pfad, false);
        }
        for (const f of ['netzbetreiber', 'preisStand', 'notiz']) this.text(v, f, pfad, false);
    };

    geraet = (v: unknown, pfad: string) => {
        if (!this.objekt(v, pfad)) return;
        this.text(v, 'id', pfad);
        this.text(v, 'modell', pfad);
        this.ganzzahl(v, 'preisFreiCent', pfad);
        this.text(v, 'preisStand', pfad, false);
        this.text(v, 'notiz', pfad, false);
    };

    angebot = (v: unknown, pfad: string) => {
        if (!this.objekt(v, pfad)) return;
        this.text(v, 'id', pfad);
        this.text(v, 'tarifId', pfad);
        this.liste(v, 'rabatte', pfad, this.rabatt);
        this.text(v, 'notiz', pfad, false);
        this.auswahl(v, 'art', pfad, ['simOnly', 'geraetFrei', 'geraetVertrag']);
        if (v.art === 'geraetFrei' || v.art === 'geraetVertrag') this.text(v, 'geraetId', pfad);
        if (v.art === 'geraetVertrag') {
            for (const f of ['anzahlungCent', 'rateMonatlichCent', 'rateAnzahlMonate']) this.ganzzahl(v, f, pfad);
        }
    };

    eindeutigeIds(o: Obj, feld: string) {
        const liste = o[feld];
        if (!Array.isArray(liste)) return;
        const gesehen = new Set<unknown>();
        for (const x of liste) {
            const id = istObjekt(x) ? x.id : undefined;
            if (gesehen.has(id)) this.melde(feld, `ID "${String(id)}" kommt mehrfach vor.`);
            gesehen.add(id);
        }
    }
}

export function pruefeAppDaten(wert: unknown): Ergebnis<AppDaten> {
    if (!istObjekt(wert)) return { ok: false, fehler: ['Die Daten sind kein Objekt.'] };
    if (wert.schemaVersion !== SCHEMA_VERSION) {
        return {
            ok: false,
            fehler: [`Unbekannte schemaVersion "${String(wert.schemaVersion)}", erwartet ${SCHEMA_VERSION}.`],
        };
    }
    const p = new Pruefer();
    p.ganzzahl(wert, 'vergleichszeitraumMonate', 'daten', true, 1);
    p.liste(wert, 'tarife', 'daten', p.tarif);
    p.liste(wert, 'geraete', 'daten', p.geraet);
    p.liste(wert, 'angebote', 'daten', p.angebot);
    for (const f of ['tarife', 'geraete', 'angebote']) p.eindeutigeIds(wert, f);

    return p.fehler.length > 0 ? { ok: false, fehler: p.fehler } : { ok: true, wert: wert as unknown as AppDaten };
}
