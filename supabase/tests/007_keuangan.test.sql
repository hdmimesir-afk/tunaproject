-- Fase 5b · Biaya dengan nota, buku kas, laba rugi siklus, harga beli, ringkasan harian, dashboard. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000061', 'owner7@uji.local'),
  ('00000000-0000-0000-0000-000000000062', 'finance7@uji.local'),
  ('00000000-0000-0000-0000-000000000063', 'petugas7@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-000000000061';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance Uji' where user_id = '00000000-0000-0000-0000-000000000062';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas Uji' where user_id = '00000000-0000-0000-0000-000000000063';

insert into public.cycles (id, ref_po_pembeli) values ('c2000000-0000-0000-0000-000000000071', 'PO-UJI-7');
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000007', 'Pemasok Keuangan Uji');
insert into public.buyers (id, nama) values ('b1000000-0000-0000-0000-000000000071', 'Pembeli Keuangan Uji');

-- Dua PO disetujui (harga berbeda) dengan lot pada hari yang sama untuk uji harga rata-rata tertimbang; PO pertama masuk siklus uji.
insert into public.purchase_orders (id, supplier_id, cycle_id, kg, harga_per_kg, status_persetujuan) values
  ('a0000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000071', 100, 45000, 'disetujui'),
  ('a0000000-0000-0000-0000-000000000072', '10000000-0000-0000-0000-000000000007', null, 50, 47000, 'disetujui');
insert into public.lots (id, kode, po_id, po_kode, supplier_id, cycle_id, tanggal_terima, kg, sisa_kg, qc, grade_id) values
  ('c0000000-0000-0000-0000-000000000071', 'LOT-K71', 'a0000000-0000-0000-0000-000000000071', 'PO-K71', '10000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000071', date '2026-05-04', 100, 100, 'lulus', (select id from public.grades where kode = 'A-SO')),
  ('c0000000-0000-0000-0000-000000000072', 'LOT-K72', 'a0000000-0000-0000-0000-000000000072', 'PO-K72', '10000000-0000-0000-0000-000000000007', null, date '2026-05-04', 50, 50, 'lulus', (select id from public.grades where kode = 'A-SO'));
-- PO tanpa nota -> terhitung di "dokumen kurang".
-- Penjualan terkirim di siklus uji: loin Rp2.000.000 dan hasil samping Rp100.000.
insert into public.storage_units (id, kode, product_id, product_nama, kondisi, kg_masuk, sisa_kg, sisa_dasar_masuk, status)
values ('f0000000-0000-0000-0000-000000000071', 'STK-K71', (select id from public.products where nama = 'Loin tuna'), 'Loin tuna', 'beku', 50, 0, 0, 'habis');
insert into public.sales_orders (id, buyer_id, buyer_nama, cycle_id, status, dikirim_pada) values
  ('d3000000-0000-0000-0000-000000000071', 'b1000000-0000-0000-0000-000000000071', 'Pembeli Keuangan Uji', 'c2000000-0000-0000-0000-000000000071', 'terkirim', now());
insert into public.sale_allocations (order_id, unit_id, unit_kode, product_nama, kelompok, kg_pesan, harga_per_kg, kg_kirim) values
  ('d3000000-0000-0000-0000-000000000071', 'f0000000-0000-0000-0000-000000000071', 'STK-K71', 'Loin tuna', 'loin', 20, 100000, 20),
  ('d3000000-0000-0000-0000-000000000071', 'f0000000-0000-0000-0000-000000000071', 'STK-K71', 'Toro', 'hasil_samping', 5, 20000, 5);
insert into public.invoices (id, jenis, buyer_id, buyer_nama, order_id, cycle_id, jatuh_tempo, total)
values ('e3000000-0000-0000-0000-000000000071', 'penjualan', 'b1000000-0000-0000-0000-000000000071', 'Pembeli Keuangan Uji', 'd3000000-0000-0000-0000-000000000071', 'c2000000-0000-0000-0000-000000000071', current_date + 14, 2100000);

-- ============================================================ Buku kas otomatis (sistem)
insert into public.payments (po_id, jumlah) values ('a0000000-0000-0000-0000-000000000071', 1000000);
insert into public.customer_payments (invoice_id, jumlah) values ('e3000000-0000-0000-0000-000000000071', 600000);
select is((select arah || ':' || jumlah::text from public.ledger where ref_tabel = 'payments'), 'keluar:1000000.00', 'bayar pemasok masuk buku kas sebagai uang keluar');
select is((select arah || ':' || jumlah::text from public.ledger where ref_tabel = 'customer_payments'), 'masuk:600000.00', 'bayar pembeli masuk buku kas sebagai uang masuk');
select is((select cycle_id::text from public.ledger where ref_tabel = 'customer_payments'), 'c2000000-0000-0000-0000-000000000071', 'baris kas membawa siklus');

-- ============================================================ Finance
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000062", "role": "authenticated", "aal": "aal2"}';

select lives_ok(
  $$select public.simpan_biaya(null, (select id from public.expense_categories where nama = 'Pengemasan dan pengiriman'), 'Ongkos kargo siklus uji', 500000, current_date, 'c2000000-0000-0000-0000-000000000071')$$,
  'finance membuat biaya draf');
select throws_ok(
  $$select public.ajukan_biaya((select id from public.expenses where uraian = 'Ongkos kargo siklus uji'))$$,
  'KT001', null, 'biaya yang mewajibkan nota tidak bisa diajukan tanpa nota');
select lives_ok(
  $$insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe) values ('expenses', (select id from public.expenses where uraian = 'Ongkos kargo siklus uji'), 'nota', 'biaya/uji/nota.jpg', 'nota.jpg', 1000, 'image/jpeg')$$,
  'finance melampirkan nota biaya');
