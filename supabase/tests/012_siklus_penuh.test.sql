-- Satu siklus penuh dari beli ikan sampai uang masuk, hanya lewat fungsi aplikasi dan peran sungguhan, tanpa input ulang:
-- PO -> periksa -> setuju -> bayar pemasok -> terima -> mutu -> produksi per loin -> neraca -> stok -> pesanan -> kirim -> invoice -> bayar pembeli -> biaya -> laporan.
-- Angka sengaja bulat supaya mudah dicocokkan. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'owner12@uji.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'finance12@uji.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'admin12@uji.local'),
  ('00000000-0000-0000-0000-0000000000c4', 'qc12@uji.local'),
  ('00000000-0000-0000-0000-0000000000c5', 'petugas12@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-0000000000c1';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance Uji' where user_id = '00000000-0000-0000-0000-0000000000c2';
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin Uji' where user_id = '00000000-0000-0000-0000-0000000000c3';
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC Uji' where user_id = '00000000-0000-0000-0000-0000000000c4';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas Uji' where user_id = '00000000-0000-0000-0000-0000000000c5';

insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-0000000000c1', 'Pemasok Siklus Penuh');
insert into public.buyers (id, nama, tempo_hari) values ('b1000000-0000-0000-0000-0000000000c1', 'Pembeli Siklus Penuh', 14);
insert into public.cycles (id, ref_po_pembeli) values ('c2000000-0000-0000-0000-0000000000c1', 'PO-PENUH');
-- Saldo kas sebelum siklus, supaya perbandingan di akhir tidak bergantung pada isi lain di database uji.
create temp table saldo_awal as
  select coalesce(sum(case when arah = 'masuk' then jumlah else -jumlah end), 0) as s from public.ledger;

-- ============================================================ 1. Pembelian (Super Admin)
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated", "aal": "aal1"}';
select lives_ok(
  $$insert into public.purchase_orders (supplier_id, kg, harga_per_kg, catatan) values ('10000000-0000-0000-0000-0000000000c1', 200, 45000, 'full-po')$$,
  'PO 200 kg x Rp45.000 dibuat');
select lives_ok($$update public.purchase_orders set cycle_id = 'c2000000-0000-0000-0000-0000000000c1' where catatan = 'full-po'$$, 'PO dihubungkan ke siklus');
select lives_ok(
  $$insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe) values ('purchase_orders', (select id from public.purchase_orders where catatan = 'full-po'), 'nota', 'po/full/nota.jpg', 'nota.jpg', 1000, 'image/jpeg')$$,
  'nota beli dilampirkan');
select ok(public.ajukan_po((select id from public.purchase_orders where catatan = 'full-po')) is not null, 'PO diajukan');
-- Petugas dan QC tidak boleh melihat PO (harga), jadi id-nya disimpan sekali di sini untuk langkah lapangan.
do $$ begin perform set_config('uji.po', (select id::text from public.purchase_orders where catatan = 'full-po'), false); end $$;

-- ============================================================ 2. Periksa, setuju, bayar
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c2", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select public.periksa_persetujuan((select id from public.approvals where ref_id = (select id from public.purchase_orders where catatan = 'full-po') order by kode desc limit 1), 'nota cocok')$$,
  'Finance memeriksa PO');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated", "aal": "aal2"}';
select is(
  (public.setujui_persetujuan(array[(select id from public.approvals where ref_id = (select id from public.purchase_orders where catatan = 'full-po') order by kode desc limit 1)], 9000000) ->> 'jumlah')::int,
  1, 'Owner menyetujui PO senilai Rp9.000.000');
select is((select status_bayar from public.v_purchase_orders where catatan = 'full-po'), 'belum', 'disetujui belum berarti dibayar');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c2", "role": "authenticated", "aal": "aal2"}';
select ok(public.catat_bayar((select id from public.purchase_orders where catatan = 'full-po'), 9000000, current_date, 'lunas') is not null, 'Finance membayar pemasok lunas');
select is((select status_bayar from public.v_purchase_orders where catatan = 'full-po'), 'lunas', 'status bayar PO lunas');

-- ============================================================ 3. Terima dan mutu
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c5", "role": "authenticated", "aal": "aal1"}';
select ok(public.terima_po(current_setting('uji.po')::uuid, 200, 'tiba pagi', false) is not null, 'petugas menerima 200 kg menjadi lot');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c4", "role": "authenticated", "aal": "aal1"}';
select lives_ok(
  $$select public.cek_mutu((select id from public.lots where po_id = current_setting('uji.po')::uuid), 'lulus', (select id from public.grades where kode = 'A-SO'), 'segar')$$,
  'QC meluluskan lot');

