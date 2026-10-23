-- Fase 3 · Produksi: alokasi lot, loin per potong, komponen hasil, neraca, pemeriksaan QC lalu Owner. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000031', 'owner4@uji.local'),
  ('00000000-0000-0000-0000-000000000032', 'qc4@uji.local'),
  ('00000000-0000-0000-0000-000000000033', 'petugas4@uji.local'),
  ('00000000-0000-0000-0000-000000000034', 'finance4@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-000000000031';
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC Uji' where user_id = '00000000-0000-0000-0000-000000000032';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas Uji' where user_id = '00000000-0000-0000-0000-000000000033';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance Uji' where user_id = '00000000-0000-0000-0000-000000000034';

insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000004', 'Pemasok Produksi Uji');
insert into public.purchase_orders (id, supplier_id, kg, harga_per_kg, status_persetujuan)
values ('a0000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000004', 200, 45000, 'disetujui');
-- Lot A 100 kg lulus, lot B 50 kg ditahan, lot C 20 kg lulus (untuk produksi kedua).
insert into public.lots (id, kode, po_id, po_kode, supplier_id, kg, sisa_kg, qc, grade_id) values
  ('c0000000-0000-0000-0000-000000000041', 'LOT-T41', 'a0000000-0000-0000-0000-000000000041', 'PO-T', '10000000-0000-0000-0000-000000000004', 100, 100, 'lulus', (select id from public.grades where kode = 'A-SO')),
  ('c0000000-0000-0000-0000-000000000042', 'LOT-T42', 'a0000000-0000-0000-0000-000000000041', 'PO-T', '10000000-0000-0000-0000-000000000004', 50, 50, 'ditahan', null),
  ('c0000000-0000-0000-0000-000000000043', 'LOT-T43', 'a0000000-0000-0000-0000-000000000041', 'PO-T', '10000000-0000-0000-0000-000000000004', 20, 20, 'lulus', (select id from public.grades where kode = 'A-SO'));

select ok(exists (select 1 from public.role_permissions where role_id = 'kepala_produksi' and aksi = 'produksi.periksa'), 'QC punya izin memeriksa produksi');

-- ============================================================ Finance
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000034", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select public.mulai_produksi('[{"lot_id": "c0000000-0000-0000-0000-000000000041", "kg": 10}]'::jsonb)$$,
  '42501', null, 'finance tidak boleh memulai produksi');

-- ============================================================ Petugas lapangan
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000033", "role": "authenticated", "aal": "aal1"}';
select throws_ok(
  $$select public.mulai_produksi('[{"lot_id": "c0000000-0000-0000-0000-000000000042", "kg": 10}]'::jsonb)$$,
  'KT001', null, 'lot yang ditahan tidak bisa diproduksi');
select throws_ok(
  $$select public.mulai_produksi('[{"lot_id": "c0000000-0000-0000-0000-000000000041", "kg": 100.5}]'::jsonb)$$,
  'KT001', null, 'berat melebihi sisa lot ditolak');
select throws_ok(
  $$select public.mulai_produksi('[]'::jsonb)$$,
  'KT001', null, 'produksi tanpa lot ditolak');
select lives_ok(
  $$select public.mulai_produksi('[{"lot_id": "c0000000-0000-0000-0000-000000000041", "kg": 100}]'::jsonb, current_date, 'uji-prd')$$,
  'petugas memulai produksi dari lot lulus');
select results_eq($$select sisa_kg::text from public.lots where id = 'c0000000-0000-0000-0000-000000000041'$$, array['0.000'], 'sisa lot berkurang');
select results_eq($$select status from public.productions where catatan = 'uji-prd'$$, array['berjalan'], 'produksi berstatus berjalan');
select results_eq($$select masuk_kg::text from public.v_neraca_produksi n join public.productions p on p.id = n.production_id where p.catatan = 'uji-prd'$$, array['100.000'], 'ikan masuk dari alokasi lot');
select throws_ok(
  $$insert into public.production_items (id, production_id, no_loin, grade_id, kg) values (gen_random_uuid(), (select id from public.productions where catatan = 'uji-prd'), 1, (select id from public.grades limit 1), 1)$$,
  '42501', null, 'loin tidak bisa ditulis langsung');
