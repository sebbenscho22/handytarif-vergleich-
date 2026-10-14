import { useState } from 'react';
import { AngeboteSeite } from './components/AngeboteSeite';
import { GeraeteSeite } from './components/GeraeteSeite';
import { TarifeSeite } from './components/TarifeSeite';
import { VergleichSeite } from './components/VergleichSeite';
import { useAppDaten } from './hooks/useAppDaten';

const SEITEN = {
    vergleich: 'Vergleich',
    angebote: 'Angebote',
    tarife: 'Tarife',
    geraete: 'Geräte',
} as const;

type Seite = keyof typeof SEITEN;

export default function App() {
    const app = useAppDaten();
    const [seite, setSeite] = useState<Seite>('vergleich');

    const anzahl: Record<Seite, number | undefined> = {
        vergleich: undefined,
        angebote: app.daten.angebote.length,
        tarife: app.daten.tarife.length,
        geraete: app.daten.geraete.length,
    };

    return (
        <>
            <header className="kopfzeile">
                <div className="logo">
                    <span className="logo-zeichen" aria-hidden="true">
                        €
                    </span>
                    <div>
                        <h1>Handytarif-Vergleich</h1>
                        <p className="unterzeile">Tarife und Handys über die ganze Laufzeit vergleichen</p>
                    </div>
                </div>
                <nav className="reiter">
                    {(Object.keys(SEITEN) as Seite[]).map((s) => (
                        <button
                            key={s}
                            className={s === seite ? 'aktiv' : undefined}
                            aria-current={s === seite ? 'page' : undefined}
                            onClick={() => setSeite(s)}
                        >
                            {SEITEN[s]}
                            {anzahl[s] !== undefined && <span className="zaehler">{anzahl[s]}</span>}
                        </button>
                    ))}
                </nav>
            </header>
            <p className="hinweisbox warnbox">
                Daten werden noch nicht gespeichert – beim Neuladen der Seite ist alles weg.
            </p>
            <main>
                {seite === 'vergleich' && <VergleichSeite app={app} />}
                {seite === 'angebote' && <AngeboteSeite app={app} />}
                {seite === 'tarife' && <TarifeSeite app={app} />}
                {seite === 'geraete' && <GeraeteSeite app={app} />}
            </main>
        </>
    );
}
