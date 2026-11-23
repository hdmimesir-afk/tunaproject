-- 23 Nov 2026: hapus akun pengguna dari Akses. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000291', 'owner29@uji.local'),
  ('00000000-0000-0000-0000-000000000292', 'admin29@uji.local'),
  ('00000000-0000-0000-0000-000000000293', 'uji29@uji.local'),
  ('00000000-0000-0000-0000-000000000294', 'aktif29@uji.local'),
  ('00000000-0000-0000-0000-000000000295', 'absen29@uji.local'),
  ('00000000-0000-0000-0000-000000000296', 'petugas29@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner 29' where user_id = '00000000-0000-0000-0000-000000000291';
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 29' where user_id = '00000000-0000-0000-0000-000000000292';
update public.profiles set nama = 'Akun Uji 29' where user_id = '00000000-0000-0000-0000-000000000293';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Aktif 29' where user_id = '00000000-0000-0000-0000-000000000294';
update public.profiles set nama = 'Pernah Absen 29' where user_id = '00000000-0000-0000-0000-000000000295';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 29' where user_id = '00000000-0000-0000-0000-000000000296';
insert into public.leave_requests (user_id, jenis, dari, sampai, alasan)
  values ('00000000-0000-0000-0000-000000000295', 'izin', current_date, current_date, 'uji');

-- ============================================================ petugas nggak boleh
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000296", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.hapus_akun('00000000-0000-0000-0000-000000000293', 'uji')$$, '42501', null, 'petugas nggak bisa hapus akun');

-- ============================================================ owner
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000291", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.hapus_akun('00000000-0000-0000-0000-000000000291', 'uji')$$, 'KT001', 'Akun sendiri nggak bisa dihapus.', 'akun sendiri nggak bisa dihapus');
select throws_ok($$select public.hapus_akun('00000000-0000-0000-0000-000000000294', 'uji')$$, 'KT001', null, 'akun yg masih aktif / punya peran nggak bisa dihapus');
select throws_ok($$select public.hapus_akun('00000000-0000-0000-0000-000000000293', '  ')$$, 'KT001', null, 'wajib alasan');
select lives_ok($$select public.hapus_akun('00000000-0000-0000-0000-000000000293', 'akun uji tampilan')$$, 'akun nonaktif tanpa peran kehapus');
reset role;
select is((select count(*)::int from public.profiles where user_id = '00000000-0000-0000-0000-000000000293'), 0, 'profilnya ilang');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-000000000293'), 0, 'akun loginnya ilang');
select results_eq($$select bagian, alasan, total, rincian -> 0 -> 'kode' ->> 0 from public.hapus_data_log where 'akun' = any(bagian) order by id desc limit 1$$,
  $$values (array['akun'], 'akun uji tampilan', 1, 'Akun Uji 29 (uji29@uji.local)')$$, 'kecatat di log hapus');
select lives_ok($$insert into auth.users (id, email) values (gen_random_uuid(), 'uji29@uji.local')$$, 'email yg sama bisa dipakai bikin akun lagi');

-- Akun yg punya catatan absen atau izin nggak bisa dihapus.
select is((select count(*)::int from public.leave_requests where user_id = '00000000-0000-0000-0000-000000000295'), 1, 'catatan izin uji ada');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000292", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.hapus_akun('00000000-0000-0000-0000-000000000295', 'uji')$$,
  'KT001', null, 'akun yg punya catatan absen atau izin nggak bisa dihapus (Super Admin)');
reset role;
select is((select count(*)::int from public.profiles where user_id = '00000000-0000-0000-0000-000000000295'), 1, 'akun yg punya riwayat tetap ada');

select * from finish();
rollback;
