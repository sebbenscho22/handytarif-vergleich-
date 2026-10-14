// Umwandlung zwischen Formular-Eingaben (alles Text) und dem Datenmodell, inkl. Prüfung.
import type { Angebot, Geraet, Netztechnik, Rabatt, Tarif } from './types';
import { centAlsEingabe, parseEuro, parseGanzzahl, parseKontingent } from './zahlen';

export type Ergebnis<T> = { ok: true; wert: T } | { ok: false; fehler: string[] };

function ergebnis<T>(wert: T, fehler: string[]): Ergebnis<T> {
    return fehler.length > 0 ? { ok: false, fehler } : { ok: true, wert };
}

// Entfernt Felder mit undefined, damit leere optionale Angaben nicht im Objekt stehen.
function ohneLeere<T extends object>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function leerZuUndefined(text: string): string | undefined {
    const t = text.trim();
    return t === '' ? undefined : t;
}

// Leeres Feld → 0, sonst muss es ein gültiger Betrag sein.
function euroOderNull(text: string, feld: string, fehler: string[]): number {
    if (text.trim() === '') return 0;
    const cent = parseEuro(text);
    if (cent === null) {
        fehler.push(`${feld}: keine gültige Euro-Angabe.`);
        return 0;
    }
    return cent;
}

function euroPflicht(text: string, feld: string, fehler: string[]): number {
    if (text.trim() === '') {
        fehler.push(`${feld} fehlt.`);
        return 0;
    }
    return euroOderNull(text, feld, fehler);
}

function monateOderNull(text: string, feld: string, fehler: string[]): number {
    if (text.trim() === '') return 0;
    const n = parseGanzzahl(text);
    if (n === null) {
        fehler.push(`${feld}: ganze Zahl erwartet.`);
        return 0;
    }
    return n;
}

// ---------- Rabatte ----------

export interface RabattEingabe {
    bezeichnung: string;
    art: Rabatt['art'];
    betrag: string;
    dauer: string; // nur bei 'monatlich'; leer = gesamter Zeitraum
}

export const LEERER_RABATT: RabattEingabe = { bezeichnung: '', art: 'monatlich', betrag: '', dauer: '' };

export function rabattEingabenAus(rabatte: Rabatt[]): RabattEingabe[] {
    return rabatte.map((r) => ({
        bezeichnung: r.bezeichnung,
        art: r.art,
        betrag: centAlsEingabe(r.betragCent),
        dauer: r.dauerMonate?.toString() ?? '',
    }));
}

export function rabatteAuswerten(eingaben: RabattEingabe[]): Ergebnis<Rabatt[]> {
    const rabatte: Rabatt[] = [];
    const fehler: string[] = [];
    eingaben.forEach((e, i) => {
        const name = e.bezeichnung.trim() || `Rabatt ${i + 1}`;
        const betragCent = euroPflicht(e.betrag, `${name}: Betrag`, fehler);
        const rabatt: Rabatt = { bezeichnung: name, art: e.art, betragCent };
        if (e.art === 'monatlich' && e.dauer.trim() !== '') {
            const dauer = parseGanzzahl(e.dauer);
            if (dauer === null || dauer < 1) {
                fehler.push(`${name}: Dauer muss eine ganze Zahl ab 1 sein oder leer bleiben.`);
            } else {
                rabatt.dauerMonate = dauer;
            }
        }
        rabatte.push(rabatt);
    });
    return ergebnis(rabatte, fehler);
}

// ---------- Tarif ----------

export interface TarifEingabe {
    anbieter: string;
    name: string;
    preisMonatlich: string;
    bindungMonate: string;
    einmalig: string;
    servicepauschaleJahr: string;
    datenOesterreichGb: string;
    datenEuGb: string;
    netz: '' | Netztechnik;
    preisStand: string;
    notiz: string;
    rabatte: RabattEingabe[];
}

export function tarifEingabeAus(t?: Tarif): TarifEingabe {
    const k = (v: Tarif['datenOesterreichGb']) => (v === undefined ? '' : v.toString().replace('.', ','));
    return {
        anbieter: t?.anbieter ?? '',
        name: t?.name ?? '',
        preisMonatlich: t ? centAlsEingabe(t.preisMonatlichCent) : '',
        bindungMonate: t?.bindungMonate.toString() ?? '',
        einmalig: t ? centAlsEingabe(t.einmaligCent) : '',
        servicepauschaleJahr: t ? centAlsEingabe(t.servicepauschaleJahrCent) : '',
        datenOesterreichGb: k(t?.datenOesterreichGb),
        datenEuGb: k(t?.datenEuGb),
        netz: t?.netz ?? '',
        preisStand: t?.preisStand ?? '',
        notiz: t?.notiz ?? '',
        rabatte: rabattEingabenAus(t?.rabatte ?? []),
    };
}

