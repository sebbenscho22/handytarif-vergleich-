import { SPALTEN, SPALTEN_GRUPPEN, type FilterEingabe, type FilterEingaben, type Spalte } from '../domain/spalten';

const PLATZHALTER: Record<Spalte['typ'], string> = {
    text: 'enthält …',
    cent: '€',
    zahl: '',
    kontingent: 'Zahl oder unbegrenzt',
};

interface Props {
    eingaben: FilterEingaben;
    ungueltig: string[];
    aktiv: number;
    onChange: (neu: FilterEingaben) => void;
}

export function FilterLeiste({ eingaben, ungueltig, aktiv, onChange }: Props) {
    function setzen(id: string, teil: Partial<FilterEingabe>) {
        onChange({ ...eingaben, [id]: { ...eingaben[id], ...teil } });
    }

    return (
        <details className="filter">
            <summary>
                Filter
                {aktiv > 0 && <span className="zaehler aktiv-zaehler">{aktiv}</span>}
            </summary>
            <div className="filter-inhalt">
                {SPALTEN_GRUPPEN.map((gruppe) => (
                    <fieldset key={gruppe} className="filter-gruppe">
                        <legend>{gruppe}</legend>
                        <div className="filter-felder">
                            {SPALTEN.filter((s) => s.gruppe === gruppe).map((s) => {
                                const e = eingaben[s.id] ?? {};
                                const platzhalter = s.typ === 'zahl' ? s.einheit : PLATZHALTER[s.typ];
                                return (
                                    <div key={s.id} className={s.hervorgehoben ? 'filter-feld hervor' : 'filter-feld'}>
                                        <span className="feld-label">{s.titel}</span>
                                        {s.typ === 'text' ? (
                                            <input
                                                aria-label={s.titel}
                                                placeholder={platzhalter}
                                                value={e.text ?? ''}
                                                onChange={(ev) => setzen(s.id, { text: ev.target.value })}
                                            />
                                        ) : (
                                            <div className="von-bis">
                                                {(['min', 'max'] as const).map((g) => (
                                                    <input
                                                        key={g}
                                                        aria-label={`${s.titel} ${g === 'min' ? 'von' : 'bis'}`}
                                                        placeholder={`${g === 'min' ? 'von' : 'bis'} ${platzhalter}`.trim()}
                                                        value={e[g] ?? ''}
                                                        aria-invalid={ungueltig.includes(`${s.id}.${g}`)}
                                                        onChange={(ev) => setzen(s.id, { [g]: ev.target.value })}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </fieldset>
                ))}
                <div className="filter-fuss">
                    {ungueltig.length > 0 && (
                        <span className="fehler">Rot markierte Eingaben sind ungültig und werden ignoriert.</span>
                    )}
                    <button className="leise" disabled={Object.keys(eingaben).length === 0} onClick={() => onChange({})}>
                        Alle Filter zurücksetzen
                    </button>
                </div>
            </div>
        </details>
    );
}