select lives_ok($$select public.ajukan_biaya((select id from public.expenses where uraian = 'Ongkos kargo siklus uji'))$$, 'biaya dengan nota bisa diajukan');
select throws_ok($$select public.putuskan_biaya((select id from public.expenses where uraian = 'Ongkos kargo siklus uji'), true)$$, '42501', null, 'finance tidak boleh menyetujui biaya');
select is((select count(*)::int from public.ledger where ref_tabel = 'expenses'), 0, 'biaya yang belum disetujui belum masuk buku kas');
select throws_ok($$insert into public.expenses (category_id, kategori_nama, uraian, jumlah) values ((select id from public.expense_categories limit 1), 'x', 'langsung', 1)$$, '42501', null, 'biaya tidak bisa ditulis langsung');
select throws_ok($$insert into public.ledger (tanggal, arah, kategori_nama, uraian, jumlah) values (current_date, 'masuk', 'x', 'langsung', 1)$$, '42501', null, 'buku kas tidak bisa ditulis langsung');
select throws_ok($$delete from public.ledger$$, '42501', null, 'buku kas tidak bisa dihapus');

-- Kategori yang tidak mewajibkan nota.
reset role;
update public.expense_categories set nota_wajib = false where nama = 'Operasional rutin';
set local role authenticated;
select lives_ok($$select public.simpan_biaya(null, (select id from public.expense_categories where nama = 'Operasional rutin'), 'Parkir', 20000, current_date, null)$$, 'biaya kecil tanpa nota wajib dibuat');
select lives_ok($$select public.ajukan_biaya((select id from public.expenses where uraian = 'Parkir'))$$, 'kategori tanpa nota wajib bisa diajukan tanpa nota');

-- ============================================================ Petugas
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000063", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.simpan_biaya(null, (select id from public.expense_categories limit 1), 'tidak boleh', 1000, current_date, null)$$, '42501', null, 'petugas tidak boleh mencatat biaya');
select is((select biaya_ikan::text from public.v_laba_rugi_siklus where cycle_id = 'c2000000-0000-0000-0000-000000000071'), '0.00', 'petugas tidak melihat biaya pembelian ikan (RLS PO tetap berlaku di dalam view)');

-- ============================================================ Owner
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000061", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.putuskan_biaya((select id from public.expenses where uraian = 'Parkir'), false, '')$$, 'KT001', null, 'menolak biaya butuh alasan');
select lives_ok($$select public.putuskan_biaya((select id from public.expenses where uraian = 'Parkir'), false, 'tidak perlu')$$, 'Owner menolak biaya');
select lives_ok($$select public.putuskan_biaya((select id from public.expenses where uraian = 'Ongkos kargo siklus uji'), true)$$, 'Owner menyetujui biaya');
select is((select arah || ':' || jumlah::text || ':' || kategori_nama from public.ledger where ref_tabel = 'expenses'), 'keluar:500000.00:Pengemasan dan pengiriman', 'biaya yang disetujui masuk buku kas');
select throws_ok($$select public.putuskan_biaya((select id from public.expenses where uraian = 'Ongkos kargo siklus uji'), true)$$, 'KT001', null, 'biaya yang sudah diputuskan tidak bisa diputuskan lagi');

-- Laba rugi siklus: pendapatan 2.100.000, biaya ikan 4.500.000 + kargo 500.000.
select is((select pendapatan_total::text from public.v_laba_rugi_siklus where kode = (select kode from public.cycles where id = 'c2000000-0000-0000-0000-000000000071')), '2100000.00', 'pendapatan siklus dari penjualan terkirim');
select is((select pendapatan_loin::text || '/' || pendapatan_samping::text from public.v_laba_rugi_siklus where cycle_id = 'c2000000-0000-0000-0000-000000000071'), '2000000.00/100000.00', 'pendapatan dipisah loin dan hasil samping');
select is((select biaya_total::text from public.v_laba_rugi_siklus where cycle_id = 'c2000000-0000-0000-0000-000000000071'), '5000000.00', 'biaya siklus = ikan dari PO disetujui + biaya disetujui');
select is((select laba_kotor::text from public.v_laba_rugi_siklus where cycle_id = 'c2000000-0000-0000-0000-000000000071'), '-2900000.00', 'laba kotor = pendapatan - biaya (boleh rugi)');

-- Harga beli rata-rata tertimbang: (100 x 45.000 + 50 x 47.000) / 150.
select is((select kg::text || '/' || nilai::text from public.v_harga_beli where tanggal = date '2026-05-04' and supplier_id = '10000000-0000-0000-0000-000000000007'), '150.000/6850000.00', 'kg dan nilai harga beli per hari, pemasok, grade');

-- Penelusuran dan ringkasan.
select is((select jumlah_po::text || ':' || nilai_beli::text || ':' || uang_masuk::text from public.v_rincian_siklus where cycle_id = 'c2000000-0000-0000-0000-000000000071'), '1:4500000.00:600000.00', 'rincian siklus: PO, nilai beli, dan uang masuk');
select is((select uang_masuk::text from public.v_ringkasan_harian where tanggal = current_date), '600000.00', 'ringkasan harian: uang masuk hari ini');
select is((select piutang::text from public.v_dashboard), '1500000.00', 'dashboard: piutang = invoice dikurangi pembayaran');
select ok((select dokumen_kurang from public.v_dashboard) >= 3, 'dashboard menghitung transaksi tanpa bukti (PO tanpa nota, pembayaran tanpa bukti)');
select ok((select hutang_pemasok from public.v_dashboard) > 0, 'dashboard: hutang pemasok dari PO disetujui yang belum lunas');

select * from finish();
rollback;
