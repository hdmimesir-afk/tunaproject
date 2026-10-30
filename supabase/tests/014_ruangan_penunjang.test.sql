-- Fase 8 · Ruangan gudang dingin (ABF dan CS), stok penunjang, dan perbaikan angka. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(62);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000141', 'owner14@uji.local'),
  ('00000000-0000-0000-0000-000000000142', 'petugas14@uji.local'),
  ('00000000-0000-0000-0000-000000000143', 'finance14@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-000000000141';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas Uji' where user_id = '00000000-0000-0000-0000-000000000142';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance Uji' where user_id = '00000000-0000-0000-0000-000000000143';

insert into public.buyers (id, nama) values ('b1000000-0000-0000-0000-000000000141', 'Pelanggan Ruangan Uji');
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000014', 'Pemasok Ruangan Uji');
insert into public.purchase_orders (id, supplier_id, kg, harga_per_kg, status_persetujuan)
values ('a0000000-0000-0000-0000-000000000141', '10000000-0000-0000-0000-000000000014', 4000, 45000, 'disetujui');
insert into public.lots (id, kode, po_id, po_kode, supplier_id, kg, sisa_kg, qc, grade_id) values
  ('c0000000-0000-0000-0000-000000000141', 'LOT-T141', 'a0000000-0000-0000-0000-000000000141', 'PO-T', '10000000-0000-0000-0000-000000000014', 4000, 0, 'lulus', (select id from public.grades where kode = 'A-SO'));
insert into public.cycles (id, catatan) values ('f0000000-0000-0000-0000-000000000141', 'siklus-uji-ruangan');
insert into public.productions (id, status, catatan, cycle_id) values ('d0000000-0000-0000-0000-000000000141', 'diperiksa', 'ruangan-uji', 'f0000000-0000-0000-0000-000000000141');
insert into public.lot_allocations (production_id, lot_id, lot_kode, kg) values
  ('d0000000-0000-0000-0000-000000000141', 'c0000000-0000-0000-0000-000000000141', 'LOT-T141', 4000);
insert into public.production_items (id, production_id, no_loin, grade_id, kg)
values ('e0000000-0000-0000-0000-000000000141', 'd0000000-0000-0000-0000-000000000141', 1, (select id from public.grades where kode = 'A-SO'), 3000);

-- ============================================================ ruangan: data dasar
select is((select count(*)::int from public.cold_rooms where aktif), 4, 'ada empat ruangan aktif');
select is((select count(*)::int from public.cold_rooms where jenis = 'abf'), 3, 'ABF ada tiga');
select is((select count(*)::int from public.cold_rooms where jenis = 'cs'), 1, 'CS ada satu');
select is((select kapasitas_kg::text from public.v_gudang_isi), '17500.000', 'kapasitas gudang sama dengan jumlah kapasitas ruangan');
select is((select kg_diolah::text from public.v_laba_rugi_siklus where cycle_id = 'f0000000-0000-0000-0000-000000000141'), '4000.000', 'kg_diolah adalah ikan yang masuk produksi');
select is((select kg_ikan::text from public.v_laba_rugi_siklus where cycle_id = 'f0000000-0000-0000-0000-000000000141'), '0.000', 'kg_ikan tetap berasal dari PO siklus (PO uji tidak terhubung)');

-- ============================================================ petugas lapangan
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000142", "role": "authenticated", "aal": "aal1"}';

select throws_ok($$delete from public.cold_rooms$$, '42501', null, 'ruangan tidak bisa dihapus');
select throws_ok($$insert into public.cold_rooms (kode, nama, jenis, kapasitas_kg) values ('X', 'X', 'cs', 1)$$, '42501', null, 'ruangan tidak bisa ditulis langsung dari aplikasi');
select is((select count(*)::int from public.cold_rooms), 4, 'petugas melihat ruangan');
select lives_ok(
  $$select public.masukkan_hasil_produksi('d0000000-0000-0000-0000-000000000141', (select id from public.products where nama = 'Loin tuna'), (select id from public.grades where kode = 'A-SO'), 'beku', 2000, 'RAK-A', false, '', (select id from public.cold_rooms where kode = 'CS-1'))$$,
  'hasil produksi masuk ke CS-1');
select is((select isi_kg::text from public.v_ruangan_isi where kode = 'CS-1'), '2000.000', 'isi CS-1 bertambah');
select is((select isi_sendiri_kg::text from public.v_ruangan_isi where kode = 'CS-1'), '2000.000', 'isi ruangan memisahkan milik sendiri');
select lives_ok(
  $$select public.masukkan_hasil_produksi('d0000000-0000-0000-0000-000000000141', (select id from public.products where nama = 'Loin tuna'), null, 'fresh', 1000, 'ABF-RAK', false, '', (select id from public.cold_rooms where kode = 'ABF-1'))$$,
  'fresh masuk ke ABF-1');
select is((select isi_kg::text from public.v_ruangan_isi where kode = 'ABF-1'), '1000.000', 'isi ABF-1 bertambah');
select throws_ok(
  $$select public.terima_titipan('b1000000-0000-0000-0000-000000000141', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 2600, 'X', false, '', (select id from public.cold_rooms where kode = 'ABF-1'))$$,
  'KT001', null, 'titipan melebihi kapasitas ruangan ditolak');
select throws_ok(
  $$select public.terima_titipan('b1000000-0000-0000-0000-000000000141', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 10, 'X', false, '', '99999999-9999-9999-9999-999999999999')$$,
  'KT001', null, 'ruangan yang tidak dikenal ditolak');
select lives_ok(
  $$select public.terima_titipan('b1000000-0000-0000-0000-000000000141', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 1000, 'TIT-14', false, '', (select id from public.cold_rooms where kode = 'ABF-2'))$$,
  'titipan masuk ke ABF-2');
select is((select isi_titipan_kg::text from public.v_ruangan_isi where kode = 'ABF-2'), '1000.000', 'isi ruangan memisahkan titipan');
select lives_ok(
  $$select public.terima_titipan('b1000000-0000-0000-0000-000000000141', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 50, 'TANPA-RUANG')$$,
  'titipan tanpa ruangan (cara lama) tetap bisa diterima');
select is((select count(*)::int from public.storage_units where lokasi = 'TANPA-RUANG' and room_id is null), 1, 'unit tanpa ruangan tersimpan dengan room_id kosong');
select is((select (isi_sendiri_kg + isi_titipan_kg)::text from public.v_gudang_isi), '4050.000', 'isi gudang total mencakup yang belum ditempatkan');
select is((select sum(isi_kg)::text from public.v_ruangan_isi), '4000.000', 'isi ruangan hanya yang sudah ditempatkan');

select lives_ok(
  $$select public.pindah_ruangan((select id from public.storage_units where lokasi = 'TIT-14'), (select id from public.cold_rooms where kode = 'ABF-1'))$$,
  'titipan dipindah dari ABF-2 ke ABF-1');
select is((select isi_kg::text from public.v_ruangan_isi where kode = 'ABF-1'), '2000.000', 'isi ABF-1 setelah pindah');
select is((select isi_kg::text from public.v_ruangan_isi where kode = 'ABF-2'), '0.000', 'ABF-2 kosong setelah pindah');
select throws_ok(
  $$select public.pindah_ruangan((select id from public.storage_units where lokasi = 'RAK-A'), (select id from public.cold_rooms where kode = 'ABF-1'))$$,
  'KT001', null, 'pindah ke ruangan yang tidak muat ditolak');
select lives_ok(
  $$select public.pindah_ruangan((select id from public.storage_units where lokasi = 'TANPA-RUANG'), (select id from public.cold_rooms where kode = 'ABF-3'))$$,
  'unit lama tanpa ruangan bisa ditempatkan');
select throws_ok($$select public.ubah_ruangan((select id from public.cold_rooms where kode = 'ABF-3'), 5000, true)$$, '42501', null, 'petugas tidak boleh mengubah kapasitas ruangan');

-- ============================================================ stok penunjang (petugas lapangan)
select cmp_ok((select count(*)::int from public.supply_items), '>=', 15, 'daftar contoh penunjang tersedia');
select is((select count(distinct kategori)::int from public.supply_items), 2, 'ada penunjang kerja dan penunjang pekerja');
select ok((select count(*) from public.v_supply_stok where aktif and status_stok = 'menipis') >= 1, 'contoh punya barang menipis');
select ok((select count(*) from public.v_supply_stok where aktif and status_stok = 'habis') >= 1, 'contoh punya barang habis');
select lives_ok($$select public.simpan_barang(null, 'kerja', 'Barang Uji 14', 'pcs', 5, 'Rak 1', 'uji')$$, 'barang baru disimpan');
select throws_ok($$select public.simpan_barang(null, 'kerja', 'barang uji 14', 'pcs', 5)$$, 'KT001', null, 'nama kembar di kategori yang sama ditolak (tanpa peduli huruf besar)');
select lives_ok($$select public.simpan_barang(null, 'pekerja', 'Barang Uji 14', 'pcs', 5)$$, 'nama yang sama di kategori lain boleh');
select throws_ok($$select public.simpan_barang(null, 'lainnya', 'X', 'pcs', 0)$$, 'KT001', null, 'kategori selain kerja dan pekerja ditolak');
select lives_ok($$select public.catat_barang_masuk((select id from public.supply_items where nama = 'Barang Uji 14' and kategori = 'kerja'), 10, null, 'beli')$$, 'barang masuk');
select is((select stok::text from public.v_supply_stok where nama = 'Barang Uji 14' and kategori = 'kerja'), '10.000', 'stok dihitung dari riwayat');
select lives_ok($$select public.catat_barang_keluar((select id from public.supply_items where nama = 'Barang Uji 14' and kategori = 'kerja'), 4, null, 'Tim potong', 'dipakai')$$, 'barang keluar');
select is((select status_stok from public.v_supply_stok where nama = 'Barang Uji 14' and kategori = 'kerja'), 'aman', 'stok 6 di atas minimum 5: aman');
select lives_ok($$select public.catat_barang_keluar((select id from public.supply_items where nama = 'Barang Uji 14' and kategori = 'kerja'), 2)$$, 'keluar lagi');
select is((select status_stok from public.v_supply_stok where nama = 'Barang Uji 14' and kategori = 'kerja'), 'menipis', 'stok 4 di bawah minimum 5: menipis');
select throws_ok($$select public.catat_barang_keluar((select id from public.supply_items where nama = 'Barang Uji 14' and kategori = 'kerja'), 10)$$, 'KT001', null, 'keluar melebihi stok ditolak');
select throws_ok($$select public.catat_barang_keluar((select id from public.supply_items where nama = 'Barang Uji 14' and kategori = 'kerja'), 0.0005)$$, 'KT001', null, 'jumlah lebih dari tiga desimal ditolak');
select throws_ok($$select public.catat_barang_masuk((select id from public.supply_items where nama = 'Barang Uji 14' and kategori = 'kerja'), 5, current_date + 30)$$, 'KT001', null, 'tanggal di masa depan ditolak');
select throws_ok($$select public.koreksi_barang((select id from public.supply_items where nama = 'Barang Uji 14' and kategori = 'kerja'), -5, 'opname')$$, 'KT001', null, 'koreksi yang membuat stok negatif ditolak');
select throws_ok($$select public.koreksi_barang((select id from public.supply_items where nama = 'Barang Uji 14' and kategori = 'kerja'), -1, '')$$, 'KT001', null, 'koreksi tanpa alasan ditolak');
select lives_ok($$select public.koreksi_barang((select id from public.supply_items where nama = 'Barang Uji 14' and kategori = 'kerja'), -4, 'opname: barang habis')$$, 'koreksi sampai nol');
select is((select status_stok from public.v_supply_stok where nama = 'Barang Uji 14' and kategori = 'kerja'), 'habis', 'stok nol berstatus habis');
select throws_ok($$insert into public.supply_movements (item_id, jenis, jumlah) values ((select id from public.supply_items limit 1), 'masuk', 1)$$, '42501', null, 'riwayat barang tidak bisa ditulis langsung');
select throws_ok($$update public.supply_movements set jumlah = 99$$, '42501', null, 'riwayat barang tidak bisa diubah');
select throws_ok($$delete from public.supply_movements$$, '42501', null, 'riwayat barang tidak bisa dihapus');
select lives_ok($$select public.simpan_barang((select id from public.supply_items where nama = 'Barang Uji 14' and kategori = 'kerja'), 'kerja', 'Barang Uji 14', 'pcs', 5, '', '', false)$$, 'barang dinonaktifkan');
select throws_ok($$select public.catat_barang_masuk((select id from public.supply_items where nama = 'Barang Uji 14' and kategori = 'kerja'), 1)$$, 'KT001', null, 'barang nonaktif tidak bisa menerima stok');

-- ============================================================ finance: hanya membaca
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000143", "role": "authenticated", "aal": "aal1"}';
select ok((select count(*) from public.supply_items) >= 15, 'finance melihat barang penunjang');
select throws_ok($$select public.catat_barang_masuk((select id from public.supply_items where nama = 'Masker' limit 1), 1)$$, '42501', null, 'finance tidak boleh mencatat barang masuk');
select throws_ok($$select public.pindah_ruangan((select id from public.storage_units where lokasi = 'RAK-A'), (select id from public.cold_rooms where kode = 'ABF-3'))$$, '42501', null, 'finance tidak boleh memindah ruangan');

-- ============================================================ owner
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000141", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.ubah_ruangan((select id from public.cold_rooms where kode = 'CS-1'), 1500, true)$$, 'KT001', null, 'kapasitas tidak boleh di bawah isi sekarang');
select lives_ok($$select public.ubah_ruangan((select id from public.cold_rooms where kode = 'ABF-3'), 3000, true, 'dikonfirmasi owner')$$, 'owner mengubah kapasitas ABF-3');
select is((select kapasitas_kg::text from public.v_gudang_isi), '18000.000', 'kapasitas gudang ikut berubah');
select throws_ok($$select public.ubah_ruangan((select id from public.cold_rooms where kode = 'ABF-3'), 3000, true, '', false)$$, 'KT001', null, 'ruangan yang masih berisi tidak bisa dinonaktifkan');
select is((select barang_menipis from public.v_dashboard), (select count(*)::int from public.v_supply_stok where aktif and status_stok = 'menipis'), 'dashboard menghitung barang menipis sama dengan daftar');

select * from finish();
rollback;
