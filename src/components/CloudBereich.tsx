import { useState, type FormEvent } from 'react';
import type { CloudAktionen } from '../hooks/useCloud';

const STATUS_TEXT = {
    laeuft: 'Wird abgeglichen …',
    synchron: 'Alles gespeichert.',
    konflikt: 'Konflikt, bitte oben auflösen.',
    fehler: 'Fehler, siehe Hinweis oben.',
} as const;

// Kachel auf der Daten-Seite: an- und abmelden, Status anzeigen.
export function CloudKachel({ cloud }: { cloud: CloudAktionen }) {
    const [email, setEmail] = useState('');
    const [meldung, setMeldung] = useState<{ art: 'gut' | 'fehler'; text: string }>();

    async function anmelden(ev: FormEvent) {
        ev.preventDefault();
        const fehler = await cloud.anmelden(email.trim());
        setMeldung(
            fehler
                ? { art: 'fehler', text: `Anmelden fehlgeschlagen: ${fehler}` }
                : { art: 'gut', text: `Login-Link an ${email.trim()} gesendet. Öffne ihn in diesem Browser.` },
        );
    }

    if (!cloud.verfuegbar) return null;

    return (
        <div className="kachel">
            <h3>Cloud (Supabase)</h3>
            {cloud.status ? (
                <>
                    <p className="unterzeile">
                        Angemeldet als {cloud.email}. {STATUS_TEXT[cloud.status.art]}
                    </p>
                    <button onClick={() => void cloud.abmelden()}>Abmelden</button>
                </>
            ) : (
                <form onSubmit={(ev) => void anmelden(ev)}>
                    <p className="unterzeile">
                        Mit E-Mail anmelden, um die Daten auf allen Geräten abzugleichen. Du bekommst einen Login-Link.
                    </p>
                    <input
                        type="email"
                        required
                        placeholder="E-Mail-Adresse"
                        autoComplete="email"
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                    />
                    <button className="primaer" type="submit">
                        Login-Link senden
                    </button>
                </form>
            )}
            {meldung && !cloud.status && (
                <p className={`hinweisbox ${meldung.art === 'gut' ? 'gutbox' : 'fehlerbox'}`} role="status">
                    {meldung.text}
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
    const geaendert = new Date(c.geaendertAm).toLocaleString('de-AT');
    return (
        <div className="hinweisbox warnbox" role="alert">
            <p>
                Die Daten in der Cloud wurden am {geaendert} auf einem anderen Gerät geändert, und hier gibt es ebenfalls
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
