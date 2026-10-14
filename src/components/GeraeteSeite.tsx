import { useState, type FormEvent } from 'react';
import { geraetAuswerten, geraetEingabeAus, type GeraetEingabe } from '../domain/formulare';
import type { Geraet } from '../domain/types';
import { formatEuro } from '../domain/zahlen';
import type { AppAktionen } from '../hooks/useAppDaten';
import { Feld, Fehlerliste } from './Feld';

export function GeraeteSeite({ app }: { app: AppAktionen }) {
    const [bearbeiteId, setBearbeiteId] = useState<string | null>(null); // 'neu' = neues Gerät
    const { geraete, angebote } = app.daten;

    function loeschen(g: Geraet) {
        const betroffen = angebote.filter((a) => a.art !== 'simOnly' && a.geraetId === g.id).length;
        const frage =
            betroffen > 0
                ? `„${g.modell}“ löschen? ${betroffen} Angebot(e) mit diesem Gerät werden ebenfalls gelöscht.`
                : `„${g.modell}“ löschen?`;
        if (confirm(frage)) app.geraetLoeschen(g.id);
    }

    if (bearbeiteId !== null) {
        const alt = geraete.find((g) => g.id === bearbeiteId);
        return (
            <GeraetFormular
                alt={alt}
                onSpeichern={(g) => {
                    app.geraetSpeichern(g);
                    setBearbeiteId(null);
                }}
                onAbbrechen={() => setBearbeiteId(null)}
            />
        );
    }

    return (
        <section className="karte">
            <div className="kopf">
                <h2>Geräte</h2>
                <button className="primaer" onClick={() => setBearbeiteId('neu')}>+ Gerät</button>
            </div>
            {geraete.length === 0 ? (
                <p className="leer">Noch keine Geräte erfasst.</p>
            ) : (
                <div className="tabelle-rahmen">
                    <table>
                        <thead>
                            <tr>
                                <th>Modell</th>
                                <th className="zahl">Preis ohne Vertrag</th>
                                <th>Stand</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {geraete.map((g) => (
                                <tr key={g.id}>
                                    <td>{g.modell}</td>
                                    <td className="zahl">{formatEuro(g.preisFreiCent)}</td>
                                    <td>{g.preisStand ?? '–'}</td>
                                    <td className="aktionen">
                                        <button className="leise" onClick={() => setBearbeiteId(g.id)}>Bearbeiten</button>
                                        <button className="gefahr" onClick={() => loeschen(g)}>Löschen</button>
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
    alt: Geraet | undefined;
    onSpeichern: (g: Geraet) => void;
    onAbbrechen: () => void;
}

function GeraetFormular({ alt, onSpeichern, onAbbrechen }: FormularProps) {
    const [e, setE] = useState<GeraetEingabe>(() => geraetEingabeAus(alt));
    const [fehler, setFehler] = useState<string[]>([]);

    function feld<K extends keyof GeraetEingabe>(key: K, wert: GeraetEingabe[K]) {
        setE((alt) => ({ ...alt, [key]: wert }));
    }

    function absenden(ev: FormEvent) {
        ev.preventDefault();
        const r = geraetAuswerten(e, alt?.id ?? crypto.randomUUID());
        if (r.ok) onSpeichern(r.wert);
        else setFehler(r.fehler);
    }

    return (
        <form className="formular karte" onSubmit={absenden}>
            <h2>{alt ? 'Gerät bearbeiten' : 'Neues Gerät'}</h2>
            <div className="felder">
                <Feld label="Modell *" hinweis="inkl. Speichergröße">
                    <input value={e.modell} onChange={(ev) => feld('modell', ev.target.value)} />
                </Feld>
                <Feld label="Preis ohne Vertrag € *">
                    <input inputMode="decimal" value={e.preisFrei} onChange={(ev) => feld('preisFrei', ev.target.value)} />
                </Feld>
                <Feld label="Preisstand">
                    <input type="date" value={e.preisStand} onChange={(ev) => feld('preisStand', ev.target.value)} />
                </Feld>
                <Feld label="Notiz">
                    <textarea value={e.notiz} onChange={(ev) => feld('notiz', ev.target.value)} />
                </Feld>
            </div>
            <Fehlerliste fehler={fehler} />
            <div className="knoepfe">
                <button type="submit" className="primaer">Speichern</button>
                <button type="button" onClick={onAbbrechen}>Abbrechen</button>
            </div>
        </form>
    );
}
