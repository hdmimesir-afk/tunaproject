-- Fase 2 · Alur pembelian: PO, persetujuan dua tahap, penerimaan, cek mutu, pembayaran. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(69);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000021', 'owner3@uji.local'),
  ('00000000-0000-0000-0000-000000000022', 'finance3@uji.local'),
  ('00000000-0000-0000-0000-000000000023', 'admin3@uji.local'),
  ('00000000-0000-0000-0000-000000000024', 'qc3@uji.local'),
  ('00000000-0000-0000-0000-000000000025', 'petugas3@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-000000000021';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance Uji' where user_id = '00000000-0000-0000-0000-000000000022';
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin Uji' where user_id = '00000000-0000-0000-0000-000000000023';
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC Uji' where user_id = '00000000-0000-0000-0000-000000000024';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas Uji' where user_id = '00000000-0000-0000-0000-000000000025';

insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000001', 'Pemasok PB Uji');

-- Enam PO draf dengan nota (dibuat sebagai sistem supaya setiap alur bisa dites sendiri).
insert into public.purchase_orders (id, supplier_id, kg, harga_per_kg, catatan) values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 100, 45000, 'fx-1'),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 50, 40000, 'fx-2'),
  ('a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 20, 50000, 'fx-3'),
  ('a0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 10, 100000, 'fx-4'),
  ('a0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 5, 200000, 'fx-5'),
  ('a0000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 8, 125000, 'fx-6');
insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe)
select 'purchase_orders', id, 'nota', 'po/' || id::text || '/nota.jpg', 'nota.jpg', 1000, 'image/jpeg' from public.purchase_orders where catatan like 'fx-%';

-- Kebijakan Storage ada.
select ok(exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'dokumen diunggah'), 'kebijakan unggah dokumen ada');
select ok(exists (select 1 from storage.buckets where id = 'dokumen' and not public), 'bucket dokumen ada dan privat');

-- ============================================================ Super Admin
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000023", "role": "authenticated", "aal": "aal1"}';

select results_eq(
  $$insert into public.purchase_orders (supplier_id, kg, harga_per_kg, catatan) values ('10000000-0000-0000-0000-000000000001', 100, 45000, 'uji-1') returning status_persetujuan$$,
  array['draf'], 'admin membuat PO berstatus draf');
select throws_ok(
  $$insert into public.purchase_orders (supplier_id, kg, harga_per_kg, status_persetujuan) values ('10000000-0000-0000-0000-000000000001', 1, 1, 'disetujui')$$,
  '42501', null, 'status tidak bisa diisi langsung saat membuat PO');
select throws_ok(
  $$update public.purchase_orders set status_persetujuan = 'disetujui' where catatan = 'uji-1'$$,
  '42501', null, 'status tidak bisa diubah langsung');
select results_eq($$select total::text from public.purchase_orders where catatan = 'uji-1'$$, array['4500000.00'], 'total dihitung otomatis dari berat x harga');
select throws_ok(
  $$select public.ajukan_po((select id from public.purchase_orders where catatan = 'uji-1'))$$,
  'KT001', null, 'ajukan tanpa nota ditolak');
select results_eq(
  $$insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe) values ('purchase_orders', (select id from public.purchase_orders where catatan = 'uji-1'), 'nota', 'po/uji-1/nota.jpg', 'nota.jpg', 1000, 'image/jpeg') returning jenis$$,
  array['nota'], 'admin melampirkan nota');
select ok(public.ajukan_po((select id from public.purchase_orders where catatan = 'uji-1')) is not null, 'admin mengajukan PO');
select results_eq($$select status_persetujuan from public.purchase_orders where catatan = 'uji-1'$$, array['diajukan'], 'status PO menjadi diajukan');
select is_empty($$update public.purchase_orders set kg = 1 where catatan = 'uji-1' returning id$$, 'PO yang diajukan tidak bisa diedit');
select throws_ok(
  $$select public.ajukan_po((select id from public.purchase_orders where catatan = 'uji-1'))$$,
  'KT001', null, 'PO yang sudah diajukan tidak bisa diajukan lagi');
select lives_ok(
  $$select public.ajukan_po(id) from public.purchase_orders where catatan like 'fx-%'$$,
  'admin mengajukan enam PO fixture');
select results_eq($$select count(*)::int from public.v_persetujuan where status = 'diajukan'$$, array[7], 'tujuh pengajuan menunggu pemeriksaan');
select throws_ok(
  $$select public.periksa_persetujuan((select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000001' order by kode desc limit 1))$$,
  '42501', null, 'admin tidak boleh memeriksa');
select throws_ok(
  $$select public.setujui_persetujuan(array[(select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000001' order by kode desc limit 1)], 4500000)$$,
  '42501', null, 'admin tidak boleh menyetujui');
select throws_ok(
  $$select public.terima_po('a0000000-0000-0000-0000-000000000001', 10)$$,
  '42501', null, 'admin tidak boleh menerima ikan');

-- ============================================================ Petugas Lapangan
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000025", "role": "authenticated", "aal": "aal1"}';

select results_eq($$select count(*)::int from public.purchase_orders$$, array[0], 'petugas tidak melihat PO (harga)');
select results_eq(
  $$select count(*)::int from public.po_siap_terima() where po_id = 'a0000000-0000-0000-0000-000000000001'$$,
  array[1], 'petugas melihat PO yang siap diterima tanpa harga');
select throws_ok(
  $$select public.terima_po('a0000000-0000-0000-0000-000000000001', 100, '', false)$$,
  'KT001', null, 'terima ikan sebelum PO disetujui ditolak tanpa tanda bongkar malam');
select ok(public.terima_po('a0000000-0000-0000-0000-000000000001', 60.5, 'bongkar malam', true) is not null, 'bongkar malam diterima dengan tanda');
select results_eq(
  $$select sebelum_disetujui from public.lots where po_id = 'a0000000-0000-0000-0000-000000000001'$$,
  array[true], 'lot bongkar malam bertanda sebelum disetujui');
select throws_ok(
  $$select public.cek_mutu((select id from public.lots where po_id = 'a0000000-0000-0000-0000-000000000001'), 'ditahan')$$,
  '42501', null, 'petugas tidak boleh cek mutu');
select throws_ok(
  $$select public.catat_bayar('a0000000-0000-0000-0000-000000000001', 1000)$$,
  '42501', null, 'petugas tidak boleh membayar');
select throws_ok(
  $$insert into public.lots (po_id, po_kode, supplier_id, kg, sisa_kg) values ('a0000000-0000-0000-0000-000000000001', 'PO-X', '10000000-0000-0000-0000-000000000001', 1, 1)$$,
  '42501', null, 'lot tidak bisa dibuat langsung');
select ok((select count(*) from public.pengguna_ringkas()) > 0, 'petugas melihat daftar nama pengguna tanpa email');

-- ============================================================ Finance
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000022", "role": "authenticated", "aal": "aal2"}';

select results_eq($$select count(*)::int from public.v_purchase_orders where status_persetujuan = 'diajukan'$$, array[7], 'finance melihat tujuh PO diajukan');
select lives_ok(
  $$select public.periksa_persetujuan((select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000001' order by kode desc limit 1), 'nota cocok')$$,
  'finance memeriksa PO1');
select results_eq(
  $$select status from public.v_persetujuan where ref_id = 'a0000000-0000-0000-0000-000000000001'$$,
  array['diperiksa'], 'pengajuan menjadi diperiksa');
select throws_ok(
  $$select public.periksa_persetujuan((select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000001' order by kode desc limit 1))$$,
  'KT001', null, 'pengajuan yang sudah diperiksa tidak bisa diperiksa lagi');
select throws_ok(
  $$select public.setujui_persetujuan(array[(select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000001' order by kode desc limit 1)], 4500000)$$,
  '42501', null, 'finance tidak boleh menyetujui');
select throws_ok(
  $$select public.catat_bayar('a0000000-0000-0000-0000-000000000001', 1000)$$,
  'KT001', null, 'bayar sebelum disetujui ditolak');
select throws_ok(
  $$select public.minta_revisi((select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000003' order by kode desc limit 1), '  ')$$,
  'KT001', null, 'minta revisi tanpa alasan ditolak');
select lives_ok(
  $$select public.minta_revisi((select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000002' order by kode desc limit 1), 'harga terlalu tinggi')$$,
  'finance meminta revisi PO2');
select results_eq(
  $$select status_persetujuan from public.v_purchase_orders where id = 'a0000000-0000-0000-0000-000000000002'$$,
  array['perlu_revisi'], 'PO2 berstatus perlu revisi');
select lives_ok(
  $$select public.periksa_persetujuan(id) from public.approvals where ref_id in ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006')$$,
  'finance memeriksa PO4, PO5, PO6');

-- ============================================================ Super Admin merevisi
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000023", "role": "authenticated", "aal": "aal1"}';

select results_eq(
  $$update public.purchase_orders set kg = 60 where id = 'a0000000-0000-0000-0000-000000000002' returning kg::text$$,
  array['60.000'], 'PO perlu revisi bisa diedit');
select lives_ok($$select public.ajukan_po('a0000000-0000-0000-0000-000000000002')$$, 'PO2 diajukan ulang setelah revisi');
select results_eq(
  $$select count(*)::int from public.v_persetujuan where ref_id = 'a0000000-0000-0000-0000-000000000002'$$,
  array[2], 'riwayat pengajuan PO2 tersimpan dua baris');

-- ============================================================ Owner
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000021", "role": "authenticated", "aal": "aal2"}';

select throws_ok(
  $$select public.setujui_persetujuan(array[(select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000001' order by kode desc limit 1)], 1)$$,
  'KT001', null, 'total yang tidak cocok dengan konfirmasi ditolak');
select results_eq(
  $$select (public.setujui_persetujuan(array[(select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000001' order by kode desc limit 1)], 4500000) ->> 'jumlah')::int$$,
  array[1], 'owner menyetujui PO1');
select results_eq(
  $$select status_persetujuan from public.v_purchase_orders where id = 'a0000000-0000-0000-0000-000000000001'$$,
  array['disetujui'], 'PO1 menjadi disetujui');
select results_eq(
  $$select status_bayar from public.v_purchase_orders where id = 'a0000000-0000-0000-0000-000000000001'$$,
  array['belum'], 'disetujui tidak otomatis dibayar');
select results_eq(
  $$select (public.setujui_persetujuan(array[(select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000003' order by kode desc limit 1)], 1000000) ->> 'jumlah')::int$$,
  array[1], 'owner memeriksa dan menyetujui sekaligus bila belum diperiksa');
select results_eq(
  $$select diperiksa_oleh::text from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000003'$$,
  array['00000000-0000-0000-0000-000000000021'], 'owner tercatat sebagai pemeriksa pada pintasan');
select results_eq(
  $$select (public.setujui_persetujuan(array[
      (select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000004' order by kode desc limit 1),
      (select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000005' order by kode desc limit 1)
    ], 2000000) ->> 'jumlah')::int$$,
  array[2], 'owner menyetujui dua pengajuan sekaligus dengan total dikonfirmasi');
select results_eq(
  $$select count(distinct batch_id)::int from public.approvals where ref_id in ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005')$$,
  array[1], 'setuju massal memberi satu batch yang sama');
select throws_ok(
  $$select public.setujui_persetujuan(array[(select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000005' order by kode desc limit 1)], 1000000)$$,
  'KT001', null, 'pengajuan yang sudah disetujui tidak bisa disetujui lagi');
select throws_ok(
  $$select public.tolak_persetujuan((select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000006' order by kode desc limit 1), '')$$,
  'KT001', null, 'menolak tanpa alasan ditolak');
select lives_ok(
  $$select public.tolak_persetujuan((select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000006' order by kode desc limit 1), 'harga tidak masuk akal')$$,
  'owner menolak PO6 dengan alasan');
select results_eq(
  $$select status_persetujuan from public.v_purchase_orders where id = 'a0000000-0000-0000-0000-000000000006'$$,
  array['ditolak'], 'PO6 berstatus ditolak');
select ok(exists (select 1 from public.activity_log where tabel = 'purchase_orders' and sesudah ->> 'status_persetujuan' = 'disetujui' and sebelum ->> 'status_persetujuan' = 'diajukan'), 'jejak mencatat perubahan status PO');

-- ============================================================ Finance membayar
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000022", "role": "authenticated", "aal": "aal2"}';

select throws_ok(
  $$select public.catat_bayar('a0000000-0000-0000-0000-000000000006', 1000)$$,
  'KT001', null, 'PO yang ditolak tidak bisa dibayar');
select ok(public.catat_bayar('a0000000-0000-0000-0000-000000000001', 1000000, current_date, 'DP') is not null, 'finance mencatat bayar sebagian');
select results_eq(
  $$select status_bayar from public.v_purchase_orders where id = 'a0000000-0000-0000-0000-000000000001'$$,
  array['sebagian'], 'status bayar menjadi sebagian');
select throws_ok(
  $$select public.catat_bayar('a0000000-0000-0000-0000-000000000001', 4000000)$$,
  'KT001', null, 'pembayaran melebihi total PO ditolak');
select ok(public.catat_bayar('a0000000-0000-0000-0000-000000000001', 3500000) is not null, 'pelunasan dicatat');
select results_eq(
  $$select status_bayar from public.v_purchase_orders where id = 'a0000000-0000-0000-0000-000000000001'$$,
  array['lunas'], 'status bayar menjadi lunas');
select throws_ok($$update public.payments set jumlah = 1$$, '42501', null, 'pembayaran tidak bisa diubah');
select throws_ok($$delete from public.payments$$, '42501', null, 'pembayaran tidak bisa dihapus');

-- ============================================================ QC
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000024", "role": "authenticated", "aal": "aal1"}';

select ok(public.terima_po('a0000000-0000-0000-0000-000000000001', 39.5, 'sisa kiriman', false) is not null, 'penerimaan kedua setelah PO disetujui');
select throws_ok(
  $$select public.cek_mutu((select id from public.lots where po_id = 'a0000000-0000-0000-0000-000000000001' order by kode limit 1), 'lulus')$$,
  'KT001', null, 'lulus tanpa kelas ditolak');
select throws_ok(
  $$select public.cek_mutu((select id from public.lots where po_id = 'a0000000-0000-0000-0000-000000000001' order by kode limit 1), 'oke')$$,
  'KT001', null, 'hasil mutu selain lulus atau ditahan ditolak');
select lives_ok(
  $$select public.cek_mutu((select id from public.lots where po_id = 'a0000000-0000-0000-0000-000000000001' order by kode limit 1), 'lulus', (select id from public.grades where kode = 'A-SO'), 'segar')$$,
  'QC meluluskan lot dengan kelas');
select results_eq(
  $$select qc from public.lots where po_id = 'a0000000-0000-0000-0000-000000000001' order by kode limit 1$$,
  array['lulus'], 'lot berstatus lulus');
select lives_ok(
  $$select public.cek_mutu((select id from public.lots where po_id = 'a0000000-0000-0000-0000-000000000001' order by kode desc limit 1), 'ditahan', null, 'suhu tinggi')$$,
  'QC menahan lot kedua');
select throws_ok(
  $$select public.terima_po('a0000000-0000-0000-0000-000000000006', 5, '', true)$$,
  'KT001', null, 'PO ditolak tidak bisa menerima ikan');

-- ============================================================ hasil akhir
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000022", "role": "authenticated", "aal": "aal2"}';
select results_eq(
  $$select status_terima from public.v_purchase_orders where id = 'a0000000-0000-0000-0000-000000000001'$$,
  array['selesai'], 'PO1 selesai diterima (60,5 + 39,5 kg)');

reset role;
set local role anon;
select throws_ok($$select public.ajukan_po('a0000000-0000-0000-0000-000000000001')$$, '42501', null, 'anon tidak bisa memanggil fungsi alur');

select * from finish();
rollback;
