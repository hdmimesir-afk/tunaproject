-- Fase 1 · Akses: peran, izin, MFA, profil. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

-- Pengguna uji. Profil dibuat otomatis oleh trigger; peran diisi sebagai sistem (tanpa auth.uid).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'owner@uji.local', '{"nama": "Owner Uji"}'),
  ('00000000-0000-0000-0000-000000000002', 'finance@uji.local', '{"nama": "Finance Uji"}'),
  ('00000000-0000-0000-0000-000000000003', 'admin@uji.local', '{"nama": "Admin Uji"}'),
  ('00000000-0000-0000-0000-000000000004', 'qc@uji.local', '{"nama": "QC Uji"}'),
  ('00000000-0000-0000-0000-000000000005', 'petugas@uji.local', '{"nama": "Petugas Uji"}'),
  ('00000000-0000-0000-0000-000000000006', 'baru@uji.local', '{"nama": "Baru Uji", "role_id": "owner"}');

select results_eq(
  $$select count(*)::int from public.profiles where email like '%@uji.local'$$,
  array[6], 'profil dibuat otomatis untuk setiap pengguna');
select results_eq(
  $$select role_id is null and not aktif from public.profiles where user_id = '00000000-0000-0000-0000-000000000006'$$,
  array[true], 'pengguna baru tanpa peran dan nonaktif, metadata role_id diabaikan');

update public.profiles set role_id = 'owner', aktif = true where user_id = '00000000-0000-0000-0000-000000000001';
update public.profiles set role_id = 'finance', aktif = true where user_id = '00000000-0000-0000-0000-000000000002';
update public.profiles set role_id = 'super_admin', aktif = true where user_id = '00000000-0000-0000-0000-000000000003';
update public.profiles set role_id = 'kepala_produksi', aktif = true where user_id = '00000000-0000-0000-0000-000000000004';
update public.profiles set role_id = 'petugas_lapangan', aktif = true where user_id = '00000000-0000-0000-0000-000000000005';

-- anon tidak punya akses sama sekali.
set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', null, 'anon tidak bisa membaca profil');
select throws_ok($$select private.has_permission('master.read')$$, '42501', null, 'anon tidak bisa memanggil fungsi private');

-- Petugas Lapangan.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000005", "role": "authenticated", "aal": "aal1"}';
select ok(private.has_permission('master.read'), 'petugas boleh membaca data master');
select ok(not private.has_permission('master.write'), 'petugas tidak boleh mengubah data master');
select ok(not private.has_permission('akses.kelola'), 'petugas tidak boleh mengelola akses');
select results_eq($$select count(*)::int from public.profiles$$, array[1], 'petugas hanya melihat profilnya sendiri');
select results_eq($$select (public.sesi_saya() ->> 'role_id')$$, array['petugas_lapangan'], 'sesi_saya mengembalikan peran');
select throws_ok(
  $$update public.profiles set role_id = 'super_admin' where user_id = '00000000-0000-0000-0000-000000000005'$$,
  '42501', null, 'pengguna tidak bisa menaikkan perannya sendiri');
select results_eq(
  $$update public.profiles set nama = 'Petugas Baru' where user_id = '00000000-0000-0000-0000-000000000005' returning nama$$,
  array['Petugas Baru'], 'pengguna boleh mengubah namanya sendiri');
select is_empty(
  $$update public.profiles set nama = 'x' where user_id = '00000000-0000-0000-0000-000000000003' returning nama$$,
  'petugas tidak bisa mengubah profil orang lain');
select is_empty($$select * from public.activity_log$$, 'petugas tidak bisa membaca jejak');

-- Pengguna nonaktif tidak punya izin apa pun.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000006", "role": "authenticated", "aal": "aal1"}';
select ok(not private.has_permission('master.read'), 'pengguna nonaktif tidak punya izin');

-- Owner wajib MFA.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}';
select ok(not private.has_permission('master.read'), 'owner tanpa MFA (aal1) ditolak');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(private.has_permission('aksi.apa.saja'), 'owner dengan MFA memegang semua izin');
select ok((select count(*) > 0 from public.activity_log), 'owner dengan MFA bisa membaca jejak');

-- Finance wajib MFA.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal1"}';
select ok(not private.has_permission('master.read'), 'finance tanpa MFA ditolak');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select ok(private.has_permission('master.read'), 'finance dengan MFA boleh membaca data master');

-- Super Admin mengelola akses, tapi tidak bisa menyentuh Owner atau menambah izin sendiri.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}';
select results_eq($$select count(*)::int from public.profiles where email like '%@uji.local'$$, array[6], 'super admin melihat semua profil');
select results_eq(
  $$update public.profiles set role_id = 'kepala_produksi', aktif = true where user_id = '00000000-0000-0000-0000-000000000006' returning role_id$$,
  array['kepala_produksi'], 'super admin memberi peran ke pengguna baru');
select throws_ok(
  $$update public.profiles set role_id = 'owner' where user_id = '00000000-0000-0000-0000-000000000006'$$,
  '42501', null, 'super admin tidak bisa memberi peran owner');
select throws_ok(
  $$update public.profiles set aktif = false where user_id = '00000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'super admin tidak bisa menonaktifkan owner');
select throws_ok(
  $$insert into public.role_permissions (role_id, aksi) values ('super_admin', 'jejak.read')$$,
  '42501', null, 'super admin tidak bisa menambah izin untuk dirinya');
select throws_ok(
  $$delete from public.profiles where user_id = '00000000-0000-0000-0000-000000000006'$$,
  '42501', null, 'profil tidak bisa dihapus');

-- Owner boleh memberi peran owner.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select results_eq(
  $$update public.profiles set role_id = 'owner' where user_id = '00000000-0000-0000-0000-000000000006' returning role_id$$,
  array['owner'], 'owner boleh memberi peran owner');

select * from finish();
rollback;