select throws_ok($$delete from public.production_items$$, '42501', null, 'loin tidak bisa dihapus');

-- Loin per potong: 3 baris, tiga desimal.
select results_eq(
  $$select (public.simpan_loin((select id from public.productions where catatan = 'uji-prd'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000001', 'no_ekor', 1, 'no_loin', 1, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 20.123),
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000002', 'no_ekor', 1, 'no_loin', 2, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 30.456),
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000003', 'no_ekor', 2, 'no_loin', 3, 'grade_id', (select id from public.grades where kode = 'B-SO'), 'kg', 10.361)
  )) ->> 'disimpan')$$,
  array['3'], 'tiga loin tersimpan');
select results_eq($$select loin_kg::text from public.v_neraca_produksi n join public.productions p on p.id = n.production_id where p.catatan = 'uji-prd'$$, array['60.940'], 'total loin tepat 60,940 (tanpa pembulatan)');
-- Simpan ulang batch yang sama (draf offline terkirim dua kali) tidak menggandakan.
select results_eq(
  $$select (public.simpan_loin((select id from public.productions where catatan = 'uji-prd'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000001', 'no_ekor', 1, 'no_loin', 1, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 20.123)
  )) ->> 'sama')$$,
  array['1'], 'baris yang sama dikenali, tidak digandakan');
