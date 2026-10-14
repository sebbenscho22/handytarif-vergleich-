import { LEERER_RABATT, type RabattEingabe } from '../domain/formulare';
import type { Rabatt } from '../domain/types';

interface Props {
    titel: string;
    zeilen: RabattEingabe[];
    onChange: (zeilen: RabattEingabe[]) => void;
}

export function RabattEditor({ titel, zeilen, onChange }: Props) {
    function aendern(i: number, teil: Partial<RabattEingabe>) {
        onChange(zeilen.map((z, j) => (j === i ? { ...z, ...teil } : z)));
    }

    return (
        <fieldset className="rabatte">
            <legend>{titel}</legend>
            {zeilen.length === 0 && <p className="leer">Keine Rabatte.</p>}
            {zeilen.map((z, i) => (
                <div className="rabatt-zeile" key={i}>
                    <input
                        aria-label="Bezeichnung"
                        placeholder="Bezeichnung"
                        value={z.bezeichnung}
                        onChange={(e) => aendern(i, { bezeichnung: e.target.value })}
                    />
                    <select
                        aria-label="Art"
                        value={z.art}
                        onChange={(e) => aendern(i, { art: e.target.value as Rabatt['art'] })}
                    >
                        <option value="monatlich">monatlich</option>
                        <option value="einmalig">einmalig</option>
                    </select>
                    <input
                        aria-label="Betrag in Euro"
                        placeholder="Betrag €"
                        inputMode="decimal"
                        value={z.betrag}
                        onChange={(e) => aendern(i, { betrag: e.target.value })}
                    />
                    {z.art === 'monatlich' && (
                        <input
                            aria-label="Dauer in Monaten"
                            placeholder="Monate (leer = immer)"
                            inputMode="numeric"
                            value={z.dauer}
                            onChange={(e) => aendern(i, { dauer: e.target.value })}
                        />
                    )}
                    <button type="button" onClick={() => onChange(zeilen.filter((_, j) => j !== i))}>
                        Entfernen
                    </button>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...zeilen, LEERER_RABATT])}>
                + Rabatt
            </button>
        </fieldset>
    );
}
