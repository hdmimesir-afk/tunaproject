-- 22 Nov 2026: pengiriman dibatasi berat pesanan dan nggak boleh makan jatah pesanan draf lain. Jalankan: supabase test db
-- Skenario wajib: stok 2.400 kg, pesanan A 1.000 kg, pesanan B 1.200 kg.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000251', 'owner25@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner 25' where user_id = '00000000-0000-0000-0000-000000000251';
insert into public.buyers (id, nama, tempo_hari) values ('b1000000-0000-0000-0000-000000000251', 'Pembeli 25', 14);
insert into public.storage_units (id, kode, product_id, product_nama, grade_kode, kondisi, kg_masuk, sisa_kg, sisa_dasar_masuk) values
  ('f0000000-0000-0000-0000-000000000251', 'STK-U251', (select id from public.products where nama = 'Loin tuna'), 'Loin tuna', 'A-SO', 'beku', 2400, 2400, 2400),
  ('f0000000-0000-0000-0000-000000000252', 'STK-U252', (select id from public.products where nama = 'Loin tuna'), 'Loin tuna', 'B-SO', 'beku', 100, 100, 100);
create temp table uji25 (k text primary key, v uuid);
grant all on uji25 to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000251", "role": "authenticated", "aal": "aal2"}';

-- Pesanan A 1.000 dan B 1.200 (draf): stok belum berkurang, tapi kepesan.
select lives_ok($$insert into uji25 values ('A', public.simpan_pesanan(null, 'b1000000-0000-0000-0000-000000000251', null, current_date, 'A',
  jsonb_build_array(jsonb_build_object('unit_id', 'f0000000-0000-0000-0000-000000000251', 'kg', 1000, 'harga', 100000))))$$, 'pesanan A 1.000 kg');
select lives_ok($$insert into uji25 values ('B', public.simpan_pesanan(null, 'b1000000-0000-0000-0000-000000000251', null, current_date, 'B',
  jsonb_build_array(jsonb_build_object('unit_id', 'f0000000-0000-0000-0000-000000000251', 'kg', 1200, 'harga', 100000))))$$, 'pesanan B 1.200 kg');
select is((select sisa_kg::text from public.storage_units where id = 'f0000000-0000-0000-0000-000000000251'), '2400.000', 'draf belum ngurangin stok');
select throws_ok($$select public.simpan_pesanan(null, 'b1000000-0000-0000-0000-000000000251', null, current_date, 'C',
  jsonb_build_array(jsonb_build_object('unit_id', 'f0000000-0000-0000-0000-000000000251', 'kg', 300, 'harga', 100000)))$$,
  'KT001', null, 'pesanan C 300 kg ditolak, yang bebas cuma 200 kg');
insert into uji25 values ('D', null);
select lives_ok($$update uji25 set v = public.simpan_pesanan(null, 'b1000000-0000-0000-0000-000000000251', null, current_date, 'D',
  jsonb_build_array(jsonb_build_object('unit_id', 'f0000000-0000-0000-0000-000000000251', 'kg', 200, 'harga', 100000))) where k = 'D'$$, 'pesanan D 200 kg (sisa yang bebas)');

-- Kirim A lebih dari pesanannya: ditolak.
select throws_ok($$select public.kirim_pesanan((select v from uji25 where k = 'A'),
  jsonb_build_array(jsonb_build_object('id', (select id from public.sale_allocations where order_id = (select v from uji25 where k = 'A')), 'kg_kirim', 1001, 'kg_diterima', null)))$$,
  'KT001', null, 'kirim A 1.001 kg (lebih dari pesanan) ditolak');
select is((select sisa_kg::text from public.storage_units where id = 'f0000000-0000-0000-0000-000000000251'), '2400.000', 'yang ditolak nggak ngubah stok');
select is((select status from public.sales_orders where id = (select v from uji25 where k = 'A')), 'draf', 'yang ditolak pesanannya tetap draf');

-- Kirim A 1.000: berhasil.
select lives_ok($$select public.kirim_pesanan((select v from uji25 where k = 'A'),
  jsonb_build_array(jsonb_build_object('id', (select id from public.sale_allocations where order_id = (select v from uji25 where k = 'A')), 'kg_kirim', 1000, 'kg_diterima', null)))$$,
  'kirim A 1.000 kg berhasil');
