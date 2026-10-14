// Spalten der Vergleichstabelle und Filter darüber. Jede Spalte ist ein Feld eines Vergleichstreffers.
import type { VergleichsTreffer } from './vergleich';
import type { Angebot, Kontingent } from './types';
import { formatEuro, formatKontingent, parseEuro, parseKontingent, parseZahl } from './zahlen';

export const ART_TEXT: Record<Angebot['art'], string> = {
    simOnly: 'Nur SIM',
    geraetFrei: 'Gerät frei gekauft',
    geraetVertrag: 'Gerät mit Vertrag',
};

export type SpaltenGruppe = 'Angebot' | 'Kosten' | 'Tarif' | 'Gerät';

interface SpalteBasis {
    id: string;
    titel: string;
    gruppe: SpaltenGruppe;
    hervorgehoben?: boolean; // Gesamtpreis, Anbieter, Tarif, Handy
}

export type Spalte =
    | (SpalteBasis & { typ: 'text'; wert: (t: VergleichsTreffer) => string | undefined })
    | (SpalteBasis & { typ: 'cent'; wert: (t: VergleichsTreffer) => number | undefined })
    | (SpalteBasis & { typ: 'zahl'; einheit: string; wert: (t: VergleichsTreffer) => number | undefined })
    | (SpalteBasis & { typ: 'kontingent'; einheit: string; wert: (t: VergleichsTreffer) => Kontingent | undefined });

function vertrag(t: VergleichsTreffer) {
    return t.angebot.art === 'geraetVertrag' ? t.angebot : undefined;
}

function leerAlsUndefined(s: string | undefined): string | undefined {
    return s === undefined || s.trim() === '' ? undefined : s;
}

