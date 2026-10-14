import type { Angebot, AppDaten } from '../domain/types';

export const ART_TEXT: Record<Angebot['art'], string> = {
    simOnly: 'Nur SIM',
    geraetFrei: 'Gerät frei gekauft',
    geraetVertrag: 'Gerät mit Vertrag',
};

export function angebotBeschreibung(a: Angebot, daten: AppDaten): string {
    const tarif = daten.tarife.find((t) => t.id === a.tarifId);
    const tarifText = tarif ? `${tarif.anbieter} ${tarif.name}` : '(Tarif fehlt)';
    if (a.art === 'simOnly') return tarifText;
    const geraet = daten.geraete.find((g) => g.id === a.geraetId);
    return `${tarifText} + ${geraet?.modell ?? '(Gerät fehlt)'}`;
}
