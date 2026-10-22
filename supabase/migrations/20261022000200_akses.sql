-- Fase 1 · Akses: peran, izin per aksi, profil pengguna.
-- Lima peran awal dari PRD. Owner memegang semua izin; Owner dan Finance wajib MFA (aal2).

create table public.roles (
  id text primary key,
  nama text not null,
  semua_izin boolean not null default false,
  wajib_mfa boolean not null default false,
  urutan int not null default 0
);

create table public.role_permissions (
  role_id text not null references public.roles (id),
  aksi text not null,
  primary key (role_id, aksi)
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete restrict,
  nama text not null default '',
  email text not null default '',
  role_id text references public.roles (id),
  aktif boolean not null default false,
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create index profiles_role_idx on public.profiles (role_id);

insert into public.roles (id, nama, semua_izin, wajib_mfa, urutan) values
  ('owner', 'Owner', true, true, 1),
  ('finance', 'Finance', false, true, 2),
  ('super_admin', 'Super Admin', false, false, 3),
  ('kepala_produksi', 'Kepala Produksi / QC', false, false, 4),
  ('petugas_lapangan', 'Petugas Lapangan', false, false, 5);

-- Izin Fase 1. Fase berikutnya menambah baris di migrasinya sendiri.
insert into public.role_permissions (role_id, aksi) values
  ('finance', 'master.read'),
  ('finance', 'siklus.read'),
  ('super_admin', 'master.read'),
  ('super_admin', 'master.write'),
  ('super_admin', 'pengaturan.write'),
  ('super_admin', 'akses.kelola'),
  ('super_admin', 'siklus.read'),
  ('super_admin', 'siklus.write'),
  ('kepala_produksi', 'master.read'),
  ('kepala_produksi', 'siklus.read'),
  ('petugas_lapangan', 'master.read'),
  ('petugas_lapangan', 'siklus.read');

-- Cek izin pengguna yang sedang masuk. security definer supaya tidak terkena RLS tabel peran,
-- disimpan di skema private, dan dipanggil di kebijakan sebagai (select private.has_permission(...)).
create or replace function private.has_permission(p_aksi text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.user_id = (select auth.uid())
      and p.aktif
      and (not r.wajib_mfa or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2')
      and (
        r.semua_izin
        or exists (select 1 from public.role_permissions rp where rp.role_id = r.id and rp.aksi = p_aksi)
      )
  );
$$;
revoke all on function private.has_permission(text) from public, anon;
grant execute on function private.has_permission(text) to authenticated;

-- Pemegang semua izin (Owner) yang sudah lolos MFA.
create or replace function private.punya_semua_izin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.user_id = (select auth.uid())
      and p.aktif
      and r.semua_izin
      and (not r.wajib_mfa or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2')
  );
$$;
revoke all on function private.punya_semua_izin() from public, anon;
grant execute on function private.punya_semua_izin() to authenticated;

-- Ringkasan sesi untuk aplikasi: peran, status, kebutuhan MFA, dan daftar izin.
create or replace function public.sesi_saya()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', p.user_id,
    'nama', p.nama,
    'email', p.email,
    'aktif', p.aktif,
    'role_id', r.id,
    'role_nama', r.nama,
    'semua_izin', coalesce(r.semua_izin, false),
    'wajib_mfa', coalesce(r.wajib_mfa, false),
    'aal', coalesce((select auth.jwt() ->> 'aal'), 'aal1'),
    'izin', coalesce((select jsonb_agg(rp.aksi order by rp.aksi) from public.role_permissions rp where rp.role_id = r.id), '[]'::jsonb)
  )
  from public.profiles p
  left join public.roles r on r.id = p.role_id
  where p.user_id = (select auth.uid());
$$;
revoke all on function public.sesi_saya() from public, anon;
grant execute on function public.sesi_saya() to authenticated;

-- Profil dibuat otomatis saat pengguna diundang. Peran dan status aktif diisi oleh yang mengundang,
-- tidak pernah dari metadata pengguna.
create or replace function private.buat_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, nama)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'nama', ''));
  return new;
end;
$$;
revoke all on function private.buat_profil() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.buat_profil();

-- Pengguna tidak boleh mengubah peran atau status dirinya sendiri, dan hanya pemegang semua izin
-- yang boleh memberi peran semua izin. Perubahan oleh sistem (tanpa auth.uid) dibiarkan.
create or replace function private.jaga_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pelaku uuid := (select auth.uid());
begin
  if pelaku is null then
    return new;
  end if;
  if new.user_id = pelaku and (new.role_id is distinct from old.role_id or new.aktif is distinct from old.aktif) then
    raise exception 'Tidak bisa mengubah peran atau status akun sendiri.' using errcode = '42501';
  end if;
  if not private.punya_semua_izin() then
    if new.role_id is distinct from old.role_id
       and exists (select 1 from public.roles where id = new.role_id and semua_izin) then
      raise exception 'Hanya Owner yang boleh memberi peran Owner.' using errcode = '42501';
    end if;
    if exists (select 1 from public.roles where id = old.role_id and semua_izin) then
      raise exception 'Akun Owner hanya bisa diubah oleh Owner.' using errcode = '42501';
    end if;
  end if;
  if new.email is distinct from old.email or new.user_id is distinct from old.user_id then
    raise exception 'Email dan id pengguna tidak bisa diubah dari aplikasi.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.jaga_profil() from public, anon, authenticated;
create trigger profiles_jaga before update on public.profiles
  for each row execute function private.jaga_profil();

select private.pasang_aturan_tabel('public.profiles');
select private.pasang_aturan_tabel('public.roles', false);
select private.pasang_aturan_tabel('public.role_permissions', false);
revoke insert on public.profiles from authenticated;

create policy "profil sendiri atau pengelola akses" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('akses.kelola')));
create policy "ubah nama sendiri" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "pengelola akses mengubah profil" on public.profiles
  for update to authenticated
  using ((select private.has_permission('akses.kelola')))
  with check ((select private.has_permission('akses.kelola')));

create policy "peran terbaca" on public.roles
  for select to authenticated using (true);
create policy "izin terbaca" on public.role_permissions
  for select to authenticated using (true);
-- Menambah izin hanya oleh Owner, supaya pengelola akses tidak bisa menaikkan izinnya sendiri.
create policy "owner menambah izin" on public.role_permissions
  for insert to authenticated with check ((select private.punya_semua_izin()));
revoke update on public.roles, public.role_permissions from authenticated;

create policy "jejak untuk pemegang izin" on public.activity_log
  for select to authenticated using ((select private.has_permission('jejak.read')));
