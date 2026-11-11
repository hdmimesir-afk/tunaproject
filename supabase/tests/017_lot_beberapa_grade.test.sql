-- Notulen 10 Nov 2026 poin 6: satu lot bisa berisi beberapa grade. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000171', 'qc17@uji.local'),
  ('00000000-0000-0000-0000-000000000172', 'petugas17@uji.local');
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC 17' where user_id = '00000000-0000-0000-0000-000000000171';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 17' where user_id = '00000000-0000-0000-0000-000000000172';

insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000017', 'Nelayan Uji 17');
insert into public.purchase_orders (id, supplier_id, kg, harga_per_kg, status_persetujuan)
values ('a0000000-0000-0000-0000-000000000171', '10000000-0000-0000-0000-000000000017', 1000, 40000, 'disetujui');
insert into public.lots (id, kode, po_id, po_kode, supplier_id, tanggal_terima, kg, sisa_kg) values
  ('c0000000-0000-0000-0000-000000000171', 'LOT-T171', 'a0000000-0000-0000-0000-000000000171', 'PO-T17', '10000000-0000-0000-0000-000000000017', date '2026-11-01', 500, 500),
  ('c0000000-0000-0000-0000-000000000172', 'LOT-T172', 'a0000000-0000-0000-0000-000000000171', 'PO-T17', '10000000-0000-0000-0000-000000000017', date '2026-11-01', 200, 200);

select has_table('public', 'lot_grades', 'tabel grade per lot ada');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.lot_grades'::regclass), 'RLS aktif dan dipaksa');

-- ============================================================ QC: satu lot, tiga grade
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000171", "role": "authenticated", "aal": "aal1"}';
select lives_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000171', 'lulus', jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 300),
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'B-SO'), 'kg', 150.5),
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'C-SO'), 'kg', 40)
  ), 'campur')$$,
  'lot lulus dengan tiga grade');
select results_eq(
  $$select string_agg(g.kode || '=' || lg.kg::text, ',' order by g.kode) from public.lot_grades lg join public.grades g on g.id = lg.grade_id where lg.lot_id = 'c0000000-0000-0000-0000-000000000171' and lg.kg > 0$$,
  array['A-SO=300.000,B-SO=150.500,C-SO=40.000'], 'berat per grade tersimpan');
select results_eq(
  $$select l.qc || ' ' || g.kode from public.lots l join public.grades g on g.id = l.grade_id where l.id = 'c0000000-0000-0000-0000-000000000171'$$,
  array['lulus A-SO'], 'grade utama lot = grade terberat');

-- Diubah: C-SO dikeluarkan, B-SO jadi terberat.
select lives_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000171', 'lulus', jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 100),
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'B-SO'), 'kg', 400)
  ), 'dinilai ulang')$$,
  'cek mutu bisa diubah selama lot belum dipakai');
select results_eq(
  $$select string_agg(g.kode || '=' || lg.kg::text, ',' order by g.kode) from public.lot_grades lg join public.grades g on g.id = lg.grade_id where lg.lot_id = 'c0000000-0000-0000-0000-000000000171'$$,
  array['A-SO=100.000,B-SO=400.000,C-SO=0.000'], 'grade yang dikeluarkan jadi nol, tidak dihapus');
select results_eq(
  $$select g.kode from public.lots l join public.grades g on g.id = l.grade_id where l.id = 'c0000000-0000-0000-0000-000000000171'$$,
  array['B-SO'], 'grade utama ikut berubah');

-- Penolakan.
select throws_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000172', 'lulus', jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 150),
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'B-SO'), 'kg', 60)))$$,
  'KT001', null, 'jumlah per grade melebihi berat lot ditolak');
select throws_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000172', 'lulus', '[]'::jsonb)$$,
  'KT001', null, 'lulus tanpa grade ditolak');
select throws_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000172', 'lulus', jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 10),
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 20)))$$,
  'KT001', null, 'grade ganda ditolak');
select throws_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000172', 'lulus', jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 0)))$$,
  'KT001', null, 'berat nol ditolak');
