import { useState, type FormEvent } from 'react';
import { tarifAuswerten, tarifEingabeAus, type TarifEingabe } from '../domain/formulare';
import type { Tarif } from '../domain/types';
import { formatEuro, formatKontingent } from '../domain/zahlen';
import type { AppAktionen } from '../hooks/useAppDaten';
import { Feld, Fehlerliste } from './Feld';
import { RabattEditor } from './RabattEditor';

export function TarifeSeite({ app }: { app: AppAktionen }) {
    const [bearbeiteId, setBearbeiteId] = useState<string | null>(null); // 'neu' = neuer Tarif
    const { tarife, angebote } = app.daten;

    function loeschen(t: Tarif) {
        const betroffen = angebote.filter((a) => a.tarifId === t.id).length;
        const frage =
            betroffen > 0
                ? `„${t.name}“ löschen? ${betroffen} Angebot(e) mit diesem Tarif werden ebenfalls gelöscht.`
                : `„${t.name}“ löschen?`;
        if (confirm(frage)) app.tarifLoeschen(t.id);
    }

    if (bearbeiteId !== null) {
        const alt = tarife.find((t) => t.id === bearbeiteId);
        return (
            <TarifFormular
                alt={alt}
                onSpeichern={(t) => {
                    app.tarifSpeichern(t);
                    setBearbeiteId(null);
                }}
                onAbbrechen={() => setBearbeiteId(null)}
            />
        );
    }

    return (
        <section className="karte">
            <div className="kopf">
                <h2>Tarife</h2>
                <button className="primaer" onClick={() => setBearbeiteId('neu')}>+ Tarif</button>
            </div>
            {tarife.length === 0 ? (
                <p className="leer">Noch keine Tarife erfasst.</p>
            ) : (
                <div className="tabelle-rahmen">
                    <table>
                        <thead>
                            <tr>
                                <th>Anbieter</th>
                                <th>Tarif</th>
                                <th className="zahl">Monatlich</th>
                                <th className="zahl">Bindung</th>
                                <th className="zahl">Daten AT</th>
                                <th>Stand</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {tarife.map((t) => (
                                <tr key={t.id}>
                                    <td>{t.anbieter}</td>
                                    <td>{t.name}</td>
                                    <td className="zahl">{formatEuro(t.preisMonatlichCent)}</td>
                                    <td className="zahl">{t.bindungMonate > 0 ? `${t.bindungMonate} Mon.` : 'keine'}</td>
                                    <td className="zahl">{formatKontingent(t.datenOesterreichGb, 'GB')}</td>
                                    <td>{t.preisStand ?? '–'}</td>
                                    <td className="aktionen">
                                        <button className="leise" onClick={() => setBearbeiteId(t.id)}>Bearbeiten</button>
                                        <button className="gefahr" onClick={() => loeschen(t)}>Löschen</button>
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
    alt: Tarif | undefined;
    onSpeichern: (t: Tarif) => void;
    onAbbrechen: () => void;
}

function TarifFormular({ alt, onSpeichern, onAbbrechen }: FormularProps) {
    const [e, setE] = useState<TarifEingabe>(() => tarifEingabeAus(alt));
    const [fehler, setFehler] = useState<string[]>([]);

    function feld<K extends keyof TarifEingabe>(key: K, wert: TarifEingabe[K]) {
        setE((alt) => ({ ...alt, [key]: wert }));
    }

    function absenden(ev: FormEvent) {
        ev.preventDefault();
        const r = tarifAuswerten(e, alt?.id ?? crypto.randomUUID(), alt);
        if (r.ok) onSpeichern(r.wert);
        else setFehler(r.fehler);
    }

    return (
        <form className="formular karte" onSubmit={absenden}>
            <h2>{alt ? 'Tarif bearbeiten' : 'Neuer Tarif'}</h2>
            <h3 className="gruppe">Grunddaten</h3>
            <div className="felder">
                <Feld label="Anbieter *">
                    <input value={e.anbieter} onChange={(ev) => feld('anbieter', ev.target.value)} />
                </Feld>
                <Feld label="Tarifname *">
                    <input value={e.name} onChange={(ev) => feld('name', ev.target.value)} />
                </Feld>
            </div>
            <h3 className="gruppe">Kosten</h3>
            <div className="felder">
                <Feld label="Monatspreis € *" hinweis="regulärer Preis, Rabatte unten">
                    <input inputMode="decimal" value={e.preisMonatlich} onChange={(ev) => feld('preisMonatlich', ev.target.value)} />
                </Feld>
                <Feld label="Bindung (Monate)" hinweis="leer oder 0 = keine">
                    <input inputMode="numeric" value={e.bindungMonate} onChange={(ev) => feld('bindungMonate', ev.target.value)} />
                </Feld>
                <Feld label="Einmalkosten €" hinweis="Aktivierung, SIM">
                    <input inputMode="decimal" value={e.einmalig} onChange={(ev) => feld('einmalig', ev.target.value)} />
                </Feld>
                <Feld label="Servicepauschale € / Jahr">
                    <input
                        inputMode="decimal"
                        value={e.servicepauschaleJahr}
                        onChange={(ev) => feld('servicepauschaleJahr', ev.target.value)}
                    />
                </Feld>
            </div>
            <RabattEditor titel="Rabatte (gelten immer für diesen Tarif)" zeilen={e.rabatte} onChange={(r) => feld('rabatte', r)} />
            <h3 className="gruppe">Leistung</h3>
            <div className="felder">
                <Feld label="Daten Österreich (GB)" hinweis="Zahl oder „unbegrenzt“">
                    <input value={e.datenOesterreichGb} onChange={(ev) => feld('datenOesterreichGb', ev.target.value)} />
                </Feld>
                <Feld label="Daten EU-Roaming (GB)" hinweis="Zahl oder „unbegrenzt“">
                    <input value={e.datenEuGb} onChange={(ev) => feld('datenEuGb', ev.target.value)} />
                </Feld>
                <Feld label="Netz">
                    <select value={e.netz} onChange={(ev) => feld('netz', ev.target.value as TarifEingabe['netz'])}>
                        <option value="">–</option>
                        <option value="LTE">LTE</option>
                        <option value="5G">5G</option>
                    </select>
                </Feld>
            </div>
            <h3 className="gruppe">Sonstiges</h3>
            <div className="felder">
                <Feld label="Preisstand" hinweis="wann du den Preis geprüft hast">
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
