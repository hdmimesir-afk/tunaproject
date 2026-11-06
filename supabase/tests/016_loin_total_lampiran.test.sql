-- Keputusan 6 Nov 2026: loin cukup total per grade (per potong jadi pilihan, tidak dicampur) dan lampiran titipan. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000161', 'qc16@uji.local'),
  ('00000000-0000-0000-0000-000000000162', 'petugas16@uji.local'),
  ('00000000-0000-0000-0000-000000000163', 'finance16@uji.local'),
  ('00000000-0000-0000-0000-000000000164', 'qc16b@uji.local');
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC 16' where user_id = '00000000-0000-0000-0000-000000000161';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 16' where user_id = '00000000-0000-0000-0000-000000000162';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance 16' where user_id = '00000000-0000-0000-0000-000000000163';
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC 16 B' where user_id = '00000000-0000-0000-0000-000000000164';

insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000016', 'Nelayan Uji 16');
insert into public.purchase_orders (id, supplier_id, kg, harga_per_kg, status_persetujuan)
values ('a0000000-0000-0000-0000-000000000161', '10000000-0000-0000-0000-000000000016', 300, 45000, 'disetujui');
insert into public.lots (id, kode, po_id, po_kode, supplier_id, kg, sisa_kg, qc, grade_id) values
  ('c0000000-0000-0000-0000-000000000161', 'LOT-T161', 'a0000000-0000-0000-0000-000000000161', 'PO-T16', '10000000-0000-0000-0000-000000000016', 100, 100, 'lulus', (select id from public.grades where kode = 'A-SO')),
  ('c0000000-0000-0000-0000-000000000162', 'LOT-T162', 'a0000000-0000-0000-0000-000000000161', 'PO-T16', '10000000-0000-0000-0000-000000000016', 100, 100, 'lulus', (select id from public.grades where kode = 'A-SO')),
  ('c0000000-0000-0000-0000-000000000163', 'LOT-T163', 'a0000000-0000-0000-0000-000000000161', 'PO-T16', '10000000-0000-0000-0000-000000000016', 100, 100, 'lulus', (select id from public.grades where kode = 'A-SO'));

select has_table('public', 'production_loin_totals', 'tabel total loin per grade ada');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.production_loin_totals'::regclass), 'RLS aktif dan dipaksa');

-- ============================================================ Petugas: produksi 1 memakai total per grade
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000162", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$select public.mulai_produksi('[{"lot_id": "c0000000-0000-0000-0000-000000000161", "kg": 100}]'::jsonb, current_date, 'uji16-total')$$, 'produksi dimulai');
select throws_ok(
  $$select public.selesaikan_produksi((select id from public.productions where catatan = 'uji16-total'))$$,
  'KT001', null, 'produksi tanpa berat loin tidak bisa diselesaikan');
select results_eq(
  $$select (public.simpan_loin_total((select id from public.productions where catatan = 'uji16-total'), jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 30),
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'B-SO'), 'kg', 20.5)
  )) ->> 'total_loin')$$,
  array['50.500'], 'total loin dua grade tersimpan');
select results_eq(
  $$select loin_kg::text || ' ' || jumlah_loin::text || ' ' || hasil_pct::text || ' ' || belum_jelas_kg::text from public.v_neraca_produksi n join public.productions p on p.id = n.production_id where p.catatan = 'uji16-total'$$,
  array['50.500 0 50.5 49.500'], 'neraca memakai total per grade: yield 50,5% dari 100 kg');
-- Simpan ulang isi yang sama tidak menambah baris.
select lives_ok(
  $$select public.simpan_loin_total((select id from public.productions where catatan = 'uji16-total'), jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 30)))$$,
  'simpan ulang aman');
select results_eq($$select count(*)::int from public.production_loin_totals t join public.productions p on p.id = t.production_id where p.catatan = 'uji16-total'$$, array[2], 'tetap dua baris grade');
select throws_ok(
  $$select public.simpan_loin((select id from public.productions where catatan = 'uji16-total'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000161', 'no_loin', 1, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 5)))$$,
  'KT001', null, 'loin per potong ditolak bila sudah ada total per grade');
select throws_ok(
  $$select public.simpan_loin_total((select id from public.productions where catatan = 'uji16-total'), jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'C-SO'), 'kg', 60)))$$,
  'KT001', null, 'total yang melebihi ikan masuk ditolak');
