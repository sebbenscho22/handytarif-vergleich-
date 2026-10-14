// Prüft Daten aus Formularen und aus dem JSON-Import.
// Die Funktionen nehmen bewusst `unknown`, weil eine importierte Datei alles enthalten kann.
// Eine leere Fehlerliste heißt: Die Daten passen zum Modell in types.ts.

export interface Fehler {
    pfad: string;    // z. B. "preisMonatlichCent" oder "tarife[2].rabatte[0].betragCent"
    meldung: string;
}

interface Regel {
    test: (wert: unknown) => boolean;
    meldung: string;
}

function ganzeZahlAbNull(wert: unknown): boolean {
    return Number.isInteger(wert) && (wert as number) >= 0;
}

function zahlAbNull(wert: unknown): boolean {
    return typeof wert === 'number' && Number.isFinite(wert) && wert >= 0;
}

function istIsoDatum(wert: unknown): boolean {
    if (typeof wert !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(wert)) {
        return false;
    }
    const datum = new Date(`${wert}T00:00:00Z`);
    // Fängt ungültige Tage wie 2026-02-30 ab, die Date sonst still verschiebt.
    return !Number.isNaN(datum.getTime()) && datum.toISOString().startsWith(wert);
}

const CENT: Regel = { test: ganzeZahlAbNull, meldung: 'muss ein Betrag in ganzen Cent ab 0 sein' };
const MONATE: Regel = { test: ganzeZahlAbNull, meldung: 'muss eine ganze Zahl ab 0 sein' };
const ZAHL: Regel = { test: zahlAbNull, meldung: 'muss eine Zahl ab 0 sein' };
const TEXT: Regel = {
    test: (w) => typeof w === 'string' && w.trim() !== '',
    meldung: 'darf nicht leer sein',
};
const FREITEXT: Regel = { test: (w) => typeof w === 'string', meldung: 'muss ein Text sein' };
const KONTINGENT: Regel = {
    test: (w) => w === 'unbegrenzt' || zahlAbNull(w),
    meldung: "muss eine Zahl ab 0 oder 'unbegrenzt' sein",
};
const DATUM: Regel = { test: istIsoDatum, meldung: 'muss ein Datum im Format JJJJ-MM-TT sein' };

function istObjekt(wert: unknown): wert is Record<string, unknown> {
    return typeof wert === 'object' && wert !== null && !Array.isArray(wert);
}

function feldPfad(praefix: string, feld: string): string {
    return praefix ? `${praefix}.${feld}` : feld;
}

function pruefeFelder(
    objekt: Record<string, unknown>,
    praefix: string,
    pflicht: Record<string, Regel>,
    optional: Record<string, Regel>,
    fehler: Fehler[],
): void {
    for (const [feld, regel] of Object.entries(pflicht)) {
        if (!regel.test(objekt[feld])) {
            fehler.push({ pfad: feldPfad(praefix, feld), meldung: regel.meldung });
        }
    }
    for (const [feld, regel] of Object.entries(optional)) {
        if (objekt[feld] !== undefined && !regel.test(objekt[feld])) {
            fehler.push({ pfad: feldPfad(praefix, feld), meldung: regel.meldung });
        }
    }
}

function pruefeRabatt(rabatt: unknown, praefix: string, fehler: Fehler[]): void {
    if (!istObjekt(rabatt)) {
        fehler.push({ pfad: praefix, meldung: 'muss ein Rabatt sein' });
        return;
    }
    pruefeFelder(rabatt, praefix, { bezeichnung: TEXT, betragCent: CENT }, {}, fehler);
    if (rabatt.art !== 'monatlich' && rabatt.art !== 'einmalig') {
        fehler.push({ pfad: feldPfad(praefix, 'art'), meldung: "muss 'monatlich' oder 'einmalig' sein" });
    }
    if (rabatt.dauerMonate !== undefined) {
        if (rabatt.art === 'einmalig') {
            fehler.push({ pfad: feldPfad(praefix, 'dauerMonate'), meldung: 'gibt es nur bei monatlichen Rabatten' });
        } else if (!Number.isInteger(rabatt.dauerMonate) || (rabatt.dauerMonate as number) < 1) {
            fehler.push({ pfad: feldPfad(praefix, 'dauerMonate'), meldung: 'muss eine ganze Zahl ab 1 sein' });
        }
    }
}

