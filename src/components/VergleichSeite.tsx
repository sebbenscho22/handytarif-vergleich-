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

            {treffer.length === 0 && fehler.length === 0 && (
                <div className="leer">
                    <p>Noch nichts zu vergleichen.</p>
                    <p>Lege Tarife und Geräte an und kombiniere sie unter „Angebote“.</p>
                </div>
            )}

            <ol className="rangliste">
                {treffer.map(({ angebot, tarif, kosten, mehrkostenCent }, i) => (
                    <li key={angebot.id} className={i === 0 ? 'eintrag bester' : 'eintrag'}>
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
                            {i === 0 ? (
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
                                <dd>−{formatEuro(kosten.rabattCent)}</dd>
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
