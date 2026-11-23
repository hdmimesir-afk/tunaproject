-- 23 Nov 2026: koreksi + hapus di penjualan, titipan, dan lot. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000341', 'admin34@uji.local'),
  ('00000000-0000-0000-0000-000000000342', 'petugas34@uji.local');
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 34' where user_id = '00000000-0000-0000-0000-000000000341';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 34' where user_id = '00000000-0000-0000-0000-000000000342';

insert into public.buyers (id, nama, tempo_hari) values
  ('b3400000-0000-0000-0000-000000000001', 'Pembeli 34', 14),
  ('b3400000-0000-0000-0000-000000000002', 'Pemilik titipan 34', 14),
  ('b3400000-0000-0000-0000-000000000003', 'Pemilik lain 34', 14);
insert into public.storage_units (id, kode, product_id, product_nama, grade_kode, kondisi, kg_masuk, sisa_kg, sisa_dasar_masuk) values
  ('f3400000-0000-0000-0000-000000000001', 'STK-341', (select id from public.products where nama = 'Loin tuna'), 'Loin tuna', 'B-SO', 'beku', 100, 100, 100);
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000341', 'Pemasok 34');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000341", "role": "authenticated", "aal": "aal1"}';

-- ============================================================ pesanan terkirim + invoice + uang masuk
select lives_ok($$select public.simpan_pesanan(null, 'b3400000-0000-0000-0000-000000000001', null, current_date, 'psn-34', jsonb_build_array(
    jsonb_build_object('unit_id', 'f3400000-0000-0000-0000-000000000001', 'kg', 50, 'harga', 100000)))$$, 'pesanan dibikin');
select lives_ok($$select public.kirim_pesanan((select id from public.sales_orders where catatan = 'psn-34'),
    (select jsonb_agg(jsonb_build_object('id', a.id, 'kg_kirim', 50)) from public.sale_allocations a join public.sales_orders s on s.id = a.order_id where s.catatan = 'psn-34'))$$, 'pesanan dikirim 50 kg');
select lives_ok($$select public.terbitkan_invoice((select id from public.sales_orders where catatan = 'psn-34'))$$, 'invoice terbit');
select lives_ok($$select public.terima_pembayaran((select id from public.invoices where order_id = (select id from public.sales_orders where catatan = 'psn-34')), 1000000)$$, 'uang masuk 1 juta');
select is((select sisa_kg::numeric from public.storage_units where kode = 'STK-341'), 50::numeric, 'stok tinggal 50');

-- Koreksi pesanan terkirim: kirim jadi 40 kg, harga 90rb. Stok balik 10 kg, invoice dihitung ulang.
select throws_ok($$select public.koreksi_pesanan_terkirim((select id from public.sales_orders where catatan = 'psn-34'), null, null,
    (select jsonb_agg(jsonb_build_object('id', a.id, 'kg_kirim', 40, 'harga_per_kg', 90000)) from public.sale_allocations a join public.sales_orders s on s.id = a.order_id where s.catatan = 'psn-34'), ' ')$$,
  'KT001', 'Tulis alasan koreksinya.', 'koreksi pesanan wajib alasan');
select lives_ok($$select public.koreksi_pesanan_terkirim((select id from public.sales_orders where catatan = 'psn-34'), null, null,
    (select jsonb_agg(jsonb_build_object('id', a.id, 'kg_kirim', 40, 'harga_per_kg', 90000)) from public.sale_allocations a join public.sales_orders s on s.id = a.order_id where s.catatan = 'psn-34'), 'salah timbang')$$,
  'pesanan terkirim dikoreksi');
select is((select sisa_kg::numeric from public.storage_units where kode = 'STK-341'), 60::numeric, 'stok balik 10 kg');
select is((select total::numeric from public.invoices where order_id = (select id from public.sales_orders where catatan = 'psn-34')), 3600000::numeric, 'invoice dihitung ulang (40 x 90rb)');
select is((select count(*)::int from public.koreksi_data where tabel = 'sales_orders'), 1, 'koreksi pesanan kecatat');
select throws_ok($$select public.koreksi_pesanan_terkirim((select id from public.sales_orders where catatan = 'psn-34'), null, null,
    (select jsonb_agg(jsonb_build_object('id', a.id, 'kg_kirim', 1, 'harga_per_kg', 1000)) from public.sale_allocations a join public.sales_orders s on s.id = a.order_id where s.catatan = 'psn-34'), 'uji')$$,
  'KT001', null, 'total baru di bawah yg udah dibayar ditolak');
select throws_ok($$select public.koreksi_pesanan_terkirim((select id from public.sales_orders where catatan = 'psn-34'), null, null,
    (select jsonb_agg(jsonb_build_object('id', a.id, 'kg_kirim', 200, 'harga_per_kg', 90000)) from public.sale_allocations a join public.sales_orders s on s.id = a.order_id where s.catatan = 'psn-34'), 'uji')$$,
  'KT001', null, 'nambah berat kirim melebihi stok ditolak');
select throws_ok($$select public.hapus_pesanan((select id from public.sales_orders where catatan = 'psn-34'), 'dobel')$$, 'KT001', null, 'pesanan terkirim nggak bisa dihapus');

