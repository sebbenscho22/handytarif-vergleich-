import { ART_TEXT } from '../domain/spalten';
import type { Angebot, AppDaten } from '../domain/types';

export { ART_TEXT };

export function angebotBeschreibung(a: Angebot, daten: AppDaten): string {
    const tarif = daten.tarife.find((t) => t.id === a.tarifId);
    const tarifText = tarif ? `${tarif.anbieter} ${tarif.name}` : '(Tarif fehlt)';
    if (a.art === 'simOnly') return tarifText;
    const geraet = daten.geraete.find((g) => g.id === a.geraetId);
    return `${tarifText} + ${geraet?.modell ?? '(Gerät fehlt)'}`;
}
