-- 25 Nov 2026: penjualan jasa, pajak dan diskon, biaya per lini bisnis. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000381', 'admin38@uji.local'),
  ('00000000-0000-0000-0000-000000000382', 'petugas38@uji.local');
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 38' where user_id = '00000000-0000-0000-0000-000000000381';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 38' where user_id = '00000000-0000-0000-0000-000000000382';
insert into public.buyers (id, nama, tempo_hari) values ('b3800000-0000-0000-0000-000000000001', 'PT Jasa 38', 7);
insert into public.cycles (id, ref_po_pembeli, lini_bisnis, pt_id) values
  ('c3800000-0000-0000-0000-000000000001', 'PO-UJI-38', 'jasa', 'b3800000-0000-0000-0000-000000000001'),
  ('c3800000-0000-0000-0000-000000000002', 'PO-UJI-38B', 'titip', 'b3800000-0000-0000-0000-000000000001');
insert into public.storage_units (id, kode, product_id, product_nama, grade_kode, kondisi, kg_masuk, sisa_kg, sisa_dasar_masuk) values
  ('f3800000-0000-0000-0000-000000000001', 'STK-381', (select id from public.products where nama = 'Loin tuna'), 'Loin tuna', 'A-SO', 'beku', 100, 100, 100);

insert into public.expense_categories (id, nama, nota_wajib) values ('e3800000-0000-0000-0000-000000000001', 'Listrik 38', false);

set local role authenticated;
-- Petugas nggak boleh ngatur jasa.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000382", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.simpan_jasa(null, 'Fillet', 1000)$$, '42501', null, 'petugas nggak bisa nambah jasa');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000381", "role": "authenticated", "aal": "aal1"}';
-- ============================================================ daftar jasa
select lives_ok($$select public.simpan_jasa(null, 'Fillet loin', 2500)$$, 'jasa 1');
select lives_ok($$select public.simpan_jasa(null, 'Retouching', 1500)$$, 'jasa 2');
select lives_ok($$select public.simpan_jasa(null, 'Suntik CO', 1000)$$, 'jasa 3');
select lives_ok($$select public.simpan_jasa(null, 'Vakum', 500)$$, 'jasa 4');
select lives_ok($$select public.simpan_jasa(null, 'ABF', 800)$$, 'jasa 5');
select throws_ok($$select public.simpan_jasa(null, 'Jasa keenam', 100)$$, 'KT001', null, 'jasa aktif paling banyak 5');
select throws_ok($$select public.simpan_jasa((select id from public.service_items where nama = 'Fillet loin'), 'Fillet loin', 3000)$$, 'KT001', null, 'ganti harga wajib alasan');
select lives_ok($$select public.simpan_jasa((select id from public.service_items where nama = 'Fillet loin'), 'Fillet loin', 3000, true, 'harga naik')$$, 'harga jasa dikoreksi');
select results_eq($$select (sebelum ->> 'harga')::numeric, (sesudah ->> 'harga')::numeric from public.koreksi_data where tabel = 'service_items'$$,
  $$values (2500::numeric, 3000::numeric)$$, 'koreksi harga jasa kecatat');

-- ============================================================ pesanan jasa + pajak 11% + diskon 10%
select throws_ok($$select public.simpan_pesanan_jasa(null, 'b3800000-0000-0000-0000-000000000001', null, current_date, '', '[]'::jsonb)$$, 'KT001', null, 'minimal satu jasa');
select throws_ok($$select public.simpan_pesanan_jasa(null, 'b3800000-0000-0000-0000-000000000001', null, current_date, '', jsonb_build_array(
    jsonb_build_object('keterangan', 'a', 'harga', 1), jsonb_build_object('keterangan', 'b', 'harga', 1), jsonb_build_object('keterangan', 'c', 'harga', 1),
    jsonb_build_object('keterangan', 'd', 'harga', 1), jsonb_build_object('keterangan', 'e', 'harga', 1), jsonb_build_object('keterangan', 'f', 'harga', 1)))$$,
  'KT001', null, 'baris manual paling banyak 5');
select throws_ok($$select public.simpan_pesanan_jasa(null, 'b3800000-0000-0000-0000-000000000001', null, current_date, '', jsonb_build_array(jsonb_build_object('keterangan', 'x', 'harga', 1)), true, 120)$$,
  'KT001', null, 'pajak di atas 100 persen ditolak');
select lives_ok($$select public.simpan_pesanan_jasa(null, 'b3800000-0000-0000-0000-000000000001', 'c3800000-0000-0000-0000-000000000001', current_date, 'jasa-38', jsonb_build_array(
    jsonb_build_object('service_item_id', (select id from public.service_items where nama = 'Fillet loin'), 'keterangan', 'Fillet loin 400 kg', 'harga', 1200000),
    jsonb_build_object('keterangan', 'Bongkar muat', 'harga', 800000)), true, 11, 'persen', 10)$$, 'pesanan jasa dibikin');
