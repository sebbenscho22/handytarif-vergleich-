import { useState, type FormEvent } from 'react';
import { angebotAuswerten, angebotEingabeAus, type AngebotEingabe } from '../domain/formulare';
import type { Angebot, AppDaten } from '../domain/types';
import type { AppAktionen } from '../hooks/useAppDaten';
import { ART_TEXT, angebotBeschreibung } from './angebotText';
import { Feld, Fehlerliste } from './Feld';
import { RabattEditor } from './RabattEditor';

export function AngeboteSeite({ app }: { app: AppAktionen }) {
    const [bearbeiteId, setBearbeiteId] = useState<string | null>(null); // 'neu' = neues Angebot
    const { daten } = app;

    if (bearbeiteId !== null) {
        const alt = daten.angebote.find((a) => a.id === bearbeiteId);
        return (
            <AngebotFormular
                alt={alt}
                daten={daten}
                onSpeichern={(a) => {
                    app.angebotSpeichern(a);
                    setBearbeiteId(null);
                }}
                onAbbrechen={() => setBearbeiteId(null)}
            />
        );
    }

    return (
        <section>
            <div className="kopf">
                <h2>Angebote</h2>
                <button onClick={() => setBearbeiteId('neu')} disabled={daten.tarife.length === 0}>
                    + Angebot
                </button>
            </div>
            <p className="erklaerung">
                Ein Angebot ist die Kombination, die du vergleichst: ein Tarif, optional mit Gerät.
            </p>
            {daten.tarife.length === 0 && <p className="leer">Lege zuerst einen Tarif an.</p>}
            {daten.angebote.length === 0 ? (
                <p className="leer">Noch keine Angebote erfasst.</p>
            ) : (
                <div className="tabelle-rahmen">
                    <table>
                        <thead>
                            <tr>
                                <th>Angebot</th>
                                <th>Art</th>
                                <th>Notiz</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {daten.angebote.map((a) => (
                                <tr key={a.id}>
                                    <td>{angebotBeschreibung(a, daten)}</td>
                                    <td>{ART_TEXT[a.art]}</td>
                                    <td>{a.notiz ?? ''}</td>
                                    <td className="aktionen">
                                        <button onClick={() => setBearbeiteId(a.id)}>Bearbeiten</button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Angebot löschen?')) app.angebotLoeschen(a.id);
                                            }}
                                        >
                                            Löschen
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

interface FormularProps {
    alt: Angebot | undefined;
    daten: AppDaten;
    onSpeichern: (a: Angebot) => void;
    onAbbrechen: () => void;
}

function AngebotFormular({ alt, daten, onSpeichern, onAbbrechen }: FormularProps) {
    const [e, setE] = useState<AngebotEingabe>(() => angebotEingabeAus(alt));
    const [fehler, setFehler] = useState<string[]>([]);

    function feld<K extends keyof AngebotEingabe>(key: K, wert: AngebotEingabe[K]) {
        setE((alt) => ({ ...alt, [key]: wert }));
    }

    function absenden(ev: FormEvent) {
        ev.preventDefault();
        const r = angebotAuswerten(e, alt?.id ?? crypto.randomUUID());
        if (r.ok) onSpeichern(r.wert);
        else setFehler(r.fehler);
    }

    return (
        <form className="formular" onSubmit={absenden}>
            <h2>{alt ? 'Angebot bearbeiten' : 'Neues Angebot'}</h2>
            <div className="felder">
                <Feld label="Art">
                    <select value={e.art} onChange={(ev) => feld('art', ev.target.value as Angebot['art'])}>
                        {Object.entries(ART_TEXT).map(([wert, text]) => (
                            <option key={wert} value={wert}>
                                {text}
                            </option>
                        ))}
                    </select>
                </Feld>
                <Feld label="Tarif *">
                    <select value={e.tarifId} onChange={(ev) => feld('tarifId', ev.target.value)}>
                        <option value="">– wählen –</option>
                        {daten.tarife.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.anbieter} {t.name}
                            </option>
                        ))}
                    </select>
                </Feld>
                {e.art !== 'simOnly' && (
                    <Feld label="Gerät *" hinweis={daten.geraete.length === 0 ? 'Zuerst ein Gerät anlegen.' : undefined}>
                        <select value={e.geraetId} onChange={(ev) => feld('geraetId', ev.target.value)}>
                            <option value="">– wählen –</option>
                            {daten.geraete.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.modell}
                                </option>
                            ))}
                        </select>
                    </Feld>
                )}
                {e.art === 'geraetVertrag' && (
                    <>
                        <Feld label="Anzahlung €">
                            <input inputMode="decimal" value={e.anzahlung} onChange={(ev) => feld('anzahlung', ev.target.value)} />
                        </Feld>
                        <Feld label="Monatsrate Gerät €">
                            <input
                                inputMode="decimal"
                                value={e.rateMonatlich}
                                onChange={(ev) => feld('rateMonatlich', ev.target.value)}
                            />
                        </Feld>
                        <Feld label="Anzahl Raten">
                            <input
                                inputMode="numeric"
                                value={e.rateAnzahlMonate}
                                onChange={(ev) => feld('rateAnzahlMonate', ev.target.value)}
                            />
                        </Feld>
                    </>
                )}
                <Feld label="Notiz">
                    <textarea value={e.notiz} onChange={(ev) => feld('notiz', ev.target.value)} />
                </Feld>
            </div>
            <RabattEditor
                titel="Rabatte nur für dieses Angebot (z. B. Handy-Bonus)"
                zeilen={e.rabatte}
                onChange={(r) => feld('rabatte', r)}
            />
            <Fehlerliste fehler={fehler} />
            <div className="knoepfe">
                <button type="submit" className="primaer">Speichern</button>
                <button type="button" onClick={onAbbrechen}>Abbrechen</button>
            </div>
        </form>
    );
}
