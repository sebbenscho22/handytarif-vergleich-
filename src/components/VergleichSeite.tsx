import { useState } from 'react';
import { filterAusEingaben, filtereTreffer, type FilterEingaben } from '../domain/spalten';
import { vergleicheAngebote } from '../domain/vergleich';
import { formatEuro, formatKontingent, parseGanzzahl } from '../domain/zahlen';
import type { AppAktionen } from '../hooks/useAppDaten';
import { ART_TEXT, angebotBeschreibung } from './angebotText';
import { FilterLeiste } from './FilterLeiste';
import { VergleichTabelle } from './VergleichTabelle';

type Ansicht = 'uebersicht' | 'tabelle';

export function VergleichSeite({ app }: { app: AppAktionen }) {
    const { daten } = app;
    const { treffer: alleTreffer, fehler } = vergleicheAngebote(daten);
    const [zeitraumText, setZeitraumText] = useState(daten.vergleichszeitraumMonate.toString());
    const [ansicht, setAnsicht] = useState<Ansicht>('uebersicht');
    const [filterEingaben, setFilterEingaben] = useState<FilterEingaben>({});
    const { filter, ungueltig } = filterAusEingaben(filterEingaben);
    const treffer = filtereTreffer(alleTreffer, filter);
    const filterAktiv = Object.keys(filter).length;

    function zeitraumAendern(text: string) {
        setZeitraumText(text);
        const n = parseGanzzahl(text);
        if (n !== null && n >= 1) app.setZeitraum(n);
    }

    const zeitraumEingabe = parseGanzzahl(zeitraumText);
    const zeitraumUngueltig = zeitraumEingabe === null || zeitraumEingabe < 1;

    return (
        <section className="karte">
            <div className="kopf">
                <div>
                    <h2>Vergleich</h2>
                    <p className="unterzeile">Gesamtkosten über den Zeitraum, günstigstes zuerst.</p>
                </div>
                <label className="zeitraum">
                    Zeitraum
                    <input
                        inputMode="numeric"
                        value={zeitraumText}
                        aria-invalid={zeitraumUngueltig}
                        onChange={(e) => zeitraumAendern(e.target.value)}
                    />
                    Monate
                </label>
            </div>
            {zeitraumUngueltig && <p className="fehler">Zeitraum muss eine ganze Zahl ab 1 sein.</p>}

            {alleTreffer.length === 0 && fehler.length === 0 && (
                <div className="leer">
                    <p>Noch nichts zu vergleichen.</p>
                    <p>Lege Tarife und Geräte an und kombiniere sie unter „Angebote“.</p>
                </div>
            )}

            {alleTreffer.length > 0 && (
                <>
                    <div className="ansicht-leiste">
                        <div className="reiter" role="tablist">
                            {(
                                [
                                    ['uebersicht', 'Übersicht'],
                                    ['tabelle', 'Tabelle'],
                                ] as const
                            ).map(([wert, text]) => (
                                <button
                                    key={wert}
                                    role="tab"
                                    aria-selected={ansicht === wert}
                                    className={ansicht === wert ? 'aktiv' : undefined}
                                    onClick={() => setAnsicht(wert)}
                                >
                                    {text}
                                </button>
                            ))}
                        </div>
                        {filterAktiv > 0 && (
                            <span className="unterzeile">
                                {treffer.length} von {alleTreffer.length} Angeboten
                            </span>
                        )}
                    </div>
                    <FilterLeiste
                        eingaben={filterEingaben}
                        ungueltig={ungueltig}
                        aktiv={filterAktiv}
                        onChange={setFilterEingaben}
                    />
                    {treffer.length === 0 && (
                        <div className="leer">
                            <p>Kein Angebot passt zu den Filtern.</p>
                        </div>
                    )}
                </>
            )}

            {ansicht === 'tabelle' && alleTreffer.length > 0 && <VergleichTabelle treffer={treffer} />}

            {ansicht === 'uebersicht' && (
                <ol className="rangliste">
                    {treffer.map(({ angebot, tarif, kosten, mehrkostenCent }, i) => (
                        <li key={angebot.id} className={mehrkostenCent === 0 ? 'eintrag bester' : 'eintrag'}>
                            <div className="rang" aria-label={`Platz ${i + 1}`}>
                                {i + 1}
                            </div>
                            <div className="eintrag-text">
                                <div className="eintrag-titel">{angebotBeschreibung(angebot, daten)}</div>
                                <div className="marken">
                                    <span className="marke">{ART_TEXT[angebot.art]}</span>
                                    {tarif.datenOesterreichGb !== undefined && (
                                        <span className="marke">{formatKontingent(tarif.datenOesterreichGb, 'GB')}</span>
                                    )}
                                    {tarif.netz && <span className="marke">{tarif.netz}</span>}
                                    {tarif.bindungMonate > 0 && (
                                        <span className="marke">{tarif.bindungMonate} Mon. Bindung</span>
                                    )}
                                </div>
                            </div>
                            <div className="eintrag-preis">
                                <div className="gesamt">{formatEuro(kosten.gesamtCent)}</div>
                                <div className="pro-monat">Ø {formatEuro(kosten.proMonatCent)} / Monat</div>
                                {mehrkostenCent === 0 ? (
                                    <span className="marke gut">Günstigstes</span>
                                ) : (
                                    <span className="mehr">+{formatEuro(mehrkostenCent)}</span>
                                )}
                            </div>
                            <details className="eintrag-details">
                                <summary>Aufstellung{kosten.hinweise.length > 0 && <span className="warn"> · ⚠ Hinweis</span>}</summary>
                                <dl className="aufstellung">
                                    <dt>Tarif ({kosten.zeitraumMonate} Monate)</dt>
                                    <dd>{formatEuro(kosten.tarifCent)}</dd>
                                    <dt>Rabatte</dt>
                                    <dd>{kosten.rabattCent > 0 ? '−' : ''}{formatEuro(kosten.rabattCent)}</dd>
                                    <dt>Einmalkosten</dt>
                                    <dd>{formatEuro(kosten.einmaligCent)}</dd>
                                    <dt>Servicepauschale</dt>
                                    <dd>{formatEuro(kosten.servicepauschaleCent)}</dd>
                                    <dt>Gerät</dt>
                                    <dd>{formatEuro(kosten.geraetCent)}</dd>
                                    <dt className="summe">Gesamt</dt>
                                    <dd className="summe">{formatEuro(kosten.gesamtCent)}</dd>
                                </dl>
                                {kosten.hinweise.length > 0 && (
                                    <ul className="hinweise">
                                        {kosten.hinweise.map((h) => (
                                            <li key={h}>{h}</li>
                                        ))}
                                    </ul>
                                )}
                            </details>
                        </li>
                    ))}
                </ol>
            )}

            {fehler.length > 0 && (
                <div className="hinweisbox fehlerbox">
                    <strong>Nicht berechenbar</strong>
                    <ul>
                        {fehler.map((f) => (
                            <li key={f.angebot.id}>
                                {angebotBeschreibung(f.angebot, daten)}: {f.fehler}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
