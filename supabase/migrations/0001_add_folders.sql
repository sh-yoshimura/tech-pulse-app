-- Adds folder-based organization for bookmarked articles.
--
-- Run this in the Supabase SQL Editor for this project. There is no
-- migration tooling wired up in this repo (schema is managed directly in
-- the Supabase dashboard) — this file exists purely so the change is
-- tracked in git; it is not executed automatically.
--
-- Assumes `articles.id` uses `gen_random_uuid()` as its default (the
-- modern Supabase/Postgres default, available without extensions since
-- Postgres 13). If this project's `articles.id` actually uses
-- `uuid_generate_v4()` instead, swap the default below to match for
-- consistency — either works independently, this is purely cosmetic.

-- 1. folders table
create table if not exists folders (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Only one row may ever be the default folder.
create unique index if not exists folders_single_default_idx
    on folders (is_default)
    where is_default = true;

-- Prevent confusing duplicate folder names (case-insensitive). The app's
-- createFolder/renameFolder actions catch the resulting 23505 error and
-- surface it as a friendly message.
create unique index if not exists folders_name_unique_idx on folders (lower(name));

-- 2. Seed the permanent default folder. Fixed id so the app can rely on
-- it existing without an extra lookup query if ever needed, though in
-- practice the app looks it up by `is_default = true`.
insert into folders (id, name, is_default)
values ('00000000-0000-0000-0000-000000000001', '未分類', true)
on conflict do nothing;

-- 3. Add folder_id to articles, nullable first so existing rows don't
-- immediately violate a NOT NULL constraint.
alter table articles add column if not exists folder_id uuid;

-- 4. Backfill all existing rows into the default folder.
update articles
set folder_id = '00000000-0000-0000-0000-000000000001'
where folder_id is null;

-- 5. Now that every row has a value, enforce NOT NULL going forward.
alter table articles alter column folder_id set not null;

-- 6. Foreign key. `on delete restrict` is a safety net, not the primary
-- mechanism: the app's deleteFolder action always reassigns a folder's
-- articles to the default folder BEFORE deleting the folder row, so this
-- constraint never fires during normal use. It exists so a stray direct
-- `delete from folders` (e.g. run by hand in the SQL editor) can never
-- silently orphan or cascade-delete articles.
alter table articles
    add constraint articles_folder_id_fkey
    foreign key (folder_id) references folders(id)
    on delete restrict;

-- 7. Index for the per-folder article list query (`.eq('folder_id', ...)`
-- in src/app/page.tsx).
create index if not exists articles_folder_id_idx on articles (folder_id);