select throws_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000172', 'lulus', jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 1.2345)))$$,
  'KT001', null, 'lebih dari tiga desimal ditolak');
select throws_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000172', 'oke', '[]'::jsonb)$$,
  'KT001', null, 'hasil selain lulus atau ditahan ditolak');

-- Sebagian saja yang dibagi: sisanya tetap tercatat belum dinilai di laporan harga beli.
select lives_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000172', 'lulus', jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 150)))$$,
  'jumlah per grade boleh kurang dari berat lot');

-- Versi lama satu grade tetap jalan dan memakai seluruh berat lot.
select lives_ok(
  $$select public.cek_mutu('c0000000-0000-0000-0000-000000000172', 'lulus', (select id from public.grades where kode = 'C-SO'), 'satu grade')$$,
  'cek_mutu lama tetap bisa dipakai');
select results_eq(
  $$select string_agg(g.kode || '=' || lg.kg::text, ',' order by g.kode) from public.lot_grades lg join public.grades g on g.id = lg.grade_id where lg.lot_id = 'c0000000-0000-0000-0000-000000000172' and lg.kg > 0$$,
  array['C-SO=200.000'], 'cek_mutu lama: seluruh 200 kg masuk satu grade');
select lives_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000172', 'lulus', jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 150)))$$,
  'kembali ke 150 kg A-SO');

-- Laporan harga beli: nilai dibagi per grade, sisa 50 kg belum dinilai. Dibaca sebagai pemilik karena QC tidak melihat harga PO.
reset role;
select results_eq(
  $$select string_agg(grade_kode || '=' || kg::text || '/' || nilai::text, ',' order by grade_kode) from public.v_harga_beli where supplier_id = '10000000-0000-0000-0000-000000000017'$$,
  array['A-SO=250.000/10000000.00,B-SO=400.000/16000000.00,Belum dinilai=50.000/2000000.00'], 'harga beli dibagi per grade, sisa jadi belum dinilai');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000171", "role": "authenticated", "aal": "aal1"}';

-- Tahan: semua grade dikosongkan.
select lives_ok($$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000172', 'ditahan', '[]'::jsonb, 'bau')$$, 'lot bisa ditahan');
select results_eq(
  $$select coalesce(sum(kg), 0)::text || ' ' || (select coalesce(grade_id::text, 'kosong') from public.lots where id = 'c0000000-0000-0000-0000-000000000172') from public.lot_grades where lot_id = 'c0000000-0000-0000-0000-000000000172'$$,
  array['0.000 kosong'],'lot ditahan: berat grade nol dan grade utama kosong');

-- Tabel hanya diubah lewat fungsi.
select throws_ok(
  $$insert into public.lot_grades (lot_id, grade_id, kg) values ('c0000000-0000-0000-0000-000000000172', (select id from public.grades where kode = 'A-SO'), 5)$$,
  '42501', null, 'tidak bisa menulis langsung ke lot_grades');

-- ============================================================ Petugas: boleh baca, tidak boleh menilai
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000172", "role": "authenticated", "aal": "aal1"}';
select results_eq($$select count(*)::int from public.lot_grades where lot_id = 'c0000000-0000-0000-0000-000000000171' and kg > 0$$, array[2], 'petugas lapangan bisa melihat grade lot');
select throws_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000171', 'ditahan', '[]'::jsonb)$$,
  '42501', null, 'tanpa izin mutu.write ditolak');

-- Lot yang sudah dipakai produksi tidak bisa dinilai ulang.
select lives_ok($$select public.mulai_produksi('[{"lot_id": "c0000000-0000-0000-0000-000000000171", "kg": 50}]'::jsonb, current_date, 'uji17')$$, 'produksi memakai lot campuran');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000171", "role": "authenticated", "aal": "aal1"}';
select throws_ok(
  $$select public.cek_mutu_grade('c0000000-0000-0000-0000-000000000171', 'lulus', jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 500)))$$,
  'KT001', null, 'lot yang sudah dipakai produksi tidak bisa dinilai ulang');
select throws_ok($$delete from public.lot_grades$$, '42501', null, 'grade lot tidak bisa dihapus');
reset role;

select * from finish();
rollback;
