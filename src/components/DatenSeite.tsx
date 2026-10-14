import { useRef, useState, type ChangeEvent } from 'react';
import { alsJson, ausJson, backupDateiname } from '../domain/backup';
import type { AppAktionen } from '../hooks/useAppDaten';
import type { CloudAktionen } from '../hooks/useCloud';
import { CloudKachel } from './CloudBereich';

const MAX_FEHLER = 10;

export function DatenSeite({ app, cloud }: { app: AppAktionen; cloud: CloudAktionen }) {
    const { daten } = app;
    const dateiFeld = useRef<HTMLInputElement>(null);
    const [meldung, setMeldung] = useState<{ art: 'gut' | 'fehler'; text: string; details?: string[] }>();

    function exportieren() {
        const blob = new Blob([alsJson(daten)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = backupDateiname(new Date());
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000); // erst freigeben, wenn der Download gestartet ist
    }

    async function importieren(ev: ChangeEvent<HTMLInputElement>) {
        const datei = ev.target.files?.[0];
        ev.target.value = ''; // dieselbe Datei soll erneut gewählt werden können
        if (!datei) return;

        const r = ausJson(await datei.text());
        if (!r.ok) {
            setMeldung({
                art: 'fehler',
                text: `„${datei.name}“ ist kein gültiges Backup. Deine Daten wurden nicht verändert.`,
                details: r.fehler.length > MAX_FEHLER
                    ? [...r.fehler.slice(0, MAX_FEHLER), `… und ${r.fehler.length - MAX_FEHLER} weitere`]
                    : r.fehler,
            });
            return;
        }
        const neu = r.wert;
        const frage =
            `Backup „${datei.name}“ laden?\n\n` +
            `Es enthält ${neu.tarife.length} Tarife, ${neu.geraete.length} Geräte und ${neu.angebote.length} Angebote.\n` +
            'Alle aktuellen Daten werden dabei ersetzt.';
        if (!confirm(frage)) return;
        app.ersetzen(neu);
        setMeldung({ art: 'gut', text: `Backup „${datei.name}“ geladen.` });
    }

    const leer = daten.tarife.length + daten.geraete.length + daten.angebote.length === 0;

    return (
        <section className="karte">
            <div className="kopf">
                <div>
                    <h2>Daten &amp; Backup</h2>
                    <p className="unterzeile">
                        {cloud.status
                            ? 'Deine Daten liegen in diesem Browser und werden mit der Cloud abgeglichen.'
                            : 'Deine Daten liegen nur in diesem Browser auf diesem Gerät. Sichere sie regelmäßig.'}
                    </p>
                </div>
            </div>

            <div className="kacheln">
                <div className="kachel">
                    <h3>Backup herunterladen</h3>
                    <p className="unterzeile">
                        Speichert alle Tarife, Geräte und Angebote als JSON-Datei, z. B. in deinen Downloads.
                    </p>
                    <button className="primaer" onClick={exportieren} disabled={leer}>
                        Backup herunterladen
                    </button>
                </div>
                <div className="kachel">
                    <h3>Backup laden</h3>
                    <p className="unterzeile">Ersetzt alle aktuellen Daten durch den Inhalt der Datei.</p>
                    <button onClick={() => dateiFeld.current?.click()}>Datei wählen …</button>
                    <input
                        ref={dateiFeld}
                        type="file"
                        accept="application/json,.json"
                        hidden
                        onChange={(ev) => void importieren(ev)}
                    />
                </div>
                <CloudKachel cloud={cloud} />
            </div>

            {meldung && (
                <div className={`hinweisbox ${meldung.art === 'gut' ? 'gutbox' : 'fehlerbox'}`} role="status">
                    {meldung.text}
                    {meldung.details && (
                        <ul>
                            {meldung.details.map((d) => (
                                <li key={d}>{d}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <dl className="aufstellung bestand">
                <dt>Tarife</dt>
                <dd>{daten.tarife.length}</dd>
                <dt>Geräte</dt>
                <dd>{daten.geraete.length}</dd>
                <dt>Angebote</dt>
                <dd>{daten.angebote.length}</dd>
            </dl>
        </section>
    );
}
