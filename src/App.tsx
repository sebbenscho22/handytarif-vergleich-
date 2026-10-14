import { useState } from 'react';
import { AngeboteSeite } from './components/AngeboteSeite';
import { DatenSeite } from './components/DatenSeite';
import { GeraeteSeite } from './components/GeraeteSeite';
import { TarifeSeite } from './components/TarifeSeite';
import { VergleichSeite } from './components/VergleichSeite';
import { CloudHinweis } from './components/CloudBereich';
import type { FilterEingaben } from './domain/spalten';
import { useAppDaten } from './hooks/useAppDaten';
import { useCloud } from './hooks/useCloud';
import { ladeFilterEingaben, sessionSpeicher, speichereFilterEingaben } from './storage/speicher';

const SEITEN = {
    vergleich: 'Vergleich',
    angebote: 'Angebote',
    tarife: 'Tarife',
    geraete: 'Geräte',
    daten: 'Daten',
} as const;

type Seite = keyof typeof SEITEN;

export default function App() {
    const app = useAppDaten();
    const cloud = useCloud(app.daten, app.ersetzen);
    const [seite, setSeite] = useState<Seite>('vergleich');
    // Gilt, solange der Tab offen ist (sessionStorage), auch über Neuladen hinweg
    const [filterEingaben, setFilterEingabenState] = useState<FilterEingaben>(() =>
        ladeFilterEingaben(sessionSpeicher()),
    );

    function setFilterEingaben(neu: FilterEingaben) {
        setFilterEingabenState(neu);
        speichereFilterEingaben(sessionSpeicher(), neu);
    }

    const anzahl: Record<Seite, number | undefined> = {
        vergleich: undefined,
        angebote: app.daten.angebote.length,
        tarife: app.daten.tarife.length,
        geraete: app.daten.geraete.length,
        daten: undefined,
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
            {app.ladeWarnung && <p className="hinweisbox warnbox">{app.ladeWarnung}</p>}
            {app.speicherFehler && <p className="hinweisbox fehlerbox">{app.speicherFehler}</p>}
            <CloudHinweis cloud={cloud} />
            <main>
                {seite === 'vergleich' && (
                    <VergleichSeite app={app} filterEingaben={filterEingaben} setFilterEingaben={setFilterEingaben} />
                )}
                {seite === 'angebote' && <AngeboteSeite app={app} />}
                {seite === 'tarife' && <TarifeSeite app={app} />}
                {seite === 'geraete' && <GeraeteSeite app={app} />}
                {seite === 'daten' && <DatenSeite app={app} cloud={cloud} />}
            </main>
        </>
    );
}
