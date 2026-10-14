// Zugriff auf Firebase: Anmeldung mit Google und ein Firestore-Dokument pro Benutzer (siehe firebase/firestore.rules).
import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { doc, getDoc, getFirestore, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore/lite';
import { alsJson, ausJson } from '../domain/backup';
import type { Ergebnis } from '../domain/formulare';
import type { AppDaten } from '../domain/types';

const SAMMLUNG = 'nutzer';

export interface CloudStand {
    daten: AppDaten;
    // Zufällige Kennung des gespeicherten Stands. Ändert sich bei jedem Speichern, dient dem Konflikt-Check.
    revision: string;
    // Serverzeit des letzten Speicherns als ISO-Text, nur zur Anzeige.
    geaendertAm: string | null;
}

export interface CloudClient {
    auth: Auth;
    db: Firestore;
}

// Werte kommen beim Build aus .env.local bzw. den GitHub-Repository-Variablen.
// Fehlen sie, läuft die App wie bisher nur mit localStorage.
export function cloudClient(): CloudClient | null {
    const env = import.meta.env;
    const konfig = {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        appId: env.VITE_FIREBASE_APP_ID,
    };
    if (!konfig.apiKey || !konfig.authDomain || !konfig.projectId || !konfig.appId) return null;
    const app = initializeApp(konfig);
    return { auth: getAuth(app), db: getFirestore(app) };
}

// Prüft ein gelesenes Dokument. undefined = in der Cloud liegt noch nichts.
// geaendertAm ist in Firestore ein Timestamp, darum reicht hier ein Objekt mit toDate().
export function dokumentAuswerten(dokument: unknown): Ergebnis<CloudStand | null> {
    if (dokument === undefined) return { ok: true, wert: null };
    if (typeof dokument !== 'object' || dokument === null) {
        return { ok: false, fehler: ['Unerwartete Antwort der Cloud.'] };
    }
    const { inhalt, revision, geaendertAm } = dokument as Record<string, unknown>;
    if (typeof revision !== 'string') return { ok: false, fehler: ['Cloud-Daten ohne Revision.'] };
    if (typeof inhalt !== 'string') return { ok: false, fehler: ['Cloud-Daten ohne Inhalt.'] };
    const r = ausJson(inhalt);
    if (!r.ok) return r;
    return { ok: true, wert: { daten: r.wert, revision, geaendertAm: zeitAlsText(geaendertAm) } };
}

function zeitAlsText(wert: unknown): string | null {
    if (typeof wert !== 'object' || wert === null || !('toDate' in wert) || typeof wert.toDate !== 'function') {
        return null;
    }
    const datum: unknown = wert.toDate();
    return datum instanceof Date ? datum.toISOString() : null;
}

function fehlertext(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

export async function cloudLaden(client: CloudClient, userId: string): Promise<Ergebnis<CloudStand | null>> {
    try {
        const schnappschuss = await getDoc(doc(client.db, SAMMLUNG, userId));
        return dokumentAuswerten(schnappschuss.data());
    } catch (e) {
        return { ok: false, fehler: [`Cloud nicht erreichbar: ${fehlertext(e)}`] };
    }
}

export type CloudSpeicherergebnis =
    | { ok: true; revision: string }
    | { ok: false; konflikt: boolean; fehler: string };

class Konflikt extends Error {}

// Schreibt nur, wenn die Cloud noch die erwartete Revision hat (erwartet = null: noch kein Dokument).
// Sonst hat ein anderes Gerät inzwischen gespeichert → konflikt.
export async function cloudSpeichern(
    client: CloudClient,
    userId: string,
    daten: AppDaten,
    erwartet: string | null,
): Promise<CloudSpeicherergebnis> {
    const ref = doc(client.db, SAMMLUNG, userId);
    const revision = crypto.randomUUID();
    try {
        await runTransaction(client.db, async (tx) => {
            const aktuell = await tx.get(ref);
            const vorhanden: unknown = aktuell.exists() ? aktuell.get('revision') : null;
            if (vorhanden !== erwartet) throw new Konflikt();
            // Der Zeitstempel kommt vom Server, damit Geräte mit falscher Uhr nichts durcheinanderbringen.
            tx.set(ref, { inhalt: alsJson(daten), revision, geaendertAm: serverTimestamp() });
        });
        return { ok: true, revision };
    } catch (e) {
        if (e instanceof Konflikt) return { ok: false, konflikt: true, fehler: 'Cloud wurde inzwischen geändert.' };
        return { ok: false, konflikt: false, fehler: `Cloud-Speichern fehlgeschlagen: ${fehlertext(e)}` };
    }
}
