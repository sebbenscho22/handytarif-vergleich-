// Zugriff auf die Supabase-Tabelle app_daten (siehe supabase/schema.sql).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { pruefeBackup } from '../domain/backup';
import type { Ergebnis } from '../domain/formulare';
import type { AppDaten } from '../domain/types';

const TABELLE = 'app_daten';

export interface CloudStand {
    daten: AppDaten;
    geaendertAm: string;
}

// Werte kommen beim Build aus .env.local bzw. den GitHub-Repository-Variablen.
// Fehlen sie, läuft die App wie bisher nur mit localStorage.
export function cloudClient(): SupabaseClient | null {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const schluessel = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return url && schluessel ? createClient(url, schluessel) : null;
}

// Prüft eine gelesene Zeile. null = in der Cloud liegt noch nichts.
export function zeileAuswerten(zeile: unknown): Ergebnis<CloudStand | null> {
    if (zeile === null) return { ok: true, wert: null };
    if (typeof zeile !== 'object') return { ok: false, fehler: ['Unerwartete Antwort der Cloud.'] };
    const { inhalt, geaendert_am } = zeile as Record<string, unknown>;
    if (typeof geaendert_am !== 'string') return { ok: false, fehler: ['Cloud-Daten ohne Zeitstempel.'] };
    const r = pruefeBackup(inhalt);
    return r.ok ? { ok: true, wert: { daten: r.wert, geaendertAm: geaendert_am } } : r;
}

export async function cloudLaden(client: SupabaseClient): Promise<Ergebnis<CloudStand | null>> {
    const { data, error } = await client.from(TABELLE).select('inhalt, geaendert_am').maybeSingle();
    if (error) return { ok: false, fehler: [`Cloud nicht erreichbar: ${error.message}`] };
    return zeileAuswerten(data);
}

export type CloudSpeicherergebnis =
    | { ok: true; geaendertAm: string }
    | { ok: false; konflikt: boolean; fehler: string };

// Schreibt nur, wenn die Cloud noch den erwarteten Stand hat (erwartet = null: noch keine Zeile).
// Sonst hat ein anderes Gerät inzwischen gespeichert → konflikt.
export async function cloudSpeichern(
    client: SupabaseClient,
    userId: string,
    daten: AppDaten,
    erwartet: string | null,
): Promise<CloudSpeicherergebnis> {
    const { data, error } =
        erwartet === null
            ? await client.from(TABELLE).insert({ user_id: userId, inhalt: daten }).select('geaendert_am').maybeSingle()
            : await client
                  .from(TABELLE)
                  .update({ inhalt: daten })
                  .eq('user_id', userId)
                  .eq('geaendert_am', erwartet)
                  .select('geaendert_am')
                  .maybeSingle();

    if (error?.code === '23505') return { ok: false, konflikt: true, fehler: 'Cloud wurde inzwischen geändert.' };
    if (error) return { ok: false, konflikt: false, fehler: `Cloud-Speichern fehlgeschlagen: ${error.message}` };
    if (!data) return { ok: false, konflikt: true, fehler: 'Cloud wurde inzwischen geändert.' };
    return { ok: true, geaendertAm: (data as { geaendert_am: string }).geaendert_am };
}