select is((select total_pesan::numeric from public.v_sales_orders where catatan = 'jasa-38'), 1998000::numeric, 'total pesan: (2jt - 10%) + 11% = 1.998.000');
select throws_ok($$select public.kirim_pesanan((select id from public.sales_orders where catatan = 'jasa-38'), '[]'::jsonb)$$, 'KT001', null, 'pesanan jasa nggak dikirim');
select lives_ok($$select public.terbitkan_invoice((select id from public.sales_orders where catatan = 'jasa-38'))$$, 'invoice jasa langsung terbit');
select results_eq($$select jenis, subtotal::numeric, diskon::numeric, pajak::numeric, total::numeric from public.invoices where order_id = (select id from public.sales_orders where catatan = 'jasa-38')$$,
  $$values ('jasa_produksi'::text, 2000000::numeric, 200000::numeric, 198000::numeric, 1998000::numeric)$$, 'invoice: subtotal, diskon, pajak, total');
select is((select status from public.sales_orders where catatan = 'jasa-38'), 'terkirim', 'pesanan jasa jadi udah ditagih');
select is((select pendapatan_total::numeric from public.v_laba_rugi_siklus where cycle_id = 'c3800000-0000-0000-0000-000000000001'), 1800000::numeric, 'laba rugi: pendapatan jasa dikurangi diskon, tanpa pajak');

-- Koreksi jasa abis ditagih: wajib alasan, invoice dihitung ulang.
select throws_ok($$select public.koreksi_pesanan_jasa((select id from public.sales_orders where catatan = 'jasa-38'), null, null,
    jsonb_build_array(jsonb_build_object('keterangan', 'Fillet loin 400 kg', 'harga', 1000000)), '')$$, 'KT001', null, 'koreksi jasa wajib alasan');
select lives_ok($$select public.koreksi_pesanan_jasa((select id from public.sales_orders where catatan = 'jasa-38'), null, null,
    jsonb_build_array(jsonb_build_object('keterangan', 'Fillet loin 400 kg', 'harga', 1000000)), 'bongkar muat nggak jadi')$$, 'koreksi jasa');
select is((select total::numeric from public.invoices where order_id = (select id from public.sales_orders where catatan = 'jasa-38')), 999000::numeric, 'invoice jasa dihitung ulang');

-- Atur pajak/diskon abis invoice: wajib alasan; pajak dimatiin.
select throws_ok($$select public.atur_pajak_diskon((select id from public.sales_orders where catatan = 'jasa-38'), false, 0, 'nominal', 0)$$, 'KT001', null, 'ubah pajak abis invoice wajib alasan');
select lives_ok($$select public.atur_pajak_diskon((select id from public.sales_orders where catatan = 'jasa-38'), false, 0, 'nominal', 100000, 'pelanggan bebas pajak')$$, 'pajak dimatiin, diskon nominal');
select is((select total::numeric from public.invoices where order_id = (select id from public.sales_orders where catatan = 'jasa-38')), 900000::numeric, 'invoice: 1jt - 100rb, tanpa pajak');

-- ============================================================ pesanan barang + pajak
select lives_ok($$select public.simpan_pesanan(null, 'b3800000-0000-0000-0000-000000000001', null, current_date, 'brg-38', jsonb_build_array(
    jsonb_build_object('unit_id', 'f3800000-0000-0000-0000-000000000001', 'kg', 10, 'harga', 100000)))$$, 'pesanan barang');
select lives_ok($$select public.atur_pajak_diskon((select id from public.sales_orders where catatan = 'brg-38'), true, 11, 'nominal', 0)$$, 'pajak 11% sebelum invoice tanpa alasan');
select lives_ok($$select public.kirim_pesanan((select id from public.sales_orders where catatan = 'brg-38'),
    (select jsonb_agg(jsonb_build_object('id', a.id, 'kg_kirim', 10)) from public.sale_allocations a join public.sales_orders s on s.id = a.order_id where s.catatan = 'brg-38'))$$, 'dikirim');
select lives_ok($$select public.terbitkan_invoice((select id from public.sales_orders where catatan = 'brg-38'))$$, 'invoice barang');
select is((select total::numeric from public.invoices where order_id = (select id from public.sales_orders where catatan = 'brg-38')), 1110000::numeric, 'invoice barang 1jt + pajak 11%');

-- ============================================================ biaya per lini
select lives_ok($$select public.simpan_biaya(null, 'e3800000-0000-0000-0000-000000000001', 'listrik titip', 50000, current_date, 'c3800000-0000-0000-0000-000000000002')$$, 'biaya proyek titip');
reset role;
select is((select lini_bisnis from public.expenses where uraian = 'listrik titip'), 'titip', 'biaya ikut lini proyeknya');

select * from finish();
rollback;
