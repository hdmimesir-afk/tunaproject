-- Penelusuran banyak-ke-banyak (PRD, Pengujian): satu lot ke dua produksi, satu produksi dari dua lot,
-- satu pesanan jual dari dua produksi, ditelusuri maju dan mundur. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner10@uji.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'qc10@uji.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'petugas10@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC Uji' where user_id = '00000000-0000-0000-0000-0000000000a2';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas Uji' where user_id = '00000000-0000-0000-0000-0000000000a3';

insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-0000000000a1', 'Pemasok Telusur Uji');
insert into public.purchase_orders (id, supplier_id, kg, harga_per_kg, status_persetujuan)
values ('a0000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 160, 45000, 'disetujui');
-- Lot N1 100 kg dan lot N2 60 kg, keduanya lulus mutu.
insert into public.lots (id, kode, po_id, po_kode, supplier_id, kg, sisa_kg, qc, grade_id) values
  ('c0000000-0000-0000-0000-0000000000a1', 'LOT-N1', 'a0000000-0000-0000-0000-0000000000a1', 'PO-N', '10000000-0000-0000-0000-0000000000a1', 100, 100, 'lulus', (select id from public.grades where kode = 'A-SO')),
  ('c0000000-0000-0000-0000-0000000000a2', 'LOT-N2', 'a0000000-0000-0000-0000-0000000000a1', 'PO-N', '10000000-0000-0000-0000-0000000000a1', 60, 60, 'lulus', (select id from public.grades where kode = 'A-SO'));
insert into public.buyers (id, nama, tempo_hari) values ('b1000000-0000-0000-0000-0000000000a1', 'Pembeli Telusur Uji', 14);

-- ============================================================ Petugas: dua produksi dari dua lot
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a3", "role": "authenticated", "aal": "aal1"}';
-- Produksi A: LOT-N1 60 kg + LOT-N2 20 kg. Produksi B: sisa LOT-N1 40 kg. Jadi N1 masuk ke dua produksi dan A berasal dari dua lot.
select lives_ok(
  $$select public.mulai_produksi('[{"lot_id": "c0000000-0000-0000-0000-0000000000a1", "kg": 60}, {"lot_id": "c0000000-0000-0000-0000-0000000000a2", "kg": 20}]'::jsonb, current_date, 'nm-a')$$,
  'produksi A dimulai dari dua lot');
select lives_ok(
  $$select public.mulai_produksi('[{"lot_id": "c0000000-0000-0000-0000-0000000000a1", "kg": 40}]'::jsonb, current_date, 'nm-b')$$,
  'produksi B dimulai dari sisa lot yang sama');

select is((select count(distinct production_id)::int from public.lot_allocations where lot_id = 'c0000000-0000-0000-0000-0000000000a1'), 2, 'satu lot masuk ke dua produksi');
select is((select count(distinct lot_id)::int from public.lot_allocations a join public.productions p on p.id = a.production_id where p.catatan = 'nm-a'), 2, 'satu produksi berasal dari dua lot');
select is((select sisa_kg::text from public.lots where id = 'c0000000-0000-0000-0000-0000000000a1'), '0.000', 'sisa LOT-N1 habis (100 - 60 - 40)');
select is((select sisa_kg::text from public.lots where id = 'c0000000-0000-0000-0000-0000000000a2'), '40.000', 'sisa LOT-N2 40 kg (60 - 20)');
select is((select sum(kg)::text from public.lot_allocations where lot_id = 'c0000000-0000-0000-0000-0000000000a1'), '100.000', 'jumlah alokasi LOT-N1 = berat lot (tidak ada berat hilang atau ganda)');
select is((select masuk_kg::text from public.v_neraca_produksi n join public.productions p on p.id = n.production_id where p.catatan = 'nm-a'), '80.000', 'ikan masuk produksi A = jumlah alokasi dari kedua lot');

select lives_ok(
  $$select public.simpan_loin((select id from public.productions where catatan = 'nm-a'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-0000000000a1', 'no_loin', 1, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 40)))$$,
  'loin produksi A tersimpan');
select lives_ok(
  $$select public.simpan_loin((select id from public.productions where catatan = 'nm-b'), jsonb_build_array(
      jsonb_build_object('id', 'b0000000-0000-0000-0000-0000000000b1', 'no_loin', 1, 'grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 20)))$$,
  'loin produksi B tersimpan');
select lives_ok($$select public.selesaikan_produksi((select id from public.productions where catatan = 'nm-a'))$$, 'produksi A selesai');
select lives_ok($$select public.selesaikan_produksi((select id from public.productions where catatan = 'nm-b'))$$, 'produksi B selesai');

-- ============================================================ QC lalu Owner
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$select public.periksa_produksi((select id from public.productions where catatan = 'nm-a'), 'Selisih belum ditimbang')$$, 'QC memeriksa produksi A');
select lives_ok($$select public.periksa_produksi((select id from public.productions where catatan = 'nm-b'), 'Selisih belum ditimbang')$$, 'QC memeriksa produksi B');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$select public.setujui_produksi((select id from public.productions where catatan = 'nm-a'))$$, 'Owner menyetujui produksi A');
select lives_ok($$select public.setujui_produksi((select id from public.productions where catatan = 'nm-b'))$$, 'Owner menyetujui produksi B');

-- Hasil kedua produksi masuk stok sebagai dua unit, lalu satu pesanan mengambil dari keduanya.
select lives_ok(
  $$select public.masukkan_hasil_produksi((select id from public.productions where catatan = 'nm-a'), (select id from public.products where nama = 'Loin tuna'), null, 'beku', 30)$$,
  'hasil produksi A masuk stok');
select lives_ok(
  $$select public.masukkan_hasil_produksi((select id from public.productions where catatan = 'nm-b'), (select id from public.products where nama = 'Loin tuna'), null, 'beku', 15)$$,
  'hasil produksi B masuk stok');
select lives_ok(
  $$select public.simpan_pesanan(null, 'b1000000-0000-0000-0000-0000000000a1', null, current_date, 'nm-psn', jsonb_build_array(
      jsonb_build_object('unit_id', (select id from public.storage_units where production_kode = (select kode from public.productions where catatan = 'nm-a')), 'kg', 20, 'harga', 100000),
      jsonb_build_object('unit_id', (select id from public.storage_units where production_kode = (select kode from public.productions where catatan = 'nm-b')), 'kg', 10, 'harga', 100000)))$$,
  'satu pesanan jual mengambil dari dua produksi');

-- ---------------------------------------------------------------- penelusuran dua arah
select is(
  (select count(distinct sa.production_id)::int from public.sale_allocations sa join public.sales_orders o on o.id = sa.order_id where o.catatan = 'nm-psn' and not sa.batal),
  2, 'satu pesanan berasal dari dua produksi');
-- Maju: dari LOT-N1 ke pesanan lewat produksi dan unit stok.
select is(
  (select count(distinct sa.order_id)::int || ':' || sum(sa.kg_pesan)::text
     from public.lot_allocations la
     join public.storage_units u on u.production_id = la.production_id
     join public.sale_allocations sa on sa.unit_id = u.id and not sa.batal
    where la.lot_id = 'c0000000-0000-0000-0000-0000000000a1'),
  '1:30.000', 'maju: LOT-N1 sampai ke satu pesanan dengan total 30 kg');
-- Mundur: dari pesanan ke semua lot asalnya.
select is(
  (select array_agg(distinct la.lot_kode order by la.lot_kode)
     from public.sale_allocations sa
     join public.sales_orders o on o.id = sa.order_id
     join public.lot_allocations la on la.production_id = sa.production_id
    where o.catatan = 'nm-psn' and not sa.batal),
  array['LOT-N1', 'LOT-N2']::text[], 'mundur: pesanan ditelusuri ke kedua lot asal');
-- Mundur dari satu unit: produksi B hanya berasal dari LOT-N1.
select is(
  (select array_agg(distinct la.lot_kode)
     from public.storage_units u
     join public.lot_allocations la on la.production_id = u.production_id
    where u.production_kode = (select kode from public.productions where catatan = 'nm-b')),
  array['LOT-N1']::text[], 'mundur: unit stok produksi B hanya berasal dari LOT-N1');

select * from finish();
rollback;