export const SPALTEN: Spalte[] = [
    // Hervorgehoben, stehen immer vorne
    { id: 'anbieter', titel: 'Anbieter', gruppe: 'Angebot', typ: 'text', hervorgehoben: true, wert: (t) => t.tarif.anbieter },
    { id: 'tarif', titel: 'Tarif', gruppe: 'Angebot', typ: 'text', hervorgehoben: true, wert: (t) => t.tarif.name },
    { id: 'handy', titel: 'Handy', gruppe: 'Angebot', typ: 'text', hervorgehoben: true, wert: (t) => t.geraet?.modell },
    { id: 'gesamt', titel: 'Gesamtpreis', gruppe: 'Kosten', typ: 'cent', hervorgehoben: true, wert: (t) => t.kosten.gesamtCent },

    { id: 'art', titel: 'Art', gruppe: 'Angebot', typ: 'text', wert: (t) => ART_TEXT[t.angebot.art] },
    {
        id: 'rabattNamen',
        titel: 'Rabatte (Bezeichnung)',
        gruppe: 'Angebot',
        typ: 'text',
        wert: (t) =>
            leerAlsUndefined([...t.tarif.rabatte, ...t.angebot.rabatte].map((r) => r.bezeichnung).join(', ')),
    },
    { id: 'hinweise', titel: 'Hinweise', gruppe: 'Angebot', typ: 'text', wert: (t) => leerAlsUndefined(t.kosten.hinweise.join(' ')) },
    { id: 'notizAngebot', titel: 'Notiz Angebot', gruppe: 'Angebot', typ: 'text', wert: (t) => leerAlsUndefined(t.angebot.notiz) },

    { id: 'proMonat', titel: 'Ø pro Monat', gruppe: 'Kosten', typ: 'cent', wert: (t) => t.kosten.proMonatCent },
    { id: 'mehrkosten', titel: 'Mehrkosten', gruppe: 'Kosten', typ: 'cent', wert: (t) => t.mehrkostenCent },
    { id: 'zeitraum', titel: 'Berechnet für', gruppe: 'Kosten', typ: 'zahl', einheit: 'Mon.', wert: (t) => t.kosten.zeitraumMonate },
    { id: 'tarifkosten', titel: 'Tarifkosten', gruppe: 'Kosten', typ: 'cent', wert: (t) => t.kosten.tarifCent },
    { id: 'rabattSumme', titel: 'Rabatte', gruppe: 'Kosten', typ: 'cent', wert: (t) => t.kosten.rabattCent },
    { id: 'einmalig', titel: 'Einmalkosten', gruppe: 'Kosten', typ: 'cent', wert: (t) => t.kosten.einmaligCent },
    { id: 'servicepauschale', titel: 'Servicepauschale gesamt', gruppe: 'Kosten', typ: 'cent', wert: (t) => t.kosten.servicepauschaleCent },
    { id: 'geraetekosten', titel: 'Gerätekosten', gruppe: 'Kosten', typ: 'cent', wert: (t) => t.kosten.geraetCent },

    { id: 'monatspreis', titel: 'Monatspreis', gruppe: 'Tarif', typ: 'cent', wert: (t) => t.tarif.preisMonatlichCent },
    { id: 'bindung', titel: 'Bindung', gruppe: 'Tarif', typ: 'zahl', einheit: 'Mon.', wert: (t) => t.tarif.bindungMonate },
    { id: 'servicepauschaleJahr', titel: 'Servicepauschale / Jahr', gruppe: 'Tarif', typ: 'cent', wert: (t) => t.tarif.servicepauschaleJahrCent },
    { id: 'datenAt', titel: 'Daten Österreich', gruppe: 'Tarif', typ: 'kontingent', einheit: 'GB', wert: (t) => t.tarif.datenOesterreichGb },
    { id: 'datenEu', titel: 'Daten EU', gruppe: 'Tarif', typ: 'kontingent', einheit: 'GB', wert: (t) => t.tarif.datenEuGb },
    { id: 'netz', titel: 'Netz', gruppe: 'Tarif', typ: 'text', wert: (t) => t.tarif.netz },
    { id: 'netzbetreiber', titel: 'Netzbetreiber', gruppe: 'Tarif', typ: 'text', wert: (t) => leerAlsUndefined(t.tarif.netzbetreiber) },
    { id: 'download', titel: 'Download', gruppe: 'Tarif', typ: 'zahl', einheit: 'Mbit/s', wert: (t) => t.tarif.downloadMbit },
    { id: 'upload', titel: 'Upload', gruppe: 'Tarif', typ: 'zahl', einheit: 'Mbit/s', wert: (t) => t.tarif.uploadMbit },
    { id: 'minutenInland', titel: 'Minuten Inland', gruppe: 'Tarif', typ: 'kontingent', einheit: 'Min.', wert: (t) => t.tarif.minutenInland },
    { id: 'minutenEu', titel: 'Minuten EU', gruppe: 'Tarif', typ: 'kontingent', einheit: 'Min.', wert: (t) => t.tarif.minutenEu },
    { id: 'minutenAusland', titel: 'Minuten Ausland', gruppe: 'Tarif', typ: 'kontingent', einheit: 'Min.', wert: (t) => t.tarif.minutenAusland },
    { id: 'smsInland', titel: 'SMS Inland', gruppe: 'Tarif', typ: 'kontingent', einheit: 'SMS', wert: (t) => t.tarif.smsInland },
    { id: 'smsAusland', titel: 'SMS Ausland', gruppe: 'Tarif', typ: 'kontingent', einheit: 'SMS', wert: (t) => t.tarif.smsAusland },
    { id: 'auslandEu', titel: 'Anruf EU-Ausland', gruppe: 'Tarif', typ: 'zahl', einheit: 'ct/Min.', wert: (t) => t.tarif.auslandEuCentProMinute },
    { id: 'auslandWelt', titel: 'Anruf Welt', gruppe: 'Tarif', typ: 'zahl', einheit: 'ct/Min.', wert: (t) => t.tarif.auslandWeltCentProMinute },
    { id: 'preisStandTarif', titel: 'Preisstand Tarif', gruppe: 'Tarif', typ: 'text', wert: (t) => leerAlsUndefined(t.tarif.preisStand) },
    { id: 'notizTarif', titel: 'Notiz Tarif', gruppe: 'Tarif', typ: 'text', wert: (t) => leerAlsUndefined(t.tarif.notiz) },

    { id: 'preisFrei', titel: 'Gerätepreis frei', gruppe: 'Gerät', typ: 'cent', wert: (t) => t.geraet?.preisFreiCent },
    { id: 'anzahlung', titel: 'Anzahlung', gruppe: 'Gerät', typ: 'cent', wert: (t) => vertrag(t)?.anzahlungCent },
    { id: 'rate', titel: 'Rate / Monat', gruppe: 'Gerät', typ: 'cent', wert: (t) => vertrag(t)?.rateMonatlichCent },
    { id: 'rateMonate', titel: 'Anzahl Raten', gruppe: 'Gerät', typ: 'zahl', einheit: 'Mon.', wert: (t) => vertrag(t)?.rateAnzahlMonate },
    { id: 'preisStandGeraet', titel: 'Preisstand Gerät', gruppe: 'Gerät', typ: 'text', wert: (t) => leerAlsUndefined(t.geraet?.preisStand) },
    { id: 'notizGeraet', titel: 'Notiz Gerät', gruppe: 'Gerät', typ: 'text', wert: (t) => leerAlsUndefined(t.geraet?.notiz) },
];

export const SPALTEN_GRUPPEN: SpaltenGruppe[] = ['Angebot', 'Kosten', 'Tarif', 'Gerät'];

