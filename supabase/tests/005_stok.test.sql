-- Fase 4 Â· Stok, titipan gudang dingin, mesin tarif, koreksi stok, jadwal ABF. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(60);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000041', 'owner5@uji.local'),
  ('00000000-0000-0000-0000-000000000042', 'petugas5@uji.local'),
  ('00000000-0000-0000-0000-000000000043', 'finance5@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-000000000041';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas Uji' where user_id = '00000000-0000-0000-0000-000000000042';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance Uji' where user_id = '00000000-0000-0000-0000-000000000043';

insert into public.buyers (id, nama) values ('b1000000-0000-0000-0000-000000000051', 'Pelanggan Titipan Uji');
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000005', 'Pemasok Stok Uji');
insert into public.purchase_orders (id, supplier_id, kg, harga_per_kg, status_persetujuan)
values ('a0000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000005', 120, 45000, 'disetujui');
insert into public.lots (id, kode, po_id, po_kode, supplier_id, kg, sisa_kg, qc, grade_id) values
  ('c0000000-0000-0000-0000-000000000051', 'LOT-T51', 'a0000000-0000-0000-0000-000000000051', 'PO-T', '10000000-0000-0000-0000-000000000005', 120, 0, 'lulus', (select id from public.grades where kode = 'A-SO'));
-- Produksi selesai diperiksa (hasil loin 100 kg dari 120 kg) dan satu produksi yang masih berjalan.
insert into public.productions (id, status, catatan) values
  ('d0000000-0000-0000-0000-000000000051', 'diperiksa', 'stok-uji-selesai'),
  ('d0000000-0000-0000-0000-000000000052', 'berjalan', 'stok-uji-berjalan');
insert into public.lot_allocations (production_id, lot_id, lot_kode, kg) values
  ('d0000000-0000-0000-0000-000000000051', 'c0000000-0000-0000-0000-000000000051', 'LOT-T51', 120);
insert into public.production_items (id, production_id, no_loin, grade_id, kg)
values ('e0000000-0000-0000-0000-000000000051', 'd0000000-0000-0000-0000-000000000051', 1, (select id from public.grades where kode = 'A-SO'), 100);

-- ============================================================ Mesin tarif (murni)
select is((public.hitung_biaya_simpan(10, '2026-01-01 00:00+00', '2026-01-01 03:00+00', 76, 10, 3, 10) ->> 'jumlah'), '100.00', 'tepat 3 jam: masih transit');
select is((public.hitung_biaya_simpan(10, '2026-01-01 00:00+00', '2026-01-01 03:00:01+00', 76, 10, 3, 10) ->> 'jumlah'), '760.00', '3 jam lebih 1 detik: ditagih 1 hari');
select is((public.hitung_biaya_simpan(10, '2026-01-01 00:00+00', '2026-01-02 00:00+00', 76, 10, 3, 10) ->> 'hari_ditagih'), '1', 'tepat 24 jam: 1 hari, tanpa minimum');
select is((public.hitung_biaya_simpan(10, '2026-01-01 00:00+00', '2026-01-02 00:00:01+00', 76, 10, 3, 10) ->> 'jumlah'), '7600.00', '24 jam lebih 1 detik: kena minimum 10 hari');
select is((public.hitung_biaya_simpan(10, '2026-01-01 00:00+00', '2026-01-11 00:00+00', 76, 10, 3, 10) ->> 'jumlah'), '7600.00', 'tepat 10 hari: 10 hari');
select is((public.hitung_biaya_simpan(10, '2026-01-01 00:00+00', '2026-01-11 00:00:01+00', 76, 10, 3, 10) ->> 'jumlah'), '8360.00', 'hari ke-11 menambah satu hari penuh');
select throws_ok($$select public.hitung_biaya_simpan(10, '2026-01-02 00:00+00', '2026-01-01 00:00+00', 76, 10, 3, 10)$$, 'KT001', null, 'keluar sebelum masuk ditolak');

-- ============================================================ Petugas lapangan
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000042", "role": "authenticated", "aal": "aal1"}';

select lives_ok(
  $$select public.masukkan_hasil_produksi('d0000000-0000-0000-0000-000000000051', (select id from public.products where nama = 'Loin tuna'), (select id from public.grades where kode = 'A-SO'), 'beku', 60, 'RAK-1')$$,
  'hasil produksi masuk stok beku');
select is((select sisa_kg::text from public.storage_units where lokasi = 'RAK-1'), '60.000', 'sisa unit sama dengan berat masuk');
select throws_ok(
  $$select public.masukkan_hasil_produksi('d0000000-0000-0000-0000-000000000051', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 50)$$,
  'KT001', null, 'melebihi hasil produksi ditolak');
select lives_ok(
  $$select public.masukkan_hasil_produksi('d0000000-0000-0000-0000-000000000051', (select id from public.products where nama = 'Loin tuna'), null, 'fresh', 30, 'FRESH-1', true)$$,
  'fresh langsung kirim tercatat');
select is((select status || ':' || sisa_kg::text from public.storage_units where lokasi = 'FRESH-1'), 'habis:0.000', 'fresh langsung kirim tidak menempati gudang');
select throws_ok(
  $$select public.masukkan_hasil_produksi('d0000000-0000-0000-0000-000000000051', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 1, '', true)$$,
  'KT001', null, 'yang beku tidak boleh langsung kirim');
select throws_ok(
  $$select public.masukkan_hasil_produksi('d0000000-0000-0000-0000-000000000052', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 1)$$,
  'KT001', null, 'produksi yang belum diperiksa Owner tidak bisa masuk stok');

select lives_ok($$select public.ambil_stok((select id from public.storage_units where lokasi = 'RAK-1'), 20, 'kirim')$$, 'ambil sebagian stok sendiri');
select is((select sisa_kg::text from public.storage_units where lokasi = 'RAK-1'), '40.000', 'sisa berkurang sesuai timbang ulang');
select is((select count(*)::int from public.service_charges where unit_id = (select id from public.storage_units where lokasi = 'RAK-1')), 0, 'stok sendiri tidak ditagih');
select throws_ok($$select public.ambil_stok((select id from public.storage_units where lokasi = 'RAK-1'), 100)$$, 'KT001', null, 'ambil melebihi sisa ditolak');
select throws_ok($$insert into public.storage_units (product_id, product_nama, kondisi, kg_masuk, sisa_kg, sisa_dasar_masuk) values ((select id from public.products limit 1), 'x', 'beku', 1, 1, 1)$$, '42501', null, 'unit stok tidak bisa ditulis langsung');
select throws_ok($$delete from public.storage_movements$$, '42501', null, 'pergerakan stok tidak bisa dihapus');

-- Titipan dan kapasitas.
select lives_ok(
  $$select public.terima_titipan('b1000000-0000-0000-0000-000000000051', (select id from public.products where nama = 'Loin tuna'), null, 'fresh', 1000, 'TIT-1', true)$$,
  'titipan fresh masuk dengan ABF');
select is((select jumlah::text from public.service_charges where jenis = 'abf' and unit_id = (select id from public.storage_units where lokasi = 'TIT-1')), '3500000.00', 'tagihan ABF 1000 kg x Rp3.500');
select throws_ok(
  $$select public.terima_titipan('b1000000-0000-0000-0000-000000000051', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 17000, 'TIT-X')$$,
  'KT001', null, 'titipan yang melebihi kapasitas 17.500 kg ditolak');

-- Tagihan simpan saat ambil sebagian (ikan dianggap masuk 12 hari lalu).
reset role;
update public.storage_units set masuk_pada = now() - interval '12 days' where lokasi = 'TIT-1';
set local role authenticated;
select lives_ok($$select public.ambil_stok((select id from public.storage_units where lokasi = 'TIT-1'), 400)$$, 'titipan diambil sebagian');
select is((select jumlah::text from public.service_charges where jenis = 'simpan' and kg_dasar = 400), '364800.00', '400 kg x Rp76 x 12 hari');
select is((select sisa_kg::text from public.storage_units where lokasi = 'TIT-1'), '600.000', 'sisa titipan setelah ambil sebagian');
select lives_ok($$select public.ambil_stok((select id from public.storage_units where lokasi = 'TIT-1'), 600)$$, 'sisa titipan diambil');
select is((select jumlah::text from public.service_charges where jenis = 'simpan' and kg_dasar = 600), '547200.00', '600 kg x Rp76 x 12 hari');
select is((select status from public.storage_units where lokasi = 'TIT-1'), 'habis', 'unit habis setelah diambil semua');
select lives_ok(
  $$select public.terima_titipan('b1000000-0000-0000-0000-000000000051', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 100, 'TIT-2')$$,
  'titipan kedua masuk');
select lives_ok($$select public.ambil_stok((select id from public.storage_units where lokasi = 'TIT-2'), 100)$$, 'titipan kedua langsung diambil');
select is((select jenis || ':' || jumlah::text from public.service_charges where kg_dasar = 100 and jenis in ('transit', 'simpan')), 'transit:0.00', 'diambil dalam masa transit: tarif transit (belum ditetapkan, nol)');

-- Koreksi stok menunggu Owner.
select lives_ok($$select public.ajukan_koreksi_stok((select id from public.storage_units where lokasi = 'RAK-1'), -5, 'salah timbang 1')$$, 'petugas mengajukan koreksi');
select lives_ok($$select public.ajukan_koreksi_stok((select id from public.storage_units where lokasi = 'RAK-1'), -1, 'salah timbang 2')$$, 'petugas mengajukan koreksi kedua');
select is((select sisa_kg::text from public.storage_units where lokasi = 'RAK-1'), '40.000', 'koreksi belum berlaku sebelum disetujui');
select throws_ok($$select public.ajukan_koreksi_stok((select id from public.storage_units where lokasi = 'RAK-1'), -5, '')$$, 'KT001', null, 'koreksi tanpa alasan ditolak');
select throws_ok($$select public.ajukan_koreksi_stok((select id from public.storage_units where lokasi = 'RAK-1'), -100, 'terlalu besar')$$, 'KT001', null, 'koreksi yang membuat sisa negatif ditolak');
select throws_ok($$select public.putuskan_koreksi_stok((select id from public.storage_movements where alasan = 'salah timbang 1'), true)$$, '42501', null, 'petugas tidak boleh menyetujui koreksi');
select throws_ok($$select public.ubah_tarif('simpan', 80, 10, 3, 'masuk', current_date, true)$$, '42501', null, 'petugas tidak boleh mengubah tarif');

-- Jadwal ABF: mesin tunggal.
select lives_ok($$select public.buat_booking('produksi', (select id from public.partners where nama = 'CV DUS'), 'Giliran CV DUS', '2026-03-01 08:00+00', '2026-03-01 12:00+00')$$, 'jadwal mitra dibuat');
select throws_ok($$select public.buat_booking('abf', null, 'ABF titipan', '2026-03-01 10:00+00', '2026-03-01 14:00+00')$$, 'KT001', null, 'jadwal yang bentrok ditolak');
select lives_ok($$select public.buat_booking('abf', null, 'ABF titipan', '2026-03-01 12:00+00', '2026-03-01 14:00+00')$$, 'jadwal yang menempel (tidak tumpang tindih) boleh');
select ok(public.slot_kosong(120, '2026-03-01 09:00+00') = '2026-03-01 14:00+00'::timestamptz, 'jam kosong pertama setelah semua jadwal yang bentrok');
select lives_ok($$select public.pindah_booking((select id from public.bookings where label = 'ABF titipan'), '2026-03-01 16:00+00')$$, 'jadwal dipindah ke jam kosong');
select throws_ok($$select public.pindah_booking((select id from public.bookings where label = 'Giliran CV DUS'), '2026-03-01 15:30+00')$$, 'KT001', null, 'pindah ke jam yang bentrok ditolak');
select throws_ok($$select public.batalkan_booking((select id from public.bookings where label = 'Giliran CV DUS'), '')$$, 'KT001', null, 'batal tanpa alasan ditolak');
select lives_ok($$select public.batalkan_booking((select id from public.bookings where label = 'Giliran CV DUS'), 'mitra batal')$$, 'jadwal dibatalkan dengan alasan');
select lives_ok($$select public.buat_booking('abf', null, 'Isi jam yang kosong', '2026-03-01 09:00+00', '2026-03-01 10:00+00')$$, 'jam dari jadwal yang dibatalkan bisa dipakai lagi');

-- ============================================================ Finance
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000043", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.buat_booking('abf', null, 'tidak boleh', '2026-04-01 08:00+00', '2026-04-01 09:00+00')$$, '42501', null, 'finance tidak boleh membuat jadwal');
select throws_ok(
  $$select public.masukkan_hasil_produksi('d0000000-0000-0000-0000-000000000051', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 1)$$,
  '42501', null, 'finance tidak boleh memasukkan stok');
select ok((select count(*) from public.storage_units) > 0, 'finance boleh melihat stok');
select ok((select count(*) from public.service_charges) > 0, 'finance boleh melihat tagihan jasa');

-- ============================================================ Owner
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000041", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$select public.putuskan_koreksi_stok((select id from public.storage_movements where alasan = 'salah timbang 1'), true)$$, 'Owner menyetujui koreksi');
select is((select sisa_kg::text from public.storage_units where lokasi = 'RAK-1'), '35.000', 'koreksi berlaku setelah disetujui');
select throws_ok($$select public.putuskan_koreksi_stok((select id from public.storage_movements where alasan = 'salah timbang 1'), true)$$, 'KT001', null, 'koreksi yang sudah diputuskan tidak bisa diputuskan lagi');
select throws_ok($$select public.putuskan_koreksi_stok((select id from public.storage_movements where alasan = 'salah timbang 2'), false, '')$$, 'KT001', null, 'menolak koreksi butuh alasan');
select lives_ok($$select public.putuskan_koreksi_stok((select id from public.storage_movements where alasan = 'salah timbang 2'), false, 'tidak sesuai nota')$$, 'Owner menolak koreksi');
select is((select sisa_kg::text from public.storage_units where lokasi = 'RAK-1'), '35.000', 'koreksi yang ditolak tidak mengubah stok');
select lives_ok($$select public.ubah_tarif('simpan', 80, 10, 3, 'masuk', date '2027-01-01', true, 'tarif baru')$$, 'Owner menambah tarif baru');
select is((select count(*)::int from public.tariff_rules where jenis = 'simpan'), 2, 'tarif lama tetap tersimpan (riwayat tarif)');

select * from finish();
rollback;