// `alt`: bisheriger Tarif. Felder, die das Formular nicht kennt (z. B. Minuten), bleiben erhalten.
export function tarifAuswerten(e: TarifEingabe, id: string, alt?: Tarif): Ergebnis<Tarif> {
    const fehler: string[] = [];
    if (e.anbieter.trim() === '') fehler.push('Anbieter fehlt.');
    if (e.name.trim() === '') fehler.push('Tarifname fehlt.');

    const kontingent = (text: string, feld: string) => {
        const k = parseKontingent(text);
        if (k === null) {
            fehler.push(`${feld}: Zahl oder "unbegrenzt" erwartet.`);
            return undefined;
        }
        return k;
    };

    const rabatte = rabatteAuswerten(e.rabatte);
    if (!rabatte.ok) fehler.push(...rabatte.fehler);

    const tarif: Tarif = ohneLeere({
        ...alt,
        id,
        anbieter: e.anbieter.trim(),
        name: e.name.trim(),
        preisMonatlichCent: euroPflicht(e.preisMonatlich, 'Monatspreis', fehler),
        bindungMonate: monateOderNull(e.bindungMonate, 'Bindung', fehler),
        einmaligCent: euroOderNull(e.einmalig, 'Einmalkosten', fehler),
        servicepauschaleJahrCent: euroOderNull(e.servicepauschaleJahr, 'Servicepauschale', fehler),
        rabatte: rabatte.ok ? rabatte.wert : [],
        datenOesterreichGb: kontingent(e.datenOesterreichGb, 'Daten Österreich'),
        datenEuGb: kontingent(e.datenEuGb, 'Daten EU'),
        netz: e.netz === '' ? undefined : e.netz,
        preisStand: leerZuUndefined(e.preisStand),
        notiz: leerZuUndefined(e.notiz),
    });
    return ergebnis(tarif, fehler);
}

// ---------- Gerät ----------

export interface GeraetEingabe {
    modell: string;
    preisFrei: string;
    preisStand: string;
    notiz: string;
}

export function geraetEingabeAus(g?: Geraet): GeraetEingabe {
    return {
        modell: g?.modell ?? '',
        preisFrei: g ? centAlsEingabe(g.preisFreiCent) : '',
        preisStand: g?.preisStand ?? '',
        notiz: g?.notiz ?? '',
    };
}

export function geraetAuswerten(e: GeraetEingabe, id: string): Ergebnis<Geraet> {
    const fehler: string[] = [];
    if (e.modell.trim() === '') fehler.push('Modell fehlt.');
    const geraet: Geraet = ohneLeere({
        id,
        modell: e.modell.trim(),
        preisFreiCent: euroPflicht(e.preisFrei, 'Preis ohne Vertrag', fehler),
        preisStand: leerZuUndefined(e.preisStand),
        notiz: leerZuUndefined(e.notiz),
    });
    return ergebnis(geraet, fehler);
}

// ---------- Angebot ----------

export interface AngebotEingabe {
    art: Angebot['art'];
    tarifId: string;
    geraetId: string;
    anzahlung: string;
    rateMonatlich: string;
    rateAnzahlMonate: string;
    notiz: string;
    rabatte: RabattEingabe[];
}

export function angebotEingabeAus(a?: Angebot): AngebotEingabe {
    return {
        art: a?.art ?? 'simOnly',
        tarifId: a?.tarifId ?? '',
        geraetId: a && a.art !== 'simOnly' ? a.geraetId : '',
        anzahlung: a?.art === 'geraetVertrag' ? centAlsEingabe(a.anzahlungCent) : '',
        rateMonatlich: a?.art === 'geraetVertrag' ? centAlsEingabe(a.rateMonatlichCent) : '',
        rateAnzahlMonate: a?.art === 'geraetVertrag' ? a.rateAnzahlMonate.toString() : '',
        notiz: a?.notiz ?? '',
        rabatte: rabattEingabenAus(a?.rabatte ?? []),
    };
}

export function angebotAuswerten(e: AngebotEingabe, id: string): Ergebnis<Angebot> {
    const fehler: string[] = [];
    if (e.tarifId === '') fehler.push('Tarif fehlt.');
    if (e.art !== 'simOnly' && e.geraetId === '') fehler.push('Gerät fehlt.');

    const rabatte = rabatteAuswerten(e.rabatte);
    if (!rabatte.ok) fehler.push(...rabatte.fehler);

    const basis = {
        id,
        tarifId: e.tarifId,
        rabatte: rabatte.ok ? rabatte.wert : [],
        notiz: leerZuUndefined(e.notiz),
    };

    let angebot: Angebot;
    if (e.art === 'simOnly') {
        angebot = { ...basis, art: 'simOnly' };
    } else if (e.art === 'geraetFrei') {
        angebot = { ...basis, art: 'geraetFrei', geraetId: e.geraetId };
    } else {
        angebot = {
            ...basis,
            art: 'geraetVertrag',
            geraetId: e.geraetId,
            anzahlungCent: euroOderNull(e.anzahlung, 'Anzahlung', fehler),
            rateMonatlichCent: euroOderNull(e.rateMonatlich, 'Monatsrate', fehler),
            rateAnzahlMonate: monateOderNull(e.rateAnzahlMonate, 'Anzahl Raten', fehler),
        };
    }
    return ergebnis(ohneLeere(angebot), fehler);
}
