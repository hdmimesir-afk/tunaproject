-- Fase 1 · Dasar: skema private, hak bawaan, jejak perubahan, dan larangan hapus.
-- Aturan (PRD, Keamanan data): tidak ada DELETE dari aplikasi; semua perubahan tercatat; anon tidak punya akses tabel.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Tabel yang dibuat migrasi berikutnya: anon tidak dapat apa-apa, authenticated tidak bisa DELETE/TRUNCATE.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke delete, truncate on tables from authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon;

-- Kolom diubah_pada / diubah_oleh diisi otomatis.
create or replace function private.set_diubah()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.diubah_pada := now();
  new.diubah_oleh := (select auth.uid());
  return new;
end;
$$;

-- Hapus fisik ditolak, juga untuk peran database. Admin teknis harus menonaktifkan trigger lewat migrasi.
create or replace function private.tolak_hapus()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Data % tidak boleh dihapus. Batalkan atau koreksi dengan alasan.', tg_table_name
    using errcode = '42501';
end;
$$;

-- Jejak perubahan: sebelum dan sesudah, siapa, kapan. Hanya bisa ditambah oleh trigger.
create table public.activity_log (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  user_id uuid,
  tabel text not null,
  ref_id text,
  aksi text not null check (aksi in ('INSERT', 'UPDATE')),
  sebelum jsonb,
  sesudah jsonb
);
create index activity_log_waktu_idx on public.activity_log (waktu desc);
create index activity_log_ref_idx on public.activity_log (tabel, ref_id);
alter table public.activity_log enable row level security;
alter table public.activity_log force row level security;
revoke all on public.activity_log from anon;
revoke insert, update, delete, truncate on public.activity_log from authenticated;

create or replace function private.catat_jejak()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  baru jsonb := to_jsonb(new);
begin
  insert into public.activity_log (user_id, tabel, ref_id, aksi, sebelum, sesudah)
  values (
    (select auth.uid()),
    tg_table_name,
    coalesce(baru ->> 'id', baru ->> 'user_id', baru ->> 'kunci'),
    tg_op,
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    baru
  );
  return new;
end;
$$;
revoke all on function private.catat_jejak() from public, anon, authenticated;

create trigger activity_log_tolak_hapus before delete on public.activity_log
  for each row execute function private.tolak_hapus();
create or replace function private.tolak_ubah_jejak()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Jejak perubahan tidak boleh diubah.' using errcode = '42501';
end;
$$;
create trigger activity_log_tolak_ubah before update on public.activity_log
  for each row execute function private.tolak_ubah_jejak();

-- Pasang jejak, larangan hapus, dan diubah_pada ke satu tabel. Dipakai migrasi berikutnya.
create or replace function private.pasang_aturan_tabel(nama_tabel regclass, punya_kolom_diubah boolean default true)
returns void
language plpgsql
set search_path = ''
as $$
declare
  t text := nama_tabel::text;
  pendek text := split_part(nama_tabel::text, '.', 2);
begin
  execute format('alter table %s enable row level security', t);
  execute format('alter table %s force row level security', t);
  execute format('revoke all on %s from anon', t);
  execute format('revoke delete, truncate on %s from authenticated', t);
  execute format('create trigger %I before delete on %s for each row execute function private.tolak_hapus()', pendek || '_tolak_hapus', t);
  execute format('create trigger %I after insert or update on %s for each row execute function private.catat_jejak()', pendek || '_jejak', t);
  if punya_kolom_diubah then
    execute format('create trigger %I before update on %s for each row execute function private.set_diubah()', pendek || '_diubah', t);
  end if;
end;
$$;
revoke all on function private.pasang_aturan_tabel(regclass, boolean) from public, anon, authenticated;
