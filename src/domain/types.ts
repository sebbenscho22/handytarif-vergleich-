// Alle Geldbeträge: ganze Cent, inkl. USt. Beispiel: 41,05 € = 4105
// Mengen: Zahl oder 'unbegrenzt' (Infinity geht nicht, JSON macht daraus null)
export type Kontingent = number | 'unbegrenzt';

export type Netztechnik = 'LTE' | '5G';

export interface Rabatt {
    bezeichnung: string;       // z. B. "Online-Rabatt"
    art: 'monatlich' | 'einmalig';
    betragCent: number;        // positiv = Ersparnis
    dauerMonate?: number;      // nur bei 'monatlich'; fehlt = gesamter Vergleichszeitraum
}

export interface Tarif {
    id: string;
    anbieter: string;
    name: string;
    preisMonatlichCent: number;        // regulärer Preis (der "reale" Preis wird berechnet)
    bindungMonate: number;             // 0 = keine Mindestbindung
    einmaligCent: number;              // Aktivierung, SIM usw.
    servicepauschaleJahrCent: number;
    rabatte: Rabatt[];                 // gelten immer für diesen Tarif
    datenOesterreichGb?: Kontingent;
    datenEuGb?: Kontingent;            // Roaming-Volumen EU
    netz?: Netztechnik;
    netzbetreiber?: string;
    downloadMbit?: number;
    uploadMbit?: number;
    minutenInland?: Kontingent;
    minutenEu?: Kontingent;
    minutenAusland?: Kontingent;
    smsInland?: Kontingent;
    smsAusland?: Kontingent;
    auslandEuCentProMinute?: number;   // Anzeige/Vergleich, nicht Teil der Gesamtkosten
    auslandWeltCentProMinute?: number; // dito
    preisStand?: string;               // ISO-Datum, z. B. "2026-10-14"
    notiz?: string;
}

export interface Geraet {
    id: string;
    modell: string;            // inkl. Variante, z. B. "Samsung Galaxy S26 256 GB"
    preisFreiCent: number;
    preisStand?: string;
    notiz?: string;
}

// Ein Angebot = die Kombination, die du tatsächlich vergleichst.
interface AngebotBasis {
    id: string;
    tarifId: string;
    rabatte: Rabatt[];         // gelten nur für diese Kombination (z. B. Handy-Bonus)
    notiz?: string;
}

export type Angebot =
    | (AngebotBasis & { art: 'simOnly' })
    | (AngebotBasis & { art: 'geraetFrei'; geraetId: string })
    | (AngebotBasis & {
    art: 'geraetVertrag';
    geraetId: string;
    anzahlungCent: number;
    rateMonatlichCent: number;
    rateAnzahlMonate: number;
});

// Das ist exakt der Inhalt von localStorage und der JSON-Datei.
export interface AppDaten {
    schemaVersion: 1;
    vergleichszeitraumMonate: number;  // Standard 24
    tarife: Tarif[];
    geraete: Geraet[];
    angebote: Angebot[];
}