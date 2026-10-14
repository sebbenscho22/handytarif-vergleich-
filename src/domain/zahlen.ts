import type { Kontingent } from './types';

// Cent → "1.234,56 €"
export function formatEuro(cent: number): string {
    if (!Number.isInteger(cent)) {
        throw new Error(`Kein ganzer Cent-Betrag: ${cent}`);
    }
    const vorzeichen = cent < 0 ? '-' : '';
    const abs = Math.abs(cent);
    const euro = Math.floor(abs / 100)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const restCent = (abs % 100).toString().padStart(2, '0');
    return `${vorzeichen}${euro},${restCent} €`;
}

// Cent → "1234,56" (für Eingabefelder, ohne Tausenderpunkt und €)
export function centAlsEingabe(cent: number): string {
    return formatEuro(cent).replace(' €', '').replace(/\./g, '');
}

// "41,05" / "41.05" / "1.234,5" / "41 €" → Cent. Ungültig oder negativ → null.
export function parseEuro(text: string): number | null {
    let t = text.replace(/[\s€]/g, '');
    if (t === '') return null;
    if (t.includes(',')) {
        t = t.replace(/\./g, ''); // Punkte sind Tausendertrenner
    } else if (/^\d+\.\d{1,2}$/.test(t)) {
        t = t.replace('.', ','); // "41.05" mit Dezimalpunkt
    } else {
        t = t.replace(/\./g, ''); // "1.234" = 1234
    }
    const m = /^(\d+)(?:,(\d{1,2}))?$/.exec(t);
    if (!m) return null;
    return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

// Nicht-negative ganze Zahl, z. B. Monate. Ungültig → null.
export function parseGanzzahl(text: string): number | null {
    const t = text.trim();
    if (!/^\d+$/.test(t)) return null;
    return Number(t);
}

// "" → undefined (keine Angabe), "300" / "12,5" / "12.5" → Zahl ab 0. Ungültig → null.
export function parseZahl(text: string): number | undefined | null {
    const t = text.trim();
    if (t === '') return undefined;
    if (!/^\d+([.,]\d+)?$/.test(t)) return null;
    return Number(t.replace(',', '.'));
}

// "" → undefined (keine Angabe), "unbegrenzt"/"u"/"∞" → 'unbegrenzt', "20" / "20,5" → Zahl.
// Ungültig → null.
export function parseKontingent(text: string): Kontingent | undefined | null {
    const t = text.trim().toLowerCase();
    if (t === 'unbegrenzt' || t === 'u' || t === '∞') return 'unbegrenzt';
    return parseZahl(t);
}

// Zahl → "12,5" (für Eingabefelder)
export function zahlAlsEingabe(n: number | undefined): string {
    return n === undefined ? '' : n.toString().replace('.', ',');
}

export function formatKontingent(k: Kontingent | undefined, einheit: string): string {
    if (k === undefined) return '–';
    if (k === 'unbegrenzt') return 'unbegrenzt';
    return `${k.toString().replace('.', ',')} ${einheit}`;
}