select results_eq($$select count(*)::int from public.production_items$$, array[3], 'tetap tiga baris loin');
select throws_ok(
  $$select public.simpan_loin((select id from public.productions where catatan = 'uji-prd'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000009', 'no_loin', 1, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 5)))$$,
  'KT001', null, 'nomor loin ganda ditolak');
select throws_ok(
  $$select public.simpan_loin((select id from public.productions where catatan = 'uji-prd'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000009', 'no_loin', 9, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 5.1234)))$$,
  'KT001', null, 'berat empat desimal ditolak');
select throws_ok(
  $$select public.simpan_loin((select id from public.productions where catatan = 'uji-prd'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000009', 'no_loin', 9, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 500)))$$,
  'KT001', null, 'loin yang membuat total melebihi ikan masuk ditolak');

-- Koreksi dan riwayat.
select results_eq(
  $$select (public.simpan_loin((select id from public.productions where catatan = 'uji-prd'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000001', 'no_ekor', 1, 'no_loin', 1, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 20.2)
  )) ->> 'disimpan')$$,
  array['1'], 'koreksi berat tersimpan');
select results_eq(
  $$select aksi from public.production_items_history where item_id = 'b0000000-0000-0000-0000-000000000001' order by id$$,
  array['tambah', 'koreksi'], 'riwayat mencatat tambah lalu koreksi');
select results_eq(
  $$select (sebelum ->> 'kg') || '>' || (sesudah ->> 'kg') from public.production_items_history where item_id = 'b0000000-0000-0000-0000-000000000001' and aksi = 'koreksi'$$,
  array['20.123>20.200'], 'riwayat menyimpan berat sebelum dan sesudah');
-- Dua petugas: yang membawa versi lama tidak menimpa diam-diam.
select results_eq(
  $$select jsonb_array_length(public.simpan_loin((select id from public.productions where catatan = 'uji-prd'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000001', 'no_ekor', 1, 'no_loin', 1, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 19, 'versi', 1)
  )) -> 'konflik')$$,
  array[1], 'versi lama dilaporkan sebagai konflik, bukan menimpa');
select results_eq($$select kg::text from public.production_items where id = 'b0000000-0000-0000-0000-000000000001'$$, array['20.200'], 'isi baris tidak berubah saat konflik');

-- Batalkan loin dengan alasan.
select throws_ok($$select public.batalkan_loin('b0000000-0000-0000-0000-000000000003', '')$$, 'KT001', null, 'batal tanpa alasan ditolak');
select lives_ok($$select public.batalkan_loin('b0000000-0000-0000-0000-000000000003', 'salah timbang')$$, 'loin dibatalkan dengan alasan');
select results_eq($$select loin_kg::text from public.v_neraca_produksi n join public.productions p on p.id = n.production_id where p.catatan = 'uji-prd'$$, array['50.656'], 'loin batal tidak dihitung');

-- Komponen hasil dan neraca.
select lives_ok(
  $$select public.simpan_komponen((select id from public.productions where catatan = 'uji-prd'),
      jsonb_build_array(jsonb_build_object('category_id', (select id from public.component_categories where nama = 'Toro'), 'kg', 10)), 5, null)$$,
  'hasil samping dan limbah tersimpan, susut belum ditimbang');
select results_eq(
  $$select belum_jelas_kg::text from public.v_neraca_produksi n join public.productions p on p.id = n.production_id where p.catatan = 'uji-prd'$$,
  array['34.344'], 'selisih belum jelas adalah sisa hitungan');
select results_eq(
  $$select (n.susut_kg is null)::text from public.v_neraca_produksi n join public.productions p on p.id = n.production_id where p.catatan = 'uji-prd'$$,
  array['true'], 'susut yang belum ditimbang tetap kosong, bukan nol');
select throws_ok(
  $$select public.simpan_komponen((select id from public.productions where catatan = 'uji-prd'), '[]'::jsonb, 1000, null)$$,
  'KT001', null, 'komponen yang melebihi ikan masuk ditolak');

-- Selesai, lalu terkunci.
select lives_ok($$select public.selesaikan_produksi((select id from public.productions where catatan = 'uji-prd'))$$, 'petugas menyelesaikan produksi');
select throws_ok(
  $$select public.simpan_loin((select id from public.productions where catatan = 'uji-prd'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000008', 'no_loin', 8, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 1)))$$,
  'KT001', null, 'produksi yang selesai tidak bisa diubah');
select throws_ok($$select public.periksa_produksi((select id from public.productions where catatan = 'uji-prd'), 'x')$$, '42501', null, 'petugas tidak boleh memeriksa');

-- ============================================================ QC
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000032", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.periksa_produksi((select id from public.productions where catatan = 'uji-prd'), '')$$, 'KT001', null, 'selisih belum dijelaskan: QC tidak bisa memeriksa');
select lives_ok($$select public.periksa_produksi((select id from public.productions where catatan = 'uji-prd'), 'Tulang tengah belum ditimbang')$$, 'QC memeriksa dengan penjelasan selisih');
select throws_ok($$select public.setujui_produksi((select id from public.productions where catatan = 'uji-prd'))$$, '42501', null, 'QC tidak boleh menyetujui sebagai Owner');

-- QC yang menimbang sendiri tidak boleh memeriksa.
select lives_ok(
  $$select public.mulai_produksi('[{"lot_id": "c0000000-0000-0000-0000-000000000043", "kg": 20}]'::jsonb, current_date, 'uji-prd-2')$$,
  'QC memulai produksi kedua');
select lives_ok(
  $$select public.simpan_loin((select id from public.productions where catatan = 'uji-prd-2'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000021', 'no_loin', 1, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 12.5)))$$,
  'QC mengisi loin produksi kedua');
select lives_ok($$select public.selesaikan_produksi((select id from public.productions where catatan = 'uji-prd-2'))$$, 'QC menyelesaikan produksi kedua');
select throws_ok($$select public.periksa_produksi((select id from public.productions where catatan = 'uji-prd-2'), 'sendiri')$$, 'KT001', null, 'yang menimbang tidak boleh memeriksa produksi yang sama');

-- ============================================================ Owner
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000031", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$select public.setujui_produksi((select id from public.productions where catatan = 'uji-prd'))$$, 'Owner menyetujui produksi yang selisihnya sudah dijelaskan');
select results_eq($$select status from public.productions where catatan = 'uji-prd'$$, array['diperiksa'], 'status menjadi diperiksa');
select lives_ok($$select public.minta_perbaikan_produksi((select id from public.productions where catatan = 'uji-prd-2'), 'Timbang ulang loin 1')$$, 'Owner meminta perbaikan');
select results_eq($$select status from public.productions where catatan = 'uji-prd-2'$$, array['berjalan'], 'produksi kembali berjalan setelah diminta perbaikan');

select * from finish();
rollback;
