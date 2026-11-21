-- Meeting 18 Nov 2026: penerimaan per ekor (tag, berat, grade, gancu), terima + grading sekali jalan, jumlah ekor,
-- dan koreksi timbangan produksi setelah disetujui. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000221', 'qc22@uji.local'),
  ('00000000-0000-0000-0000-000000000222', 'petugas22@uji.local');
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC 22' where user_id = '00000000-0000-0000-0000-000000000221';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 22' where user_id = '00000000-0000-0000-0000-000000000222';
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000221', 'Nelayan Uji 22');
create temp table uji22 (k text primary key, v uuid);
grant all on uji22 to authenticated;

select has_table('public', 'lot_ekor', 'tabel ekor per lot ada');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.lot_ekor'::regclass), 'RLS ekor aktif dan dipaksa');

-- ============================================================ QC: terima per ekor + grading sekali jalan
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000221", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$insert into uji22 values ('lot1', public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000221', current_date, null, 'truk 1', 'Proyek Uji 22',
  null, null, jsonb_build_array(
    jsonb_build_object('no_tag', 'T-014', 'kg', 42, 'grade_id', (select id from public.grades where kode = 'AB'), 'gancu', 0),
    jsonb_build_object('no_tag', 'T-027', 'kg', 38, 'grade_id', (select id from public.grades where kode = 'AB'), 'gancu', 1),
    jsonb_build_object('no_tag', 'T-031', 'kg', 51, 'grade_id', (select id from public.grades where kode = 'C'), 'gancu', 0),
    jsonb_build_object('no_tag', 'T-008', 'kg', 46, 'grade_id', (select id from public.grades where kode = 'AB'), 'gancu', 0))))$$,
  'terima 4 ekor sekaligus grading');
select results_eq($$select kg::text, sisa_kg::text, jumlah_ekor, qc from public.lots where id = (select v from uji22 where k = 'lot1')$$,
  $$values ('177.000', '177.000', 4, 'lulus')$$, 'berat lot = jumlah berat ekor, langsung digrading');
select results_eq($$select string_agg(g.kode || '=' || lg.kg::text, ',' order by g.kode) from public.lot_grades lg join public.grades g on g.id = lg.grade_id
  where lg.lot_id = (select v from uji22 where k = 'lot1') and lg.kg > 0$$,
  array['AB=125.000,C=51.000'], 'grading = berat dibayar per grade (gancu 1 kg dipotong)');
select results_eq($$select kg_bayar::text from public.lot_ekor where no_tag = 'T-027'$$, array['37.000'], 'berat dibayar ekor bergancu');

select throws_ok($$select public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000221', current_date, null, '', 'Proyek Uji 22', null, null,
  jsonb_build_array(jsonb_build_object('no_tag', 'A', 'kg', 10, 'grade_id', (select id from public.grades where kode = 'AB')),
                    jsonb_build_object('no_tag', 'B', 'kg', 10)))$$,
  'KT001', null, 'grade diisi sebagian ditolak');
select throws_ok($$select public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000221', current_date, null, '', 'Proyek Uji 22', null, null,
  jsonb_build_array(jsonb_build_object('no_tag', 'A', 'kg', 10), jsonb_build_object('no_tag', 'A', 'kg', 12)))$$,
  'KT001', 'Nomor tag A dipakai lebih dari sekali.', 'nomor tag ganda ditolak');
select throws_ok($$select public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000221', current_date, null, '', 'Proyek Uji 22', null, null,
  jsonb_build_array(jsonb_build_object('no_tag', 'A', 'kg', 1, 'gancu', 2)))$$,
  'KT001', 'Potongan gancu ekor ke-1 lebih besar dari beratnya.', 'potongan gancu nggak boleh lebih dari berat');
select throws_ok($$select public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000221', current_date, null, '', 'Proyek Uji 22', null, null,
  jsonb_build_array(jsonb_build_object('no_tag', 'A', 'kg', 10, 'grade_id', (select id from public.grades where kode = 'A-SO'))))$$,
  'KT001', null, 'ekor nolak grade loin');

