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

    return (
        <>
            <header>
                <h1>Handytarif-Vergleich</h1>
                <nav>
                    {(Object.keys(SEITEN) as Seite[]).map((s) => (
                        <button
                            key={s}
                            className={s === seite ? 'aktiv' : undefined}
                            aria-current={s === seite ? 'page' : undefined}
                            onClick={() => setSeite(s)}
                        >
                            {SEITEN[s]}
                        </button>
                    ))}
                </nav>
            </header>
            <main>
                {seite === 'vergleich' && <VergleichSeite app={app} />}
                {seite === 'angebote' && <AngeboteSeite app={app} />}
                {seite === 'tarife' && <TarifeSeite app={app} />}
                {seite === 'geraete' && <GeraeteSeite app={app} />}
            </main>
            <footer>Daten werden noch nicht gespeichert – beim Neuladen ist alles weg.</footer>
        </>
    );
}
