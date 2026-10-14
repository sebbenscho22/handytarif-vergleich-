import { useState } from 'react';
import { SPALTEN, SPALTEN_GRUPPEN, STANDARD_SPALTEN, formatZelle, type Spalte } from '../domain/spalten';
import type { VergleichsTreffer } from '../domain/vergleich';
import { browserSpeicher, ladeSpaltenAuswahl, speichereSpaltenAuswahl } from '../storage/speicher';

function zellKlasse(s: Spalte): string | undefined {
    const klassen = [s.typ !== 'text' && 'zahl', s.hervorgehoben && 'hervor'].filter(Boolean);
    return klassen.length > 0 ? klassen.join(' ') : undefined;
}

// Tabellenansicht mit frei wählbaren Spalten. Die Treffer kommen bereits gefiltert und sortiert.
export function VergleichTabelle({ treffer }: { treffer: VergleichsTreffer[] }) {
    const [auswahl, setAuswahl] = useState<string[]>(() => ladeSpaltenAuswahl(browserSpeicher()));

    function aendern(neu: string[]) {
        const sortiert = SPALTEN.filter((s) => neu.includes(s.id)).map((s) => s.id);
        setAuswahl(sortiert);
        speichereSpaltenAuswahl(browserSpeicher(), sortiert);
    }

    function umschalten(id: string) {
        aendern(auswahl.includes(id) ? auswahl.filter((x) => x !== id) : [...auswahl, id]);
    }

    const sichtbar = SPALTEN.filter((s) => auswahl.includes(s.id));

    return (
        <>
            <details className="filter">
                <summary>
                    Spalten
                    <span className="zaehler">
                        {sichtbar.length}/{SPALTEN.length}
                    </span>
                </summary>
                <div className="filter-inhalt">
                    {SPALTEN_GRUPPEN.map((gruppe) => (
                        <fieldset key={gruppe} className="filter-gruppe">
                            <legend>{gruppe}</legend>
                            <div className="spalten-wahl">
                                {SPALTEN.filter((s) => s.gruppe === gruppe).map((s) => (
                                    <label key={s.id} className={s.hervorgehoben ? 'hervor' : undefined}>
                                        <input
                                            type="checkbox"
                                            checked={auswahl.includes(s.id)}
                                            onChange={() => umschalten(s.id)}
                                        />
                                        {s.titel}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    ))}
                    <div className="filter-fuss">
                        <button className="leise" onClick={() => aendern(SPALTEN.map((s) => s.id))}>
                            Alle
                        </button>
                        <button className="leise" onClick={() => aendern(STANDARD_SPALTEN)}>
                            Standard
                        </button>
                    </div>
                </div>
            </details>

            {treffer.length > 0 && (
                <div className="tabelle-rahmen">
                    <table className="vergleich-tabelle">
                        <thead>
                            <tr>
                                <th className="zahl">#</th>
                                {sichtbar.map((s) => (
                                    <th key={s.id} className={zellKlasse(s)}>
                                        {s.titel}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {treffer.map((t, i) => {
                                const bester = t.mehrkostenCent === 0;
                                return (
                                    <tr key={t.angebot.id} className={bester ? 'bester' : undefined}>
                                        <td className="zahl">
                                            {bester ? (
                                                <span className="marke gut" title="Günstigste Option">
                                                    ★ {i + 1}
                                                </span>
                                            ) : (
                                                i + 1
                                            )}
                                        </td>
                                        {sichtbar.map((s) => (
                                            <td key={s.id} className={zellKlasse(s)}>
                                                {formatZelle(s, t)}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