-- Berat total + jumlah ekor + grading sekali jalan.
select lives_ok($$insert into uji22 values ('lot2', public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000221', current_date, null, '', 'Proyek Uji 22',
  200, 5, null, jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'C'), 'kg', 200))))$$,
  'terima berat total, jumlah ekor, dan grading');
select results_eq($$select kg::text, jumlah_ekor, qc from public.lots where id = (select v from uji22 where k = 'lot2')$$,
  $$values ('200.000', 5, 'lulus')$$, 'lot berat total tercatat lengkap');

-- ============================================================ petugas: per ekor tanpa grade, grading belakangan
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000222", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000221', current_date, null, '', 'Proyek Uji 22', null, null,
  jsonb_build_array(jsonb_build_object('no_tag', 'P1', 'kg', 30, 'grade_id', (select id from public.grades where kode = 'AB'))))$$,
  '42501', null, 'petugas tanpa izin mutu nggak bisa sekalian grading');
select lives_ok($$insert into uji22 values ('lot3', public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000221', current_date, null, '', 'Proyek Uji 22', null, null,
  jsonb_build_array(jsonb_build_object('no_tag', 'P1', 'kg', 30), jsonb_build_object('no_tag', 'P2', 'kg', 25, 'gancu', 2))))$$,
  'petugas terima per ekor tanpa grade');
select results_eq($$select qc, kg::text, jumlah_ekor from public.lots where id = (select v from uji22 where k = 'lot3')$$,
  $$values ('menunggu', '55.000', 2)$$, 'lot per ekor menunggu grading');
select throws_ok($$select public.koreksi_lot((select v from uji22 where k = 'lot3'), 60, current_date, '10000000-0000-0000-0000-000000000221', null, '', 'salah')$$,
  'KT001', null, 'berat lot per ekor nggak bisa diubah lewat koreksi lot');
select lives_ok($$select public.koreksi_ekor((select v from uji22 where k = 'lot3'), jsonb_build_array(
    jsonb_build_object('id', (select id from public.lot_ekor where no_tag = 'P1'), 'no_tag', 'P1', 'kg', 31),
    jsonb_build_object('id', (select id from public.lot_ekor where no_tag = 'P2'), 'no_tag', 'P2', 'kg', 25, 'gancu', 2),
    jsonb_build_object('no_tag', 'P3', 'kg', 20)), 'ada ekor ketinggalan')$$, 'koreksi ekor: tambah satu ekor, ubah berat');
select results_eq($$select kg::text, sisa_kg::text, jumlah_ekor from public.lots where id = (select v from uji22 where k = 'lot3')$$,
  $$values ('76.000', '76.000', 3)$$, 'berat dan jumlah ekor lot ikut koreksi');

-- QC grading: dari grade tiap ekor; ekor tanpa grade bikin ditolak.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000221", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.cek_mutu_grade((select v from uji22 where k = 'lot3'), 'lulus', '[]'::jsonb, '')$$,
  'KT001', 'Ada ekor yang belum ada grade-nya. Lengkapi grade tiap ekor dulu.', 'grading lot per ekor butuh grade tiap ekor');
select lives_ok($$select public.koreksi_ekor((select v from uji22 where k = 'lot3'), jsonb_build_array(
    jsonb_build_object('id', (select id from public.lot_ekor where no_tag = 'P1'), 'no_tag', 'P1', 'kg', 31, 'grade_id', (select id from public.grades where kode = 'AB')),
    jsonb_build_object('id', (select id from public.lot_ekor where no_tag = 'P2'), 'no_tag', 'P2', 'kg', 25, 'gancu', 2, 'grade_id', (select id from public.grades where kode = 'D')),
    jsonb_build_object('id', (select id from public.lot_ekor where no_tag = 'P3'), 'no_tag', 'P3', 'kg', 20, 'grade_id', (select id from public.grades where kode = 'AB'))),
  'isi grade')$$, 'QC isi grade tiap ekor');
select lives_ok($$select public.cek_mutu_grade((select v from uji22 where k = 'lot3'), 'lulus', jsonb_build_array(
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'C'), 'kg', 1)), '')$$, 'grading lot per ekor');
select results_eq($$select string_agg(g.kode || '=' || lg.kg::text, ',' order by g.kode) from public.lot_grades lg join public.grades g on g.id = lg.grade_id
  where lg.lot_id = (select v from uji22 where k = 'lot3') and lg.kg > 0$$,
  array['AB=51.000,D=23.000'], 'isian manual diabaikan, grading ikut ekor');

