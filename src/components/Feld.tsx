import type { ReactNode } from 'react';

interface Props {
    label: string;
    hinweis?: string;
    children: ReactNode;
}

// Beschriftetes Eingabefeld. Das Eingabeelement wird als children übergeben.
export function Feld({ label, hinweis, children }: Props) {
    return (
        <label className="feld">
            <span className="feld-label">{label}</span>
            {children}
            {hinweis && <span className="feld-hinweis">{hinweis}</span>}
        </label>
    );
}

export function Fehlerliste({ fehler }: { fehler: string[] }) {
    if (fehler.length === 0) return null;
    return (
        <ul className="fehler" role="alert">
            {fehler.map((f) => (
                <li key={f}>{f}</li>
            ))}
        </ul>
    );
}
