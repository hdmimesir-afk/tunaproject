-- Fase 5a · Penjualan: pesanan dari stok, kirim, invoice, pembayaran pembeli, invoice jasa. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000051', 'owner6@uji.local'),
  ('00000000-0000-0000-0000-000000000052', 'admin6@uji.local'),
  ('00000000-0000-0000-0000-000000000053', 'petugas6@uji.local'),
  ('00000000-0000-0000-0000-000000000054', 'finance6@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-000000000051';
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin Uji' where user_id = '00000000-0000-0000-0000-000000000052';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas Uji' where user_id = '00000000-0000-0000-0000-000000000053';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance Uji' where user_id = '00000000-0000-0000-0000-000000000054';

insert into public.buyers (id, nama, tempo_hari) values
  ('b1000000-0000-0000-0000-000000000061', 'Pembeli Uji', 14),
  ('b1000000-0000-0000-0000-000000000062', 'Pelanggan Titipan Uji', 14);

insert into public.storage_units (id, kode, product_id, product_nama, grade_kode, kondisi, kg_masuk, sisa_kg, sisa_dasar_masuk, lokasi) values
  ('f0000000-0000-0000-0000-000000000061', 'STK-U61', (select id from public.products where nama = 'Loin tuna'), 'Loin tuna', 'B-SO', 'beku', 100, 100, 100, 'U61'),
  ('f0000000-0000-0000-0000-000000000062', 'STK-U62', (select id from public.products where nama = 'Loin tuna'), 'Loin tuna', 'C-SO', 'beku', 20, 20, 20, 'U62');
insert into public.storage_units (id, kode, buyer_id, pemilik_nama, product_id, product_nama, kondisi, kg_masuk, sisa_kg, sisa_dasar_masuk) values
  ('f0000000-0000-0000-0000-000000000063', 'STK-U63', 'b1000000-0000-0000-0000-000000000062', 'Pelanggan Titipan Uji', (select id from public.products where nama = 'Loin tuna'), 'Loin tuna', 'beku', 50, 50, 50);
-- Dua tagihan jasa gudang yang belum ditagihkan.
insert into public.service_charges (id, unit_id, buyer_id, pemilik_nama, jenis, kg_dasar, tarif_per_kg, hari_ditagih, jumlah, masuk_pada) values
  ('c1000000-0000-0000-0000-000000000061', 'f0000000-0000-0000-0000-000000000063', 'b1000000-0000-0000-0000-000000000062', 'Pelanggan Titipan Uji', 'simpan', 50, 76, 10, 38000, now()),
  ('c1000000-0000-0000-0000-000000000062', 'f0000000-0000-0000-0000-000000000063', 'b1000000-0000-0000-0000-000000000062', 'Pelanggan Titipan Uji', 'abf', 50, 3500, 0, 175000, now());

select is((select kelompok from public.storage_units where kode = 'STK-U61'), 'loin', 'unit stok membawa kelompok produknya');

-- ============================================================ Super Admin
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000052", "role": "authenticated", "aal": "aal1"}';

select lives_ok(
  $$select public.simpan_pesanan(null, 'b1000000-0000-0000-0000-000000000061', null, current_date, 'psn-1', jsonb_build_array(
      jsonb_build_object('unit_id', 'f0000000-0000-0000-0000-000000000061', 'kg', 50, 'harga', 100000),
      jsonb_build_object('unit_id', 'f0000000-0000-0000-0000-000000000062', 'kg', 14, 'harga', 30000)))$$,
  'admin membuat pesanan dari dua unit stok');
select is((select status || ':' || total_pesan::text from public.v_sales_orders where catatan = 'psn-1'), 'draf:5420000.00', 'total pesanan dihitung otomatis');
select throws_ok(
  $$select public.simpan_pesanan(null, 'b1000000-0000-0000-0000-000000000061', null, current_date, 'psn-lebih', jsonb_build_array(
      jsonb_build_object('unit_id', 'f0000000-0000-0000-0000-000000000061', 'kg', 60, 'harga', 100000)))$$,
  'KT001', null, 'pesanan melebihi stok tersedia dikurangi pesanan draf lain ditolak');
select lives_ok(
  $$select public.simpan_pesanan(null, 'b1000000-0000-0000-0000-000000000061', null, current_date, 'psn-2', jsonb_build_array(
      jsonb_build_object('unit_id', 'f0000000-0000-0000-0000-000000000061', 'kg', 50, 'harga', 100000)))$$,
  'pesanan kedua pas dengan sisa yang tersedia');
select throws_ok(
  $$select public.simpan_pesanan(null, 'b1000000-0000-0000-0000-000000000061', null, current_date, 'psn-titipan', jsonb_build_array(
      jsonb_build_object('unit_id', 'f0000000-0000-0000-0000-000000000063', 'kg', 5, 'harga', 100000)))$$,
  'KT001', null, 'titipan pelanggan tidak bisa dijual');
select lives_ok(
  $$select public.batalkan_pesanan((select id from public.sales_orders where catatan = 'psn-2'), 'salah pembeli')$$,
  'pesanan draf bisa dibatalkan dengan alasan');
select throws_ok($$select public.batalkan_pesanan((select id from public.sales_orders where catatan = 'psn-1'), '')$$, 'KT001', null, 'batal pesanan tanpa alasan ditolak');
select throws_ok($$insert into public.sale_allocations (order_id, unit_id, unit_kode, product_nama, kg_pesan, harga_per_kg) values (gen_random_uuid(), gen_random_uuid(), 'x', 'x', 1, 1)$$, '42501', null, 'alokasi tidak bisa ditulis langsung');
select throws_ok($$delete from public.invoices$$, '42501', null, 'invoice tidak bisa dihapus');
select throws_ok($$select public.kirim_pesanan((select id from public.sales_orders where catatan = 'psn-1'), '[]'::jsonb)$$, 'KT001', null, 'kirim tanpa berat ditolak');

-- Pesanan ketiga untuk uji berat diterima pembeli.
select lives_ok(
  $$select public.simpan_pesanan(null, 'b1000000-0000-0000-0000-000000000061', null, current_date, 'psn-3', jsonb_build_array(
      jsonb_build_object('unit_id', 'f0000000-0000-0000-0000-000000000061', 'kg', 10, 'harga', 50000)))$$,
  'pesanan ketiga dibuat');

-- ============================================================ Petugas lapangan
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000053", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.simpan_pesanan(null, 'b1000000-0000-0000-0000-000000000061', null, current_date, 'x', '[{}]'::jsonb)$$, '42501', null, 'petugas tidak boleh membuat pesanan');
select lives_ok(
  $$select public.kirim_pesanan((select id from public.sales_orders where catatan = 'psn-1'), (
      select jsonb_agg(jsonb_build_object('id', a.id, 'kg_kirim', case when a.unit_kode = 'STK-U61' then 49.5 else 14 end))
      from public.sale_allocations a where a.order_id = (select id from public.sales_orders where catatan = 'psn-1') and not a.batal))$$,
  'petugas mengirim pesanan dengan berat timbang kirim');
select is((select sisa_kg::text from public.storage_units where kode = 'STK-U61'), '50.500', 'stok berkurang sebesar berat kirim');
select is((select status from public.sales_orders where catatan = 'psn-1'), 'terkirim', 'pesanan berstatus terkirim');
select throws_ok(
  $$select public.kirim_pesanan((select id from public.sales_orders where catatan = 'psn-1'), '[]'::jsonb)$$,
  'KT001', null, 'pesanan yang sudah terkirim tidak bisa dikirim lagi');
select lives_ok(
  $$select public.kirim_pesanan((select id from public.sales_orders where catatan = 'psn-3'), (
      select jsonb_agg(jsonb_build_object('id', a.id, 'kg_kirim', 10, 'kg_diterima', 9.8))
      from public.sale_allocations a where a.order_id = (select id from public.sales_orders where catatan = 'psn-3') and not a.batal))$$,
  'pesanan ketiga dikirim 10 kg, diterima pembeli 9,8 kg');
select throws_ok($$select public.terbitkan_invoice((select id from public.sales_orders where catatan = 'psn-1'))$$, '42501', null, 'petugas tidak boleh menerbitkan invoice');

-- ============================================================ Finance
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000054", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$select public.terbitkan_invoice((select id from public.sales_orders where catatan = 'psn-1'))$$, 'finance menerbitkan invoice');
select is((select total::text from public.invoices where order_id = (select id from public.sales_orders where catatan = 'psn-1')), '5370000.00', 'invoice dari berat kirim: 49,5 x 100.000 + 14 x 30.000');
select is((select (jatuh_tempo - tanggal)::text from public.invoices where order_id = (select id from public.sales_orders where catatan = 'psn-1')), '14', 'jatuh tempo bawaan 14 hari');
select throws_ok($$select public.terbitkan_invoice((select id from public.sales_orders where catatan = 'psn-1'))$$, 'KT001', null, 'satu pesanan hanya punya satu invoice aktif');
select lives_ok($$select public.terbitkan_invoice((select id from public.sales_orders where catatan = 'psn-3'))$$, 'invoice pesanan ketiga terbit');
select is((select total::text from public.invoices where order_id = (select id from public.sales_orders where catatan = 'psn-3')), '490000.00', 'invoice memakai berat diterima pembeli: 9,8 x 50.000');
select throws_ok(
  $$select public.catat_berat_diterima((select id from public.sales_orders where catatan = 'psn-3'), jsonb_build_array(jsonb_build_object('id', (select id from public.sale_allocations where order_id = (select id from public.sales_orders where catatan = 'psn-3') limit 1), 'kg_diterima', 9)))$$,
  'KT001', null, 'berat diterima tidak bisa diubah setelah invoice terbit');

-- Pembayaran pembeli.
select lives_ok($$select public.terima_pembayaran((select id from public.invoices where order_id = (select id from public.sales_orders where catatan = 'psn-1')), 1000000, current_date, 'DP')$$, 'pembayaran sebagian dicatat');
select is((select status_tagihan || ':' || sisa::text from public.v_invoices where order_id = (select id from public.sales_orders where catatan = 'psn-1')), 'belum_jatuh_tempo:4370000.00', 'status belum jatuh tempo dan sisa tagihan');
select throws_ok($$select public.terima_pembayaran((select id from public.invoices where order_id = (select id from public.sales_orders where catatan = 'psn-1')), 5000000)$$, 'KT001', null, 'pembayaran melebihi tagihan ditolak');
select lives_ok($$select public.terima_pembayaran((select id from public.invoices where order_id = (select id from public.sales_orders where catatan = 'psn-1')), 4370000)$$, 'pelunasan dicatat');
select is((select status_tagihan from public.v_invoices where order_id = (select id from public.sales_orders where catatan = 'psn-1')), 'lunas', 'status lunas');
select throws_ok($$select public.batalkan_invoice((select id from public.invoices where order_id = (select id from public.sales_orders where catatan = 'psn-1')), 'salah')$$, 'KT001', null, 'invoice yang sudah ada pembayaran tidak bisa dibatalkan');

-- Status terlambat dan jatuh tempo (jatuh tempo digeser langsung oleh sistem untuk uji).
reset role;
update public.invoices set jatuh_tempo = (now() at time zone 'Asia/Jakarta')::date - 3 where order_id = (select id from public.sales_orders where catatan = 'psn-3');
set local role authenticated;
select is((select status_tagihan || ':' || hari_telat::text from public.v_invoices where order_id = (select id from public.sales_orders where catatan = 'psn-3')), 'terlambat:3', 'lewat jatuh tempo: terlambat dan jumlah hari');
reset role;
update public.invoices set jatuh_tempo = (now() at time zone 'Asia/Jakarta')::date where order_id = (select id from public.sales_orders where catatan = 'psn-3');
set local role authenticated;
select is((select status_tagihan from public.v_invoices where order_id = (select id from public.sales_orders where catatan = 'psn-3')), 'jatuh_tempo', 'tepat hari jatuh tempo');
select lives_ok($$select public.batalkan_invoice((select id from public.invoices where order_id = (select id from public.sales_orders where catatan = 'psn-3')), 'berat salah')$$, 'invoice tanpa pembayaran bisa dibatalkan');
select lives_ok($$select public.terbitkan_invoice((select id from public.sales_orders where catatan = 'psn-3'))$$, 'invoice bisa diterbitkan ulang setelah dibatalkan');

-- Invoice jasa gudang dingin.
select lives_ok(
  $$select public.terbitkan_invoice_jasa('b1000000-0000-0000-0000-000000000062', array['c1000000-0000-0000-0000-000000000061', 'c1000000-0000-0000-0000-000000000062']::uuid[])$$,
  'invoice jasa gudang dingin terbit');
select is((select total::text from public.invoices where jenis = 'gudang_dingin'), '213000.00', 'total invoice jasa = jumlah tagihan jasa');
select is((select count(*)::int from public.service_charges where invoice_id is not null), 2, 'tagihan jasa ditandai sudah ditagihkan');
select throws_ok(
  $$select public.terbitkan_invoice_jasa('b1000000-0000-0000-0000-000000000062', array['c1000000-0000-0000-0000-000000000061']::uuid[])$$,
  'KT001', null, 'tagihan jasa yang sudah ditagihkan tidak bisa ditagih dua kali');
select ok((select count(*) from public.v_invoices) >= 3, 'finance melihat invoice');

select * from finish();
rollback;