select throws_ok(
  $$select public.simpan_loin_total((select id from public.productions where catatan = 'uji16-total'), jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 1),
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 2)))$$,
  'KT001', null, 'grade ganda dalam satu kiriman ditolak');
select throws_ok(
  $$select public.simpan_loin_total((select id from public.productions where catatan = 'uji16-total'), jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', -1)))$$,
  'KT001', null, 'berat negatif ditolak');
select throws_ok(
  $$select public.simpan_loin_total((select id from public.productions where catatan = 'uji16-total'), jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 1.2345)))$$,
  'KT001', null, 'berat empat desimal ditolak');
select throws_ok(
  $$insert into public.production_loin_totals (production_id, grade_id, kg) values ((select id from public.productions where catatan = 'uji16-total'), (select id from public.grades where kode = 'C-SO'), 1)$$,
  '42501', null, 'total loin tidak bisa ditulis langsung');
select throws_ok($$delete from public.production_loin_totals$$, '42501', null, 'total loin tidak bisa dihapus');
-- Mengosongkan semua grade (kg 0) membuka jalan ke timbang per potong.
select lives_ok(
  $$select public.simpan_loin_total((select id from public.productions where catatan = 'uji16-total'), jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 0),
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'B-SO'), 'kg', 0)))$$,
  'semua grade dikosongkan');
select results_eq($$select loin_kg::text from public.v_neraca_produksi n join public.productions p on p.id = n.production_id where p.catatan = 'uji16-total'$$, array['0.000'], 'loin kembali nol');
select lives_ok(
  $$select public.simpan_loin((select id from public.productions where catatan = 'uji16-total'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-000000000162', 'no_loin', 1, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 12.5)))$$,
  'setelah dikosongkan, per potong boleh');
select throws_ok(
  $$select public.simpan_loin_total((select id from public.productions where catatan = 'uji16-total'), jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 10)))$$,
  'KT001', null, 'total per grade ditolak bila sudah ada loin per potong');
select results_eq($$select loin_kg::text from public.v_neraca_produksi n join public.productions p on p.id = n.production_id where p.catatan = 'uji16-total'$$, array['12.500'], 'tidak terhitung dua kali');

-- ============================================================ Finance tidak boleh mengisi
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000163", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select public.simpan_loin_total((select id from public.productions where catatan = 'uji16-total'), '[]'::jsonb)$$,
  '42501', null, 'finance tidak boleh mengisi total loin');
select results_eq($$select count(*)::int from public.production_loin_totals t join public.productions p on p.id = t.production_id where p.catatan = 'uji16-total'$$, array[2], 'finance (produksi.read) bisa membaca total loin');

-- ============================================================ QC yang mengisi total tidak boleh memeriksa
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000162", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$select public.mulai_produksi('[{"lot_id": "c0000000-0000-0000-0000-000000000162", "kg": 100}]'::jsonb, current_date, 'uji16-qc')$$, 'produksi kedua dimulai petugas');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000161", "role": "authenticated", "aal": "aal1"}';
select lives_ok(
  $$select public.simpan_loin_total((select id from public.productions where catatan = 'uji16-qc'), jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 60)))$$,
  'QC mengisi total loin');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000162", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$select public.selesaikan_produksi((select id from public.productions where catatan = 'uji16-qc'))$$, 'produksi dengan total per grade bisa diselesaikan');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000161", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.periksa_produksi((select id from public.productions where catatan = 'uji16-qc'), 'tetelan belum ditimbang')$$,
  'KT001', null, 'yang mengisi total loin tidak boleh memeriksa produksi yang sama');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000164", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$select public.periksa_produksi((select id from public.productions where catatan = 'uji16-qc'), 'tetelan belum ditimbang')$$,
  'QC lain boleh memeriksa');

-- ============================================================ Lampiran titipan
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000162", "role": "authenticated", "aal": "aal1"}';
select lives_ok(
  $$insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe)
    values ('storage_units', gen_random_uuid(), 'tanda_terima', 'storage_units/uji16/tanda.pdf', 'tanda.pdf', 1000, 'application/pdf')$$,
  'tanda terima bisa dilampirkan ke titipan');
select throws_ok(
  $$insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe)
    values ('storage_units', gen_random_uuid(), 'faktur_pajak', 'storage_units/uji16/x.pdf', 'x.pdf', 1000, 'application/pdf')$$,
  '23514', null, 'jenis berkas di luar daftar ditolak');

select * from finish();
rollback;