select is((select sisa_kg::text from public.storage_units where id = 'f0000000-0000-0000-0000-000000000251'), '1400.000', 'stok berkurang 1.000 pas kirim');
select is((select count(*)::int from public.storage_movements where unit_id = 'f0000000-0000-0000-0000-000000000251' and jenis = 'keluar' and alasan like 'Penjualan%'), 1, 'gerakan keluar tercatat sekali');

-- Pesanan yang udah dikirim nggak bisa dikirim lagi.
select throws_ok($$select public.kirim_pesanan((select v from uji25 where k = 'A'),
  jsonb_build_array(jsonb_build_object('id', (select id from public.sale_allocations where order_id = (select v from uji25 where k = 'A')), 'kg_kirim', 1, 'kg_diterima', null)))$$,
  'KT001', null, 'pesanan yang udah dikirim nggak bisa dikirim lagi');

-- Jatah B (1.200) dan D (200) dijaga: ambil stok di luar pesanan ditolak.
select throws_ok($$select public.ambil_stok('f0000000-0000-0000-0000-000000000251', 1, 'sampel')$$, 'KT001', null,
  'ambil stok yang semuanya udah dipesan B dan D ditolak');

-- Pengiriman sebagian: D kirim 150 dari 200. Sisa jatah D dilepas.
select lives_ok($$select public.kirim_pesanan((select v from uji25 where k = 'D'),
  jsonb_build_array(jsonb_build_object('id', (select id from public.sale_allocations where order_id = (select v from uji25 where k = 'D')), 'kg_kirim', 150, 'kg_diterima', null)))$$,
  'pengiriman sebagian D 150 dari 200 kg');
select is((select sisa_kg::text from public.storage_units where id = 'f0000000-0000-0000-0000-000000000251'), '1250.000', 'stok berkurang sesuai yang dikirim');
select is((select status from public.sales_orders where id = (select v from uji25 where k = 'D')), 'terkirim', 'pesanan sebagian jadi terkirim, sisa jatahnya dilepas');
select lives_ok($$select public.ambil_stok('f0000000-0000-0000-0000-000000000251', 50, 'sampel')$$, 'ambil 50 kg yang udah bebas (bukan jatah B)');
select throws_ok($$select public.ambil_stok('f0000000-0000-0000-0000-000000000251', 1, 'sampel')$$, 'KT001', null, 'sisanya jatah B, nggak bisa diambil');

-- B kirim 1.200 penuh: stok pas habis, nggak minus.
select lives_ok($$select public.kirim_pesanan((select v from uji25 where k = 'B'),
  jsonb_build_array(jsonb_build_object('id', (select id from public.sale_allocations where order_id = (select v from uji25 where k = 'B')), 'kg_kirim', 1200, 'kg_diterima', null)))$$,
  'kirim B 1.200 kg pakai jatahnya sendiri');
select is((select sisa_kg::text || ':' || status from public.storage_units where id = 'f0000000-0000-0000-0000-000000000251'), '0.000:habis', 'stok habis, nggak minus');

-- Pembatalan: jatah pesanan batal dilepas.
insert into uji25 values ('E', null);
select lives_ok($$update uji25 set v = public.simpan_pesanan(null, 'b1000000-0000-0000-0000-000000000251', null, current_date, 'E',
  jsonb_build_array(jsonb_build_object('unit_id', 'f0000000-0000-0000-0000-000000000252', 'kg', 100, 'harga', 90000))) where k = 'E'$$, 'pesanan E pegang semua 100 kg unit lain');
select throws_ok($$select public.ambil_stok('f0000000-0000-0000-0000-000000000252', 10, 'sampel')$$, 'KT001', null, 'unit yang dipegang E nggak bisa diambil');
select lives_ok($$select public.batalkan_pesanan((select v from uji25 where k = 'E'), 'batal uji')$$, 'pesanan E dibatalin');
select lives_ok($$select public.ambil_stok('f0000000-0000-0000-0000-000000000252', 10, 'sampel')$$, 'setelah batal, stoknya bebas lagi');
select throws_ok($$select public.kirim_pesanan((select v from uji25 where k = 'E'),
  jsonb_build_array(jsonb_build_object('id', (select id from public.sale_allocations where order_id = (select v from uji25 where k = 'E')), 'kg_kirim', 10, 'kg_diterima', null)))$$,
  'KT001', null, 'pesanan batal nggak bisa dikirim');

reset role;
select is((select count(*)::int from public.storage_units where sisa_kg < 0), 0, 'nggak ada stok minus');

select * from finish();
rollback;
