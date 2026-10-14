// Umgebungsvariablen für den Build (.env.local bzw. GitHub-Repository-Variablen).
interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
