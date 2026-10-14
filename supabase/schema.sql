-- Einmalig im Supabase-Dashboard ausführen: SQL Editor → New query → einfügen → Run.
-- Eine Zeile pro Benutzer, sie enthält denselben JSON-Block wie das Backup (AppDaten).

create table if not exists public.app_daten (
    user_id uuid primary key references auth.users (id) on delete cascade,
    inhalt jsonb not null,
    geaendert_am timestamptz not null default now()
);

-- Row Level Security: Jeder sieht und ändert nur seine eigene Zeile.
-- Pflicht, weil der Supabase-Schlüssel öffentlich im Browser-Code steht.
alter table public.app_daten enable row level security;

drop policy if exists "eigene Daten lesen" on public.app_daten;
create policy "eigene Daten lesen" on public.app_daten
    for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "eigene Daten anlegen" on public.app_daten;
create policy "eigene Daten anlegen" on public.app_daten
    for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "eigene Daten ändern" on public.app_daten;
create policy "eigene Daten ändern" on public.app_daten
    for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "eigene Daten löschen" on public.app_daten;
create policy "eigene Daten löschen" on public.app_daten
    for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.app_daten to authenticated;
revoke all on public.app_daten from anon;

-- Der Zeitstempel kommt immer vom Server, damit Geräte mit falscher Uhr nichts durcheinanderbringen.
create or replace function public.app_daten_zeitstempel() returns trigger
    language plpgsql
    set search_path = ''
as $$
begin
    new.geaendert_am := clock_timestamp();
    return new;
end;
$$;

drop trigger if exists app_daten_zeitstempel on public.app_daten;
create trigger app_daten_zeitstempel
    before insert or update on public.app_daten
    for each row execute function public.app_daten_zeitstempel();