function pruefeRabatte(rabatte: unknown, praefix: string, fehler: Fehler[]): void {
    const pfad = feldPfad(praefix, 'rabatte');
    if (!Array.isArray(rabatte)) {
        fehler.push({ pfad, meldung: 'muss eine Liste sein' });
        return;
    }
    rabatte.forEach((r, i) => pruefeRabatt(r, `${pfad}[${i}]`, fehler));
}

export function pruefeTarif(tarif: unknown, praefix = ''): Fehler[] {
    const fehler: Fehler[] = [];
    if (!istObjekt(tarif)) {
        return [{ pfad: praefix, meldung: 'muss ein Tarif sein' }];
    }
    pruefeFelder(
        tarif,
        praefix,
        {
            id: TEXT,
            anbieter: TEXT,
            name: TEXT,
            preisMonatlichCent: CENT,
            bindungMonate: MONATE,
            einmaligCent: CENT,
            servicepauschaleJahrCent: CENT,
        },
        {
            datenOesterreichGb: KONTINGENT,
            datenEuGb: KONTINGENT,
            netzbetreiber: FREITEXT,
            downloadMbit: ZAHL,
            uploadMbit: ZAHL,
            minutenInland: KONTINGENT,
            minutenEu: KONTINGENT,
            minutenAusland: KONTINGENT,
            smsInland: KONTINGENT,
            smsAusland: KONTINGENT,
            auslandEuCentProMinute: ZAHL,
            auslandWeltCentProMinute: ZAHL,
            preisStand: DATUM,
            notiz: FREITEXT,
        },
        fehler,
    );
    if (tarif.netz !== undefined && tarif.netz !== 'LTE' && tarif.netz !== '5G') {
        fehler.push({ pfad: feldPfad(praefix, 'netz'), meldung: "muss 'LTE' oder '5G' sein" });
    }
    pruefeRabatte(tarif.rabatte, praefix, fehler);
    return fehler;
}

export function pruefeGeraet(geraet: unknown, praefix = ''): Fehler[] {
    const fehler: Fehler[] = [];
    if (!istObjekt(geraet)) {
        return [{ pfad: praefix, meldung: 'muss ein Gerät sein' }];
    }
    pruefeFelder(
        geraet,
        praefix,
        { id: TEXT, modell: TEXT, preisFreiCent: CENT },
        { preisStand: DATUM, notiz: FREITEXT },
        fehler,
    );
    return fehler;
}

// Prüft nur das Angebot selbst. Ob Tarif und Gerät existieren, prüft pruefeAppDaten.
export function pruefeAngebot(angebot: unknown, praefix = ''): Fehler[] {
    const fehler: Fehler[] = [];
    if (!istObjekt(angebot)) {
        return [{ pfad: praefix, meldung: 'muss ein Angebot sein' }];
    }
    pruefeFelder(angebot, praefix, { id: TEXT, tarifId: TEXT }, { notiz: FREITEXT }, fehler);
    pruefeRabatte(angebot.rabatte, praefix, fehler);

    if (angebot.art === 'simOnly') {
        return fehler;
    }
    if (angebot.art !== 'geraetFrei' && angebot.art !== 'geraetVertrag') {
        fehler.push({
            pfad: feldPfad(praefix, 'art'),
            meldung: "muss 'simOnly', 'geraetFrei' oder 'geraetVertrag' sein",
        });
        return fehler;
    }

    pruefeFelder(angebot, praefix, { geraetId: TEXT }, {}, fehler);

    if (angebot.art === 'geraetVertrag') {
        pruefeFelder(
            angebot,
            praefix,
            { anzahlungCent: CENT, rateMonatlichCent: CENT, rateAnzahlMonate: MONATE },
            {},
            fehler,
        );
        const { rateMonatlichCent: rate, rateAnzahlMonate: anzahl } = angebot;
        if (ganzeZahlAbNull(rate) && ganzeZahlAbNull(anzahl) && ((rate as number) > 0) !== ((anzahl as number) > 0)) {
            fehler.push({
                pfad: feldPfad(praefix, 'rateAnzahlMonate'),
                meldung: 'Rate und Anzahl der Raten müssen beide 0 oder beide größer als 0 sein',
            });
        }
    }
    return fehler;
}

