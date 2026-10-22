-- Fase 1 · Data master, pengaturan, siklus, dan jejak. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000011', 'owner2@uji.local'),
  ('00000000-0000-0000-0000-000000000013', 'admin2@uji.local'),
  ('00000000-0000-0000-0000-000000000015', 'petugas2@uji.local');
update public.profiles set role_id = 'owner', aktif = true where user_id = '00000000-0000-0000-0000-000000000011';
update public.profiles set role_id = 'super_admin', aktif = true where user_id = '00000000-0000-0000-0000-000000000013';
update public.profiles set role_id = 'petugas_lapangan', aktif = true where user_id = '00000000-0000-0000-0000-000000000015';

-- anon
set local role anon;
select throws_ok($$select * from public.suppliers$$, '42501', null, 'anon tidak bisa membaca pemasok');

-- Petugas Lapangan: baca saja.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000015", "role": "authenticated", "aal": "aal1"}';
select results_eq($$select count(*)::int from public.grades$$, array[6], 'petugas membaca 6 grade awal');
select throws_ok(
  $$insert into public.suppliers (nama) values ('Pemasok Uji')$$,
  '42501', null, 'petugas tidak bisa menambah pemasok');
select is_empty($$update public.grades set nama = 'x' returning id$$, 'petugas tidak bisa mengubah grade');
select is_empty($$update public.settings set nilai = '70' returning kunci$$, 'petugas tidak bisa mengubah pengaturan');
select throws_ok(
  $$insert into public.cycles (ref_po_pembeli) values ('PO-UJI')$$,
  '42501', null, 'petugas tidak bisa membuat siklus');

-- Super Admin: kelola data master, pengaturan, siklus.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000013", "role": "authenticated", "aal": "aal1"}';
select results_eq(
  $$insert into public.suppliers (nama, kontak) values ('Pemasok A', '0812') returning nama$$,
  array['Pemasok A'], 'super admin menambah pemasok');
select results_eq(
  $$select dibuat_oleh::text from public.suppliers where nama = 'Pemasok A'$$,
  array['00000000-0000-0000-0000-000000000013'], 'pembuat tercatat otomatis');
select throws_ok(
  $$insert into public.suppliers (nama) values ('pemasok a')$$,
  '23505', null, 'nama pemasok tidak boleh ganda (huruf besar kecil diabaikan)');
select results_eq(
  $$update public.suppliers set aktif = false where nama = 'Pemasok A' returning aktif$$,
  array[false], 'pemasok dinonaktifkan, bukan dihapus');
select results_eq(
  $$select diubah_oleh::text from public.suppliers where nama = 'Pemasok A'$$,
  array['00000000-0000-0000-0000-000000000013'], 'pengubah tercatat otomatis');
select throws_ok(
  $$delete from public.suppliers where nama = 'Pemasok A'$$,
  '42501', null, 'pemasok tidak bisa dihapus');
select results_eq(
  $$update public.settings set nilai = '62' where kunci = 'rencana_hasil_pct' returning nilai::text$$,
  array['62'], 'super admin mengubah rencana hasil');
select throws_ok(
  $$insert into public.settings (kunci, nilai) values ('baru', '1')$$,
  '42501', null, 'pengaturan baru hanya lewat migrasi');
select results_eq(
  $$insert into public.cycles (ref_po_pembeli, no_bongkar) values ('PO-UJI', 'BK-1') returning kode like 'SIK-%'$$,
  array[true], 'kode siklus dibuat sistem');
select is_empty($$select * from public.activity_log$$, 'super admin tidak membaca jejak');
select throws_ok($$delete from public.activity_log$$, '42501', null, 'jejak tidak bisa dihapus');

-- Petugas melihat siklus yang dibuat.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000015", "role": "authenticated", "aal": "aal1"}';
select results_eq($$select count(*)::int from public.cycles where ref_po_pembeli = 'PO-UJI'$$, array[1], 'petugas membaca siklus');

-- Owner dengan MFA membaca jejak perubahan pemasok, lengkap dengan pelaku dan isi sebelum/sesudah.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000011", "role": "authenticated", "aal": "aal2"}';
select results_eq(
  $$select count(*)::int from public.activity_log
    where tabel = 'suppliers' and user_id = '00000000-0000-0000-0000-000000000013' and aksi = 'UPDATE'
      and sebelum ->> 'aktif' = 'true' and sesudah ->> 'aktif' = 'false'$$,
  array[1], 'jejak mencatat siapa mengubah apa');

select * from finish();
rollback;
