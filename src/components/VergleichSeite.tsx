import { useState } from 'react';
import { vergleicheAngebote } from '../domain/vergleich';
import { formatEuro, formatKontingent, parseGanzzahl } from '../domain/zahlen';
import type { AppAktionen } from '../hooks/useAppDaten';
import { ART_TEXT, angebotBeschreibung } from './angebotText';

export function VergleichSeite({ app }: { app: AppAktionen }) {
    const { daten } = app;
    const { treffer, fehler } = vergleicheAngebote(daten);
    const [zeitraumText, setZeitraumText] = useState(daten.vergleichszeitraumMonate.toString());

    function zeitraumAendern(text: string) {
        setZeitraumText(text);
        const n = parseGanzzahl(text);
        if (n !== null && n >= 1) app.setZeitraum(n);
    }

    const zeitraumEingabe = parseGanzzahl(zeitraumText);
    const zeitraumUngueltig = zeitraumEingabe === null || zeitraumEingabe < 1;

    return (
        <section>
            <div className="kopf">
                <h2>Vergleich</h2>
                <label className="zeitraum">
                    Zeitraum{' '}
                    <input
                        inputMode="numeric"
                        size={3}
                        value={zeitraumText}
                        aria-invalid={zeitraumUngueltig}
                        onChange={(e) => zeitraumAendern(e.target.value)}
                    />{' '}
                    Monate
                </label>
            </div>
            {zeitraumUngueltig && <p className="fehler">Zeitraum muss eine ganze Zahl ab 1 sein.</p>}

            {treffer.length === 0 && fehler.length === 0 ? (
                <p className="leer">Noch keine Angebote. Lege Tarife, Geräte und Angebote an.</p>
            ) : (
                <div className="tabelle-rahmen">
                    <table className="vergleich">
                        <thead>
                            <tr>
                                <th className="zahl">#</th>
                                <th>Angebot</th>
                                <th>Art</th>
                                <th className="zahl">Daten AT</th>
                                <th className="zahl">Gesamt</th>
                                <th className="zahl">Ø pro Monat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {treffer.map(({ angebot, tarif, kosten }, i) => (
                                <tr key={angebot.id} className={i === 0 ? 'bester' : undefined}>
                                    <td className="zahl">{i + 1}</td>
                                    <td>
                                        <details>
                                            <summary>{angebotBeschreibung(angebot, daten)}</summary>
                                            <dl className="aufstellung">
                                                <dt>Tarif ({kosten.zeitraumMonate} Monate)</dt>
                                                <dd>{formatEuro(kosten.tarifCent)}</dd>
                                                <dt>Rabatte</dt>
                                                <dd>−{formatEuro(kosten.rabattCent)}</dd>
                                                <dt>Einmalkosten</dt>
                                                <dd>{formatEuro(kosten.einmaligCent)}</dd>
                                                <dt>Servicepauschale</dt>
                                                <dd>{formatEuro(kosten.servicepauschaleCent)}</dd>
                                                <dt>Gerät</dt>
                                                <dd>{formatEuro(kosten.geraetCent)}</dd>
                                            </dl>
                                            {kosten.hinweise.length > 0 && (
                                                <ul className="hinweise">
                                                    {kosten.hinweise.map((h) => (
                                                        <li key={h}>{h}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </details>
                                    </td>
                                    <td>{ART_TEXT[angebot.art]}</td>
                                    <td className="zahl">{formatKontingent(tarif.datenOesterreichGb, 'GB')}</td>
                                    <td className="zahl betrag">
                                        {formatEuro(kosten.gesamtCent)}
                                        {kosten.hinweise.length > 0 && (
                                            <span className="warnzeichen" title={kosten.hinweise.join('\n')}>
                                                {' '}⚠
                                            </span>
                                        )}
                                    </td>
                                    <td className="zahl">{formatEuro(kosten.proMonatCent)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {fehler.length > 0 && (
                <>
                    <h3>Nicht berechenbar</h3>
                    <ul className="fehler">
                        {fehler.map((f) => (
                            <li key={f.angebot.id}>
                                {angebotBeschreibung(f.angebot, daten)}: {f.fehler}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}