-- ============================================================ 4. Produksi per loin (Petugas) dan neraca
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c5", "role": "authenticated", "aal": "aal1"}';
select lives_ok(
  $$select public.mulai_produksi(jsonb_build_array(jsonb_build_object('lot_id', (select id from public.lots where po_id = current_setting('uji.po')::uuid), 'kg', 200)), current_date, 'full-prd')$$,
  'produksi dimulai dari lot yang lulus');
select lives_ok(
  $$select public.simpan_loin((select id from public.productions where catatan = 'full-prd'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-0000000000d1', 'no_ekor', 1, 'no_loin', 1, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 60.250),
      jsonb_build_object('id', 'b0000000-0000-0000-0000-0000000000d2', 'no_ekor', 1, 'no_loin', 2, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 55.125),
      jsonb_build_object('id', 'b0000000-0000-0000-0000-0000000000d3', 'no_ekor', 2, 'no_loin', 3, 'grade_id', (select id from public.grades where kode = 'B-SO'), 'kg', 30.500)))$$,
  'tiga loin ditimbang dengan tiga desimal');
select lives_ok(
  $$select public.simpan_komponen((select id from public.productions where catatan = 'full-prd'),
      jsonb_build_array(jsonb_build_object('category_id', (select id from public.component_categories where nama = 'Toro'), 'kg', 20)), 30, null)$$,
  'hasil samping 20 kg dan limbah 30 kg ditimbang, susut belum');
select is(
  (select n.masuk_kg::text || '/' || n.loin_kg::text || '/' || n.samping_kg::text || '/' || n.belum_jelas_kg::text
     from public.v_neraca_produksi n join public.productions p on p.id = n.production_id where p.catatan = 'full-prd'),
  '200.000/145.875/20.000/4.125', 'neraca: 200 = 145,875 loin + 20 samping + 30 limbah + 4,125 belum jelas');
select lives_ok($$select public.selesaikan_produksi((select id from public.productions where catatan = 'full-prd'))$$, 'produksi diselesaikan');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c4", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$select public.periksa_produksi((select id from public.productions where catatan = 'full-prd'), 'Selisih 4,125 kg belum ditimbang')$$, 'QC memeriksa dengan penjelasan selisih');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$select public.setujui_produksi((select id from public.productions where catatan = 'full-prd'))$$, 'Owner menyetujui produksi');

-- ============================================================ 5. Stok
select lives_ok(
  $$select public.masukkan_hasil_produksi((select id from public.productions where catatan = 'full-prd'), (select id from public.products where nama = 'Loin tuna'), (select id from public.grades where kode = 'A-SO'), 'beku', 115.375)$$,
  'loin grade A masuk stok');
select lives_ok(
  $$select public.masukkan_hasil_produksi((select id from public.productions where catatan = 'full-prd'), (select id from public.products where nama = 'Loin tuna'), (select id from public.grades where kode = 'B-SO'), 'beku', 30.5)$$,
  'loin grade B masuk stok');
select is(
  (select sum(u.kg_masuk)::text from public.storage_units u join public.productions p on p.id = u.production_id where p.catatan = 'full-prd'),
  '145.875', 'berat stok = berat loin dari grid, tanpa ketik ulang');
-- Super Admin membuat pesanan dari unit stok; id unit disimpan di sini karena tiap peran punya izin baca yang berbeda.
do $$ begin
  perform set_config('uji.unit_a', (select u.id::text from public.storage_units u join public.productions p on p.id = u.production_id where p.catatan = 'full-prd' and u.grade_kode = 'A-SO'), false);
  perform set_config('uji.unit_b', (select u.id::text from public.storage_units u join public.productions p on p.id = u.production_id where p.catatan = 'full-prd' and u.grade_kode = 'B-SO'), false);
  perform set_config('uji.prd', (select id::text from public.productions where catatan = 'full-prd'), false);
end $$;

-- ============================================================ 6. Penjualan
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated", "aal": "aal1"}';
select lives_ok(
  $$select public.simpan_pesanan(null, 'b1000000-0000-0000-0000-0000000000c1', 'c2000000-0000-0000-0000-0000000000c1', current_date, 'full-psn', jsonb_build_array(
      jsonb_build_object('unit_id', current_setting('uji.unit_a')::uuid, 'kg', 100, 'harga', 130000),
      jsonb_build_object('unit_id', current_setting('uji.unit_b')::uuid, 'kg', 30, 'harga', 100000)))$$,
  'pesanan jual dari dua unit stok');
select is((select total_pesan::text from public.v_sales_orders where catatan = 'full-psn'), '16000000.00', 'total pesanan 100 x 130.000 + 30 x 100.000');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c5", "role": "authenticated", "aal": "aal1"}';
select lives_ok(
  $$select public.kirim_pesanan((select id from public.sales_orders where catatan = 'full-psn'), (
      select jsonb_agg(jsonb_build_object('id', a.id, 'kg_kirim', case when a.grade_kode = 'A-SO' then 99.5 else 30 end))
      from public.sale_allocations a where a.order_id = (select id from public.sales_orders where catatan = 'full-psn') and not a.batal))$$,
  'petugas mengirim dengan berat timbang kirim (grade A 99,5 kg)');
