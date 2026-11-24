-- 26 Nov 2026: kode XXX/YY/MM/DD/NNN (NNN mulai lagi tiap bulan) dan hapus record produksi. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000391', 'kepala39@uji.local'),
  ('00000000-0000-0000-0000-000000000392', 'finance39@uji.local');
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'Kepala 39' where user_id = '00000000-0000-0000-0000-000000000391';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance 39' where user_id = '00000000-0000-0000-0000-000000000392';
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000391', 'Pemasok 39');
insert into public.buyers (id, nama) values ('b3900000-0000-0000-0000-000000000001', 'Pembeli 39');

-- ============================================================ kode
insert into public.productions (id, tanggal) values
  ('d3900000-0000-0000-0000-000000000001', '2031-03-05'),
  ('d3900000-0000-0000-0000-000000000002', '2031-03-20'),
  ('d3900000-0000-0000-0000-000000000003', '2031-04-01');
select is((select kode from public.productions where id = 'd3900000-0000-0000-0000-000000000001'), 'PRD/31/03/05/001', 'kode produksi ikut tanggalnya');
select is((select kode from public.productions where id = 'd3900000-0000-0000-0000-000000000002'), 'PRD/31/03/20/002', 'nomor urut lanjut di bulan yang sama');
select is((select kode from public.productions where id = 'd3900000-0000-0000-0000-000000000003'), 'PRD/31/04/01/001', 'bulan baru mulai lagi dari 001');

insert into public.lots (id, supplier_id, tanggal_terima, kg, sisa_kg, qc) values
  ('c3900000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000391', '2031-03-05', 100, 60, 'menunggu'),
  ('c3900000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000391', '2031-03-05', 50, 30, 'menunggu');
select is((select kode from public.lots where id = 'c3900000-0000-0000-0000-000000000001'), 'LOT/31/03/05/001', 'kode lot ikut tanggal terima');
insert into public.cycles (id, ref_po_pembeli) values ('e3900000-0000-0000-0000-000000000001', 'PO-UJI-39');
select ok((select kode ~ '^SIK/\d{2}/\d{2}/\d{2}/\d{3}$' from public.cycles where id = 'e3900000-0000-0000-0000-000000000001'), 'kode proyek format baru');
insert into public.productions (id, kode, tanggal) values ('d3900000-0000-0000-0000-000000000009', 'PRD-MANUAL', '2031-03-06');
select is((select kode from public.productions where id = 'd3900000-0000-0000-0000-000000000009'), 'PRD-MANUAL', 'kode yang diisi manual nggak diganti');

-- ============================================================ hapus baris produksi
-- Produksi 1 berjalan pakai 2 lot (40 + 20 kg).
insert into public.lot_allocations (id, production_id, lot_id, lot_kode, kg) values
  ('a3900000-0000-0000-0000-000000000001', 'd3900000-0000-0000-0000-000000000001', 'c3900000-0000-0000-0000-000000000001', 'LOT/31/03/05/001', 40),
  ('a3900000-0000-0000-0000-000000000002', 'd3900000-0000-0000-0000-000000000001', 'c3900000-0000-0000-0000-000000000002', 'LOT/31/03/05/002', 20);
insert into public.production_loin_totals (production_id, grade_id, kg) values
  ('d3900000-0000-0000-0000-000000000001', (select id from public.grades where kode = 'A-SO'), 25);

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000392", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.hapus_baris_produksi('lot_allocations', 'a3900000-0000-0000-0000-000000000002', 'dobel')$$, '42501', null, 'finance nggak bisa hapus baris produksi');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000391", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.hapus_baris_produksi('lot_allocations', 'a3900000-0000-0000-0000-000000000002', ' ')$$, 'KT001', null, 'wajib alasan');
select throws_ok($$select public.hapus_baris_produksi('lots', 'a3900000-0000-0000-0000-000000000002', 'dobel')$$, 'KT001', null, 'tabel lain ditolak');
select lives_ok($$select public.hapus_baris_produksi('lot_allocations', 'a3900000-0000-0000-0000-000000000002', 'lot salah pilih')$$, 'pemakaian lot dihapus');
select throws_ok($$select public.hapus_baris_produksi('lot_allocations', 'a3900000-0000-0000-0000-000000000001', 'dobel')$$, 'KT001', null, 'lot terakhir nggak bisa dihapus sendirian');
select lives_ok($$select public.hapus_baris_produksi('production_loin_totals', (select id from public.production_loin_totals where production_id = 'd3900000-0000-0000-0000-000000000001'), 'dobel')$$, 'loin total dihapus');
reset role;
select is((select sisa_kg::numeric from public.lots where id = 'c3900000-0000-0000-0000-000000000002'), 50::numeric, 'berat lot balik ke sisa');
select is((select bagian from public.hapus_data_log order by id desc limit 1), array['produksi'], 'kecatat di log hapus');

-- Produksi yang udah selesai: hapus barisnya ditolak.
update public.productions set status = 'selesai' where id = 'd3900000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok($$select public.hapus_baris_produksi('lot_allocations', 'a3900000-0000-0000-0000-000000000001', 'dobel')$$, 'KT001', null, 'produksi selesai harus dibuka lagi dulu');

-- ============================================================ hapus produksi utuh
select lives_ok($$select public.hapus_produksi('d3900000-0000-0000-0000-000000000001', 'produksi dobel')$$, 'produksi utuh dihapus');
reset role;
select is((select count(*)::int from public.productions where id = 'd3900000-0000-0000-0000-000000000001'), 0, 'produksinya ilang');
select is((select sisa_kg::numeric from public.lots where id = 'c3900000-0000-0000-0000-000000000001'), 100::numeric, 'berat lot balik penuh');

-- Hasilnya udah dipesan: ditolak.
insert into public.storage_units (id, kode, product_id, product_nama, kondisi, kg_masuk, sisa_kg, sisa_dasar_masuk, production_id) values
  ('f3900000-0000-0000-0000-000000000001', 'STK-391', (select id from public.products where nama = 'Loin tuna'), 'Loin tuna', 'beku', 10, 10, 10, 'd3900000-0000-0000-0000-000000000002');
insert into public.sales_orders (id, buyer_id, buyer_nama) values ('a3900000-0000-0000-0000-000000000009', 'b3900000-0000-0000-0000-000000000001', 'Pembeli 39');
insert into public.sale_allocations (order_id, unit_id, unit_kode, product_nama, kg_pesan, harga_per_kg) values
  ('a3900000-0000-0000-0000-000000000009', 'f3900000-0000-0000-0000-000000000001', 'STK-391', 'Loin tuna', 5, 1000);
set local role authenticated;
select throws_ok($$select public.hapus_produksi('d3900000-0000-0000-0000-000000000002', 'dobel')$$, 'KT001', null, 'hasil yang udah dipesan nggak bisa dihapus');
reset role;

select * from finish();
rollback;
