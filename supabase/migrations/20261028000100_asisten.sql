-- Fase 6 · Asisten AI: izin, batas pertanyaan per hari, dan log pemakaian (ai_usage).
-- Asisten hanya membaca. Setiap alat bacanya memakai token pengguna yang bertanya, jadi RLS tetap berlaku.

create sequence public.ai_usage_seq;

insert into public.role_permissions (role_id, aksi) values
  ('finance', 'asisten.use'),
  ('super_admin', 'asisten.use'),
  ('kepala_produksi', 'asisten.use'),
  ('petugas_lapangan', 'asisten.use');

insert into public.settings (kunci, nilai, keterangan)
values ('batas_asisten_per_hari', '30', 'Batas pertanyaan ke Asisten AI per pengguna per hari (jam Indonesia)');

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  hari date not null default ((now() at time zone 'Asia/Jakarta')::date),
  mode text not null check (mode in ('model', 'cepat')),
  pertanyaan text not null default '' check (length(pertanyaan) <= 500),
  alat text[] not null default array[]::text[],
  token_masuk int not null default 0,
  token_keluar int not null default 0,
  status text not null default 'berjalan' check (status in ('berjalan', 'selesai', 'gagal')),
  dibuat_pada timestamptz not null default now()
);
create index ai_usage_user_hari_idx on public.ai_usage (user_id, hari);

select private.pasang_aturan_tabel('public.ai_usage', false);
revoke insert, update on public.ai_usage from authenticated;

-- Pengguna melihat pemakaiannya sendiri; pemegang jejak.read (Owner) melihat semua.
create policy "pemakaian asisten terbaca" on public.ai_usage
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('jejak.read')));

-- Sisa jatah pertanyaan hari ini. Hanya pertanyaan yang memakai model dihitung (alat cepat gratis).
create or replace function public.jatah_asisten()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  batas int;
  terpakai int;
begin
  perform private.wajib_izin('asisten.use');
  select coalesce((nilai #>> '{}')::int, 30) into batas from public.settings where kunci = 'batas_asisten_per_hari';
  select count(*) into terpakai from public.ai_usage
  where user_id = (select auth.uid()) and mode = 'model' and hari = (now() at time zone 'Asia/Jakarta')::date;
  return jsonb_build_object('batas', coalesce(batas, 30), 'terpakai', terpakai, 'sisa', greatest(0, coalesce(batas, 30) - terpakai));
end;
$$;

-- Mencatat satu pertanyaan sebelum model dipanggil; ditolak bila jatah hari ini habis.
create or replace function public.mulai_asisten(p_mode text, p_pertanyaan text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  batas int;
  terpakai int;
  id_u uuid;
begin
  perform private.wajib_izin('asisten.use');
  if p_mode not in ('model', 'cepat') then
    raise exception 'Mode tidak dikenal.' using errcode = 'KT001';
  end if;
  if p_mode = 'model' then
    perform pg_advisory_xact_lock(hashtext('asisten:' || (select auth.uid())::text));
    select coalesce((nilai #>> '{}')::int, 30) into batas from public.settings where kunci = 'batas_asisten_per_hari';
    select count(*) into terpakai from public.ai_usage
    where user_id = (select auth.uid()) and mode = 'model' and hari = (now() at time zone 'Asia/Jakarta')::date;
    if terpakai >= coalesce(batas, 30) then
      raise exception 'Batas % pertanyaan per hari sudah tercapai. Coba lagi besok atau pakai pertanyaan cepat.', coalesce(batas, 30) using errcode = 'KT001';
    end if;
  end if;
  insert into public.ai_usage (user_id, mode, pertanyaan)
  values ((select auth.uid()), p_mode, left(coalesce(p_pertanyaan, ''), 500))
  returning id into id_u;
  return id_u;
end;
$$;

create or replace function public.selesai_asisten(p_id uuid, p_alat text[], p_masuk int, p_keluar int, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.wajib_izin('asisten.use');
  if p_status not in ('selesai', 'gagal') then
    raise exception 'Status tidak dikenal.' using errcode = 'KT001';
  end if;
  update public.ai_usage
  set alat = coalesce(p_alat, array[]::text[]), token_masuk = greatest(0, coalesce(p_masuk, 0)), token_keluar = greatest(0, coalesce(p_keluar, 0)), status = p_status
  where id = p_id and user_id = (select auth.uid()) and status = 'berjalan';
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.jatah_asisten()', 'public.mulai_asisten(text, text)', 'public.selesai_asisten(uuid, text[], int, int, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