export const STANDARD_SPALTEN: string[] = ['anbieter', 'tarif', 'handy', 'gesamt', 'art', 'proMonat', 'bindung', 'datenAt'];

// Unbekannte oder doppelte IDs fallen weg, Reihenfolge folgt SPALTEN. Kein gültiges Array → Standard.
export function bereinigeSpaltenAuswahl(roh: unknown): string[] {
    if (!Array.isArray(roh)) return [...STANDARD_SPALTEN];
    const gewaehlt = new Set(roh.filter((x): x is string => typeof x === 'string'));
    return SPALTEN.filter((s) => gewaehlt.has(s.id)).map((s) => s.id);
}

// Zellinhalt als Text; fehlende Angabe → "–"
export function formatZelle(spalte: Spalte, t: VergleichsTreffer): string {
    switch (spalte.typ) {
        case 'text':
            return spalte.wert(t) ?? '–';
        case 'cent': {
            const w = spalte.wert(t);
            return w === undefined ? '–' : formatEuro(w);
        }
        case 'zahl': {
            const w = spalte.wert(t);
            return w === undefined ? '–' : `${w.toString().replace('.', ',')} ${spalte.einheit}`;
        }
        case 'kontingent':
            return formatKontingent(spalte.wert(t), spalte.einheit);
    }
}

// ---------- Filter ----------

// Text: enthält (ohne Groß-/Kleinschreibung). Zahlen: von/bis inklusive, in der Einheit der Spalte
// (Cent bei Geldbeträgen, unbegrenzt = Infinity). Ist ein Filter gesetzt, fallen Treffer ohne Angabe heraus.
export interface SpaltenFilter {
    text?: string;
    min?: number;
    max?: number;
}

export type Filter = Record<string, SpaltenFilter>;

// Rohe Texte aus den Eingabefeldern
export interface FilterEingabe {
    text?: string;
    min?: string;
    max?: string;
}

export type FilterEingaben = Record<string, FilterEingabe>;

// "" → undefined (keine Grenze), ungültig → null
export function parseFilterGrenze(spalte: Spalte, text: string): number | undefined | null {
    if (text.trim() === '') return undefined;
    switch (spalte.typ) {
        case 'text':
            return null;
        case 'cent':
            return parseEuro(text);
        case 'zahl':
            return parseZahl(text) ?? null;
        case 'kontingent': {
            const k = parseKontingent(text);
            return k === 'unbegrenzt' ? Infinity : (k ?? null);
        }
    }
}

// Ungültige Grenzen werden ignoriert und als "<id>.min" bzw. "<id>.max" gemeldet.
export function filterAusEingaben(eingaben: FilterEingaben): { filter: Filter; ungueltig: string[] } {
    const filter: Filter = {};
    const ungueltig: string[] = [];
    for (const spalte of SPALTEN) {
        const e = eingaben[spalte.id];
        if (!e) continue;
        const f: SpaltenFilter = {};
        if (spalte.typ === 'text') {
            const text = e.text?.trim() ?? '';
            if (text !== '') f.text = text;
        } else {
            for (const grenze of ['min', 'max'] as const) {
                const roh = e[grenze];
                if (roh === undefined) continue;
                const wert = parseFilterGrenze(spalte, roh);
                if (wert === null) ungueltig.push(`${spalte.id}.${grenze}`);
                else if (wert !== undefined) f[grenze] = wert;
            }
        }
        if (Object.keys(f).length > 0) filter[spalte.id] = f;
    }
    return { filter, ungueltig };
}

function passt(spalte: Spalte, f: SpaltenFilter, t: VergleichsTreffer): boolean {
    if (spalte.typ === 'text') {
        if (f.text === undefined) return true;
        const w = spalte.wert(t);
        return w !== undefined && w.toLowerCase().includes(f.text.toLowerCase());
    }
    if (f.min === undefined && f.max === undefined) return true;
    const roh = spalte.wert(t);
    if (roh === undefined) return false;
    const w = roh === 'unbegrenzt' ? Infinity : roh;
    return (f.min === undefined || w >= f.min) && (f.max === undefined || w <= f.max);
}

// Behält die Reihenfolge. Mehrkosten beziehen sich danach auf das günstigste verbliebene Angebot.
export function filtereTreffer(treffer: VergleichsTreffer[], filter: Filter): VergleichsTreffer[] {
    const aktiv = SPALTEN.filter((s) => filter[s.id] !== undefined);
    const uebrig = treffer.filter((t) => aktiv.every((s) => passt(s, filter[s.id], t)));
    const guenstigst = Math.min(...uebrig.map((t) => t.kosten.gesamtCent));
    return uebrig.map((t) => ({ ...t, mehrkostenCent: t.kosten.gesamtCent - guenstigst }));
}
