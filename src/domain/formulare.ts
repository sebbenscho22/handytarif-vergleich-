// Umwandlung zwischen Formular-Eingaben (alles Text) und dem Datenmodell, inkl. Prüfung.
import type { Angebot, Geraet, Netztechnik, Rabatt, Tarif } from './types';
import { type Fehler, fehlerAlsText, pruefeAngebot, pruefeGeraet, pruefeTarif } from './validierung';
import { centAlsEingabe, parseEuro, parseGanzzahl, parseKontingent, parseZahl, zahlAlsEingabe } from './zahlen';

export type Ergebnis<T> = { ok: true; wert: T } | { ok: false; fehler: string[] };

// Erst die verständlichen Formularfehler. Gibt es keine, prüft `modell` das fertige Objekt
// mit denselben Regeln wie der Import. So kann nichts gespeichert werden, was später beim Laden scheitert.
function ergebnis<T>(wert: T, fehler: string[], modell: (wert: T) => Fehler[]): Ergebnis<T> {
    const alle = fehler.length > 0 ? fehler : fehlerAlsText(modell(wert));
    return alle.length > 0 ? { ok: false, fehler: alle } : { ok: true, wert };
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
    // Rabatte werden mit dem Tarif bzw. Angebot geprüft, dem sie gehören.
    return ergebnis(rabatte, fehler, () => []);
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
    downloadMbit: string;
    uploadMbit: string;
    minutenInland: string;
    minutenAusland: string;
    smsInland: string;
    smsAusland: string;
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
        downloadMbit: zahlAlsEingabe(t?.downloadMbit),
        uploadMbit: zahlAlsEingabe(t?.uploadMbit),
        minutenInland: k(t?.minutenInland),
        minutenAusland: k(t?.minutenAusland),
        smsInland: k(t?.smsInland),
        smsAusland: k(t?.smsAusland),
        netz: t?.netz ?? '',
        preisStand: t?.preisStand ?? '',
        notiz: t?.notiz ?? '',
        rabatte: rabattEingabenAus(t?.rabatte ?? []),
    };
}

// `alt`: bisheriger Tarif. Felder, die das Formular nicht kennt (z. B. Minuten EU), bleiben erhalten.
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
    const zahl = (text: string, feld: string) => {
        const n = parseZahl(text);
        if (n === null) {
            fehler.push(`${feld}: Zahl erwartet.`);
            return undefined;
        }
        return n;
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
        downloadMbit: zahl(e.downloadMbit, 'Download'),
        uploadMbit: zahl(e.uploadMbit, 'Upload'),
        minutenInland: kontingent(e.minutenInland, 'Minuten Österreich'),
        minutenAusland: kontingent(e.minutenAusland, 'Minuten Ausland'),
        smsInland: kontingent(e.smsInland, 'SMS Österreich'),
        smsAusland: kontingent(e.smsAusland, 'SMS Ausland'),
        netz: e.netz === '' ? undefined : e.netz,
        preisStand: leerZuUndefined(e.preisStand),
        notiz: leerZuUndefined(e.notiz),
    });
    return ergebnis(tarif, fehler, pruefeTarif);
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
    return ergebnis(geraet, fehler, pruefeGeraet);
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
        const rateMonatlichCent = euroOderNull(e.rateMonatlich, 'Monatsrate', fehler);
        const rateAnzahlMonate = monateOderNull(e.rateAnzahlMonate, 'Anzahl Raten', fehler);
        if (rateMonatlichCent > 0 !== rateAnzahlMonate > 0) {
            fehler.push('Monatsrate und Anzahl Raten: entweder beide ausfüllen oder beide leer lassen.');
        }
        angebot = {
            ...basis,
            art: 'geraetVertrag',
            geraetId: e.geraetId,
            anzahlungCent: euroOderNull(e.anzahlung, 'Anzahlung', fehler),
            rateMonatlichCent,
            rateAnzahlMonate,
        };
    }
    return ergebnis(ohneLeere(angebot), fehler, pruefeAngebot);
}