-- Koreksi uang masuk: 1 juta jadi 1,5 juta, buku kas ikut.
select lives_ok($$select public.koreksi_uang_masuk((select id from public.customer_payments where jumlah = 1000000), 1500000, current_date, 'transfer', 'salah ketik')$$, 'uang masuk dikoreksi');
select is((select jumlah::numeric from public.ledger where ref_tabel = 'customer_payments' and ref_id = (select id from public.customer_payments where jumlah = 1500000)), 1500000::numeric, 'buku kas ikut berubah');
select throws_ok($$select public.koreksi_uang_masuk((select id from public.customer_payments where jumlah = 1500000), 9000000, current_date, '', 'uji')$$, 'KT001', null, 'nggak boleh melebihi tagihan');
-- Hapus uang masuk: buku kas ikut ilang, kecatat di log.
select lives_ok($$select public.hapus_uang_masuk((select id from public.customer_payments where jumlah = 1500000), 'dobel')$$, 'uang masuk dihapus');
reset role;
select is((select count(*)::int from public.customer_payments where invoice_id = (select id from public.invoices where order_id = (select id from public.sales_orders where catatan = 'psn-34'))), 0, 'uang masuknya ilang');
select is((select count(*)::int from public.ledger where ref_tabel = 'customer_payments'), 0, 'baris buku kasnya ilang');
select is((select bagian from public.hapus_data_log order by id desc limit 1), array['uang_masuk'], 'kecatat di log hapus');
set local role authenticated;

-- Pesanan draf dobel bisa dihapus.
select lives_ok($$select public.simpan_pesanan(null, 'b3400000-0000-0000-0000-000000000001', null, current_date, 'psn-dobel', jsonb_build_array(
    jsonb_build_object('unit_id', 'f3400000-0000-0000-0000-000000000001', 'kg', 5, 'harga', 100000)))$$, 'pesanan dobel dibikin');
select lives_ok($$select public.hapus_pesanan((select id from public.sales_orders where catatan = 'psn-dobel'), 'dobel')$$, 'pesanan draf dobel dihapus');
select is((select count(*)::int from public.sales_orders where catatan = 'psn-dobel'), 0, 'pesanannya ilang');

-- ============================================================ titipan
select lives_ok($$select public.terima_titipan('b3400000-0000-0000-0000-000000000002', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 80)$$, 'titipan diterima');
select lives_ok($$select public.koreksi_titipan((select id from public.storage_units where pemilik_nama = 'Pemilik titipan 34'),
    'b3400000-0000-0000-0000-000000000003', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 75, null, 'dikoreksi', 'salah pemilik sama berat')$$, 'titipan dikoreksi');
select results_eq($$select pemilik_nama, kg_masuk::numeric, sisa_kg::numeric from public.storage_units where catatan = 'dikoreksi'$$,
  $$values ('Pemilik lain 34'::text, 75::numeric, 75::numeric)$$, 'pemilik dan berat berubah');
select is((select count(*)::int from public.koreksi_data where tabel = 'storage_units'), 1, 'koreksi titipan kecatat');
select lives_ok($$select public.ambil_stok((select id from public.storage_units where catatan = 'dikoreksi'), 30)$$, 'titipan keluar 30 kg');
select throws_ok($$select public.koreksi_titipan((select id from public.storage_units where catatan = 'dikoreksi'),
    'b3400000-0000-0000-0000-000000000003', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 20, null, 'dikoreksi', 'uji')$$,
  'KT001', null, 'berat masuk nggak boleh di bawah yg udah keluar');
select throws_ok($$select public.koreksi_titipan((select id from public.storage_units where catatan = 'dikoreksi'),
    'b3400000-0000-0000-0000-000000000002', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 75, null, 'dikoreksi', 'uji')$$,
  'KT001', null, 'pemilik nggak bisa diganti kalau udah ada tagihan simpan');
select throws_ok($$select public.hapus_titipan((select id from public.storage_units where catatan = 'dikoreksi'), 'dobel')$$, 'KT001', null, 'titipan yg udah keluar nggak bisa dihapus');
select lives_ok($$select public.terima_titipan('b3400000-0000-0000-0000-000000000002', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 10, '', false, 'titip-dobel')$$, 'titipan dobel diterima');
select lives_ok($$select public.hapus_titipan((select id from public.storage_units where catatan = 'titip-dobel'), 'dobel')$$, 'titipan dobel yg masih utuh dihapus');

-- ============================================================ lot
select lives_ok($$select public.terima_ikan('10000000-0000-0000-0000-000000000341', 77)$$, 'lot dobel diterima');
select lives_ok($$select public.hapus_lot((select id from public.lots where supplier_id = '10000000-0000-0000-0000-000000000341'), 'dobel')$$, 'lot yg belum diajukan dan belum diproduksi dihapus');
reset role;
select is((select count(*)::int from public.lots where supplier_id = '10000000-0000-0000-0000-000000000341'), 0, 'lotnya ilang');

-- Petugas nggak bisa hapus pesanan.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000342", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.hapus_pesanan((select id from public.sales_orders where catatan = 'psn-34'), 'uji')$$, '42501', null, 'petugas nggak bisa hapus pesanan');
reset role;

select * from finish();
rollback;
