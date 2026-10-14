import { useState } from 'react';
import type { CloudAktionen } from '../hooks/useCloud';

const STATUS_TEXT = {
    laeuft: 'Wird abgeglichen …',
    synchron: 'Alles gespeichert.',
    konflikt: 'Konflikt, bitte oben auflösen.',
    fehler: 'Fehler, siehe Hinweis oben.',
} as const;

// Kachel auf der Daten-Seite: an- und abmelden, Status anzeigen.
export function CloudKachel({ cloud }: { cloud: CloudAktionen }) {
    const [fehler, setFehler] = useState<string>();

    async function anmelden() {
        const f = await cloud.anmelden();
        setFehler(f && `Anmelden fehlgeschlagen: ${f}`);
    }

    if (!cloud.verfuegbar) return null;

    return (
        <div className="kachel">
            <h3>Cloud (Firebase)</h3>
            {cloud.status ? (
                <>
                    <p className="unterzeile">
                        Angemeldet als {cloud.email}. {STATUS_TEXT[cloud.status.art]}
                    </p>
                    <button onClick={() => void cloud.abmelden()}>Abmelden</button>
                </>
            ) : (
                <>
                    <p className="unterzeile">Mit Google anmelden, um die Daten auf allen Geräten abzugleichen.</p>
                    <button className="primaer" onClick={() => void anmelden()}>
                        Mit Google anmelden
                    </button>
                </>
            )}
            {fehler && !cloud.status && (
                <p className="hinweisbox fehlerbox" role="status">
                    {fehler}
                </p>
            )}
        </div>
    );
}

// Hinweis über allen Seiten, wenn der Abgleich eine Entscheidung braucht oder fehlgeschlagen ist.
export function CloudHinweis({ cloud }: { cloud: CloudAktionen }) {
    const s = cloud.status;
    if (s?.art === 'fehler') return <p className="hinweisbox fehlerbox">Cloud: {s.text} Deine Daten sind lokal gespeichert.</p>;
    if (s?.art !== 'konflikt') return null;

    const c = s.cloud;
    const geaendert = c.geaendertAm ? ` am ${new Date(c.geaendertAm).toLocaleString('de-AT')}` : '';
    return (
        <div className="hinweisbox warnbox" role="alert">
            <p>
                Die Daten in der Cloud wurden{geaendert} auf einem anderen Gerät geändert, und hier gibt es ebenfalls
                ungespeicherte Änderungen. Welcher Stand soll gelten? Der andere wird überschrieben. Tipp: vorher unter
                „Daten“ ein Backup herunterladen.
            </p>
            <p>
                Cloud: {c.daten.tarife.length} Tarife, {c.daten.geraete.length} Geräte, {c.daten.angebote.length} Angebote.
            </p>
            <div className="knoepfe">
                <button onClick={() => cloud.cloudUebernehmen(c)}>Cloud-Stand übernehmen</button>
                <button onClick={() => cloud.lokalHochladen(c)}>Diesen Stand hochladen</button>
            </div>
        </div>
    );
}