-- Ekor yang dibuang ditandai batal, nggak dihapus.
select lives_ok($$select public.koreksi_ekor((select v from uji22 where k = 'lot3'), jsonb_build_array(
    jsonb_build_object('id', (select id from public.lot_ekor where no_tag = 'P1'), 'no_tag', 'P1', 'kg', 31, 'grade_id', (select id from public.grades where kode = 'AB')),
    jsonb_build_object('id', (select id from public.lot_ekor where no_tag = 'P2'), 'no_tag', 'P2', 'kg', 25, 'gancu', 2, 'grade_id', (select id from public.grades where kode = 'D'))),
  'P3 salah catat')$$, 'koreksi ekor: buang satu ekor');
select results_eq($$select count(*)::int from public.lot_ekor where lot_id = (select v from uji22 where k = 'lot3') and batal$$, array[1], 'ekor dibuang = batal');
select results_eq($$select string_agg(g.kode || '=' || lg.kg::text, ',' order by g.kode) from public.lot_grades lg join public.grades g on g.id = lg.grade_id
  where lg.lot_id = (select v from uji22 where k = 'lot3') and lg.kg > 0$$,
  array['AB=31.000,D=23.000'], 'grading lot ikut koreksi ekor');

-- ============================================================ produksi: jumlah ekor dan koreksi timbangan setelah masuk stok
select lives_ok($$insert into uji22 values ('prd', public.mulai_produksi(jsonb_build_array(jsonb_build_object('lot_id', (select v from uji22 where k = 'lot1'), 'kg', 177)),
  current_date, '', (select cycle_id from public.lots where id = (select v from uji22 where k = 'lot1'))))$$, 'mulai produksi dari lot per ekor');
select lives_ok($$select public.isi_ekor_produksi((select v from uji22 where k = 'prd'), 4)$$, 'jumlah ekor produksi diisi');
select throws_ok($$select public.isi_ekor_produksi((select v from uji22 where k = 'prd'), 5, '')$$, 'KT001', 'Tulis alasan koreksinya.', 'ngubah jumlah ekor wajib alasan');
select lives_ok($$select public.simpan_loin_total((select v from uji22 where k = 'prd'),
  jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 100)))$$, 'isi loin total');
select throws_ok($$select public.koreksi_timbangan((select v from uji22 where k = 'prd'), null, null, 10, null, 'cek')$$,
  'KT001', null, 'produksi berjalan dikoreksi langsung di formnya');
reset role;
update public.productions set status = 'diperiksa' where id = (select v from uji22 where k = 'prd');
set local role authenticated;
select is((select kg_masuk::text from public.storage_units where production_id = (select v from uji22 where k = 'prd') and otomatis), '100.000', 'hasil otomatis masuk stok 100 kg');
reset role;
-- Anggap 90 kg udah kejual.
update public.storage_units set sisa_kg = 10, sisa_dasar_masuk = 10 where production_id = (select v from uji22 where k = 'prd') and otomatis;
set local role authenticated;
select throws_ok($$select public.koreksi_timbangan((select v from uji22 where k = 'prd'),
  jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 80)), null, null, null, 'salah timbang')$$,
  'KT001', null, 'loin nggak boleh kurang dari yang udah masuk stok');
select lives_ok($$select public.koreksi_timbangan((select v from uji22 where k = 'prd'),
  jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 95)), null, 30, 2, 'salah timbang')$$,
  'koreksi timbangan setelah disetujui dan masuk stok');
select results_eq($$select loin_kg::text, limbah_kg::text, status, jumlah_ekor from public.v_productions where id = (select v from uji22 where k = 'prd')$$,
  $$values ('95.000', '30.000', 'diperiksa', 4)$$, 'timbangan berubah, status tetap');
select results_eq($$select kg_masuk::text, sisa_kg::text from public.storage_units where production_id = (select v from uji22 where k = 'prd') and otomatis and grade_id is not null$$,
  $$values ('95.000', '5.000')$$, 'stok otomatis ikut koreksi timbangan');
reset role;

select * from finish();
rollback;
