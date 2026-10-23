-- Tutup buku per periode: urutan, syarat, kunci di database, dan buka kembali. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000081', 'owner9@uji.local'),
  ('00000000-0000-0000-0000-000000000082', 'finance9@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-000000000081';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance Uji' where user_id = '00000000-0000-0000-0000-000000000082';

insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000009', 'Pemasok Periode Uji');
insert into public.purchase_orders (id, supplier_id, kg, harga_per_kg, status_persetujuan)
values ('a0000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000009', 10, 1000, 'disetujui');
insert into public.buyers (id, nama) values ('b1000000-0000-0000-0000-000000000091', 'Pembeli Periode Uji');
insert into public.invoices (id, jenis, buyer_id, buyer_nama, jatuh_tempo, total)
values ('e3000000-0000-0000-0000-000000000091', 'penjualan', 'b1000000-0000-0000-0000-000000000091', 'Pembeli Periode Uji', date '2026-03-01', 500000);

-- Buku kas Januari (masuk 1.000.000, keluar 400.000) dan Februari (keluar 100.000).
insert into public.ledger (tanggal, arah, kategori_nama, uraian, jumlah, sumber) values
  (date '2026-01-10', 'masuk', 'Penerimaan penjualan', 'uji masuk jan', 1000000, 'impor'),
  (date '2026-01-20', 'keluar', 'Operasional rutin', 'uji keluar jan', 400000, 'impor'),
  (date '2026-02-05', 'keluar', 'Operasional rutin', 'uji keluar feb', 100000, 'impor');
-- Satu biaya Februari menunggu keputusan Owner (kategori mewajibkan nota).
insert into public.expenses (id, category_id, kategori_nama, uraian, jumlah, tanggal, status, diajukan_oleh)
values ('d4000000-0000-0000-0000-000000000091', (select id from public.expense_categories where nama = 'Operasional rutin'), 'Operasional rutin', 'biaya feb menunggu', 50000, date '2026-02-10', 'diajukan', '00000000-0000-0000-0000-000000000081');

-- ============================================================ Finance
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000082", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.tutup_periode(date '2026-01-01')$$, '42501', null, 'finance tidak boleh menutup buku');
select is((select count(*)::int from public.v_buku_bulanan where bulan = date '2026-01-01'), 1, 'finance melihat rekap bulanan');

-- ============================================================ Owner
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000081", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.tutup_periode(date '2026-02-01')$$, 'KT001', null, 'harus menutup bulan tertua dulu (Januari)');
select throws_ok($$select public.tutup_periode(date_trunc('month', current_date)::date)$$, 'KT001', null, 'bulan berjalan belum bisa ditutup');
select is((public.tutup_periode(date '2026-01-15') ->> 'saldo_akhir'), '600000.00', 'Januari ditutup: saldo akhir = masuk - keluar');
select is((select status from public.v_buku_bulanan where bulan = date '2026-01-01'), 'ditutup', 'status Januari ditutup');
select throws_ok($$select public.tutup_periode(date '2026-01-01')$$, 'KT001', null, 'bulan yang sudah ditutup tidak bisa ditutup lagi');
select is((select saldo_awal::text from public.v_buku_bulanan where bulan = date '2026-02-01'), '600000.00', 'saldo awal Februari = saldo akhir Januari');

-- Februari: biaya menunggu keputusan menahan penutupan.
select throws_ok($$select public.tutup_periode(date '2026-02-01')$$, 'KT001', null, 'biaya yang masih menunggu keputusan menahan penutupan');
select lives_ok($$select public.putuskan_biaya('d4000000-0000-0000-0000-000000000091', true)$$, 'Owner menyetujui biaya Februari');
select throws_ok($$select public.tutup_periode(date '2026-02-01')$$, 'KT001', null, 'transaksi tanpa nota harus diakui dengan sadar');
select is((public.tutup_periode(date '2026-02-01', 'ditutup dengan 1 nota menyusul', true) ->> 'tanpa_bukti'), '1', 'Februari ditutup dan mencatat jumlah transaksi tanpa bukti');

-- ============================================================ Kunci periode (berlaku juga untuk sistem)
reset role;
select throws_ok($$insert into public.payments (po_id, jumlah, tanggal) values ('a0000000-0000-0000-0000-000000000091', 1000, date '2026-01-15')$$, 'KT001', null, 'pembayaran pemasok bertanggal Januari ditolak');
select throws_ok($$insert into public.customer_payments (invoice_id, jumlah, tanggal) values ('e3000000-0000-0000-0000-000000000091', 1000, date '2026-02-15')$$, 'KT001', null, 'pembayaran pembeli bertanggal Februari ditolak');
select throws_ok($$insert into public.ledger (tanggal, arah, kategori_nama, uraian, jumlah) values (date '2026-01-31', 'keluar', 'x', 'lewat pintu belakang', 1)$$, 'KT001', null, 'buku kas bertanggal di bulan tertutup ditolak');
select throws_ok($$insert into public.expenses (category_id, kategori_nama, uraian, jumlah, tanggal) values ((select id from public.expense_categories limit 1), 'x', 'backdate', 1, date '2026-01-02')$$, 'KT001', null, 'biaya bertanggal di bulan tertutup ditolak');
select lives_ok($$insert into public.payments (po_id, jumlah, tanggal) values ('a0000000-0000-0000-0000-000000000091', 1000, date '2026-03-02')$$, 'transaksi di bulan yang masih terbuka tetap boleh');

-- ============================================================ Buka kembali
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000081", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.buka_kembali_periode(date '2026-01-01', 'koreksi')$$, 'KT001', null, 'buka kembali harus dari bulan terbaru (Februari dulu)');
select throws_ok($$select public.buka_kembali_periode(date '2026-02-01', '')$$, 'KT001', null, 'buka kembali butuh alasan');
select lives_ok($$select public.buka_kembali_periode(date '2026-02-01', 'nota menyusul sudah ada')$$, 'Februari dibuka kembali dengan alasan');
select lives_ok($$select public.buka_kembali_periode(date '2026-01-01', 'koreksi jumlah')$$, 'lalu Januari dibuka kembali');
select is((select dibuka_kali::text || ':' || alasan_buka from public.accounting_periods where bulan = date '2026-01-01'), '1:koreksi jumlah', 'jumlah dan alasan buka kembali tercatat');
reset role;
select lives_ok($$insert into public.ledger (tanggal, arah, kategori_nama, uraian, jumlah) values (date '2026-01-31', 'keluar', 'x', 'koreksi setelah dibuka', 1)$$, 'setelah dibuka kembali, transaksi bisa ditambahkan');

select * from finish();
rollback;
