-- 23 Nov 2026: koreksi berat + grading lot sekaligus, termasuk ganti per ekor jadi berat total. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000351', 'admin35@uji.local'),
  ('00000000-0000-0000-0000-000000000352', 'petugas35@uji.local');
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 35' where user_id = '00000000-0000-0000-0000-000000000351';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 35' where user_id = '00000000-0000-0000-0000-000000000352';
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000351', 'Pemasok 35');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000351", "role": "authenticated", "aal": "aal1"}';
-- Lot per ekor: 2 ekor grade C, 459 kg.
select lives_ok($$select public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000351', current_date, null, 'lot-35', null, null, null,
    jsonb_build_array(
      jsonb_build_object('no_tag', '001', 'kg', 259, 'grade_id', (select id from public.grades where kode = 'C' and jenis = 'utuh'), 'gancu', 0),
      jsonb_build_object('no_tag', '002', 'kg', 200, 'grade_id', (select id from public.grades where kode = 'C' and jenis = 'utuh'), 'gancu', 0)))$$,
  'lot per ekor diterima');
select lives_ok($$select public.cek_mutu_grade((select id from public.lots where catatan = 'lot-35'), 'lulus')$$, 'digrading dari ekornya');

-- Ganti jadi berat total 360 kg, grading AB 175 + C 185.
select throws_ok($$select public.koreksi_berat_grading((select id from public.lots where catatan = 'lot-35'), 360, 10, '[]'::jsonb, 'uji')$$,
  'KT001', null, 'grading lama (459 kg) lebih dari berat baru, harus isi grading juga');
select lives_ok($$select public.koreksi_berat_grading((select id from public.lots where catatan = 'lot-35'), 360, 10, jsonb_build_array(
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB' and jenis = 'utuh'), 'kg', 175),
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'C' and jenis = 'utuh'), 'kg', 185)), 'salah cara catat')$$,
  'per ekor jadi berat total + grading per kg');
reset role;
select results_eq($$select kg::numeric, jumlah_ekor, qc from public.lots where catatan = 'lot-35'$$, $$values (360::numeric, 10, 'lulus'::text)$$, 'berat dan jumlah ekor baru');
select is((select count(*)::int from public.lot_ekor e join public.lots l on l.id = e.lot_id where l.catatan = 'lot-35' and not e.batal), 0, 'ekornya dibatalin');
select is((select count(*)::int from public.lot_ekor e join public.lots l on l.id = e.lot_id where l.catatan = 'lot-35' and e.batal), 2, 'ekor lama tetap kecatat (batal)');
select results_eq($$select g.kode, lg.kg::numeric from public.lot_grades lg join public.grades g on g.id = lg.grade_id join public.lots l on l.id = lg.lot_id
    where l.catatan = 'lot-35' and lg.kg > 0 order by g.kode$$, $$values ('AB'::text, 175::numeric), ('C'::text, 185::numeric)$$, 'grading per kg kesimpan');
select ok((select bool_or(sebelum ->> 'cara_catat' = 'per ekor' and sesudah ->> 'cara_catat' = 'berat total') from public.koreksi_data
    where tabel = 'lots' and ref_id = (select id from public.lots where catatan = 'lot-35')), 'koreksi cara catat kecatat');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000351", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.koreksi_berat_grading((select id from public.lots where catatan = 'lot-35'), 300, null, jsonb_build_array(
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB' and jenis = 'utuh'), 'kg', 400)), 'uji')$$,
  'KT001', null, 'grading lebih dari berat ditolak');
-- Petugas lapangan boleh koreksi berat, tapi grading-nya butuh izin mutu.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000352", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.koreksi_berat_grading((select id from public.lots where catatan = 'lot-35'), 380, null, jsonb_build_array(
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB' and jenis = 'utuh'), 'kg', 380)), 'uji')$$,
  '42501', null, 'grading tanpa izin mutu ditolak');
select lives_ok($$select public.koreksi_berat_grading((select id from public.lots where catatan = 'lot-35'), 380, null, '[]'::jsonb, 'timbang ulang')$$,
  'petugas koreksi beratnya aja');
reset role;

select * from finish();
rollback;