function pruefeEindeutigeIds(liste: unknown[], name: string, fehler: Fehler[]): void {
    const gesehen = new Set<unknown>();
    liste.forEach((eintrag, i) => {
        if (!istObjekt(eintrag) || !TEXT.test(eintrag.id)) {
            return;
        }
        if (gesehen.has(eintrag.id)) {
            fehler.push({ pfad: `${name}[${i}].id`, meldung: 'kommt mehrfach vor' });
        }
        gesehen.add(eintrag.id);
    });
}

// null: Die Liste fehlt; dafür gibt es schon einen Fehler, Verweise darauf werden nicht geprüft.
function idsAus(liste: unknown): Set<unknown> | null {
    return Array.isArray(liste) ? new Set(liste.filter(istObjekt).map((e) => e.id)) : null;
}

function pruefeVerweise(
    angebot: unknown,
    tarifIds: Set<unknown> | null,
    geraetIds: Set<unknown> | null,
    praefix: string,
    fehler: Fehler[],
): void {
    if (!istObjekt(angebot)) {
        return;
    }
    if (tarifIds && TEXT.test(angebot.tarifId) && !tarifIds.has(angebot.tarifId)) {
        fehler.push({ pfad: feldPfad(praefix, 'tarifId'), meldung: 'verweist auf einen Tarif, den es nicht gibt' });
    }
    const mitGeraet = angebot.art === 'geraetFrei' || angebot.art === 'geraetVertrag';
    if (geraetIds && mitGeraet && TEXT.test(angebot.geraetId) && !geraetIds.has(angebot.geraetId)) {
        fehler.push({ pfad: feldPfad(praefix, 'geraetId'), meldung: 'verweist auf ein Gerät, das es nicht gibt' });
    }
}

// Für die Anzeige: "tarife[0].name: darf nicht leer sein"
export function fehlerAlsText(fehler: readonly Fehler[]): string[] {
    return fehler.map((f) => (f.pfad ? `${f.pfad}: ${f.meldung}` : f.meldung));
}

export function pruefeAppDaten(daten: unknown): Fehler[] {
    if (!istObjekt(daten)) {
        return [{ pfad: '', meldung: 'Die Daten sind kein gültiges Objekt.' }];
    }
    if (daten.schemaVersion !== 1) {
        // Bei einer fremden Version sind die übrigen Felder nicht sinnvoll prüfbar.
        return [{ pfad: 'schemaVersion', meldung: 'wird nicht unterstützt (erwartet: 1)' }];
    }

    const fehler: Fehler[] = [];
    if (!Number.isInteger(daten.vergleichszeitraumMonate) || (daten.vergleichszeitraumMonate as number) < 1) {
        fehler.push({ pfad: 'vergleichszeitraumMonate', meldung: 'muss eine ganze Zahl ab 1 sein' });
    }

    const listen: Record<'tarife' | 'geraete' | 'angebote', unknown[]> = { tarife: [], geraete: [], angebote: [] };
    for (const name of ['tarife', 'geraete', 'angebote'] as const) {
        const liste = daten[name];
        if (Array.isArray(liste)) {
            listen[name] = liste;
            pruefeEindeutigeIds(liste, name, fehler);
        } else {
            fehler.push({ pfad: name, meldung: 'muss eine Liste sein' });
        }
    }

    listen.tarife.forEach((t, i) => fehler.push(...pruefeTarif(t, `tarife[${i}]`)));
    listen.geraete.forEach((g, i) => fehler.push(...pruefeGeraet(g, `geraete[${i}]`)));
    const tarifIds = idsAus(daten.tarife);
    const geraetIds = idsAus(daten.geraete);
    listen.angebote.forEach((a, i) => {
        fehler.push(...pruefeAngebot(a, `angebote[${i}]`));
        pruefeVerweise(a, tarifIds, geraetIds, `angebote[${i}]`, fehler);
    });

    return fehler;
}