select is(
  (select string_agg(u.sisa_kg::text, '/' order by u.grade_kode) from public.storage_units u where u.production_id = current_setting('uji.prd')::uuid),
  '15.875/0.500', 'sisa stok berkurang sebesar berat kirim: 115,375 - 99,5 dan 30,5 - 30');

-- ============================================================ 7. Tagihan dan uang masuk
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c2", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$select public.terbitkan_invoice((select id from public.sales_orders where catatan = 'full-psn'))$$, 'Finance menerbitkan invoice');
select is((select total::text from public.invoices where order_id = (select id from public.sales_orders where catatan = 'full-psn')), '15935000.00', 'invoice dari berat kirim: 99,5 x 130.000 + 30 x 100.000');
select ok(public.terima_pembayaran((select id from public.invoices where order_id = (select id from public.sales_orders where catatan = 'full-psn')), 10000000, current_date, 'DP') is not null, 'pembeli membayar sebagian');
select is(
  (select status_tagihan || ':' || sisa::text from public.v_invoices where order_id = (select id from public.sales_orders where catatan = 'full-psn')),
  'belum_jatuh_tempo:5935000.00', 'sisa tagihan setelah pembayaran sebagian');
select ok(public.terima_pembayaran((select id from public.invoices where order_id = (select id from public.sales_orders where catatan = 'full-psn')), 5935000, current_date, 'pelunasan') is not null, 'pembeli melunasi');
select is((select status_tagihan from public.v_invoices where order_id = (select id from public.sales_orders where catatan = 'full-psn')), 'lunas', 'invoice lunas');

-- ============================================================ 8. Biaya siklus
select lives_ok(
  $$select public.simpan_biaya(null, (select id from public.expense_categories where nama = 'Pengemasan dan pengiriman'), 'Kemasan siklus penuh', 500000, current_date, 'c2000000-0000-0000-0000-0000000000c1')$$,
  'biaya kemasan dicatat untuk siklus ini');
select lives_ok(
  $$insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe) values ('expenses', (select id from public.expenses where uraian = 'Kemasan siklus penuh'), 'nota', 'biaya/full/nota.jpg', 'nota.jpg', 1000, 'image/jpeg')$$,
  'nota biaya dilampirkan');
select lives_ok($$select public.ajukan_biaya((select id from public.expenses where uraian = 'Kemasan siklus penuh'))$$, 'biaya diajukan');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$select public.putuskan_biaya((select id from public.expenses where uraian = 'Kemasan siklus penuh'), true)$$, 'Owner menyetujui biaya');

-- ============================================================ 9. Laporan: semua angka cocok dan bisa ditelusuri
select is(
  (select jumlah_po::text || ':' || nilai_beli::text || ':' || uang_masuk::text from public.v_rincian_siklus where cycle_id = 'c2000000-0000-0000-0000-0000000000c1'),
  '1:9000000.00:15935000.00', 'rincian siklus: satu PO Rp9.000.000 dan uang masuk Rp15.935.000');
select is(
  (select pendapatan_total::text || '/' || biaya_total::text || '/' || laba_kotor::text from public.v_laba_rugi_siklus where cycle_id = 'c2000000-0000-0000-0000-0000000000c1'),
  '15935000.00/9500000.00/6435000.00', 'laba rugi: pendapatan 15.935.000 - biaya (ikan 9.000.000 + kemasan 500.000) = 6.435.000');
select is(
  (select (piutang = 0 and hutang_pemasok = 0)::text from public.v_dashboard), 'true', 'dashboard: tidak ada piutang dan hutang yang tersisa');
select is(
  (select count(distinct po.kode)::int from public.sale_allocations sa
     join public.lot_allocations la on la.production_id = sa.production_id
     join public.lots l on l.id = la.lot_id
     join public.purchase_orders po on po.id = l.po_id
    where sa.order_id = (select id from public.sales_orders where catatan = 'full-psn') and po.catatan = 'full-po'),
  1, 'penelusuran mundur: pesanan jual sampai ke PO asal lewat produksi dan lot');

-- Selisih saldo kas siklus ini sama dengan laba kotor: uang masuk 15.935.000 - uang keluar 9.500.000.
reset role;
select is(
  (select (sum(case when arah = 'masuk' then jumlah else -jumlah end) - (select s from saldo_awal))::text from public.ledger),
  '6435000.00', 'buku kas: perubahan saldo = laba kotor siklus');

select * from finish();
rollback;
