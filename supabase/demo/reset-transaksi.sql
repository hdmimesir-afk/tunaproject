-- RESET SEMUA TRANSAKSI. Dipakai sekali sebelum sistem mulai dipakai beneran, buat buang data latihan dan training.
--
-- Yang DIHAPUS: proyek, PO, persetujuan, bayar ke pemasok, lot dan cek mutu, produksi dan timbangannya, stok dan titipan,
--   pindah/ambil/koreksi stok, tagihan jasa gudang, pesanan jual, invoice, uang masuk, biaya, buku kas (termasuk 235 catatan
--   impor Monitor Dana), tutup buku, jadwal ABF/produksi, absen dan izin, gerakan stok barang penunjang, dan baris lampirannya.
-- Yang TETAP: akun dan jabatan, tugas per peran, pemasok, pembeli, produk, grade, hasil samping, kategori biaya, lampiran wajib,
--   target hasil, ruangan gudang, tarif, mitra, lokasi kerja absensi, dan daftar barang penunjang (stoknya jadi 0).
-- Nomor kode mulai lagi dari awal (PO-0001, LOT-001, PRD-001, SIK-0001, ...).
-- Jejak perubahan (activity_log) sengaja nggak dihapus. Berkas foto dan nota di penyimpanan juga nggak dihapus, cuma
--   baris lampirannya, jadi nggak muncul lagi di aplikasi.
--
-- Cara pakai (Supabase Dashboard > SQL Editor):
--   1. Tempel seluruh berkas ini > Run. Mode awalnya 'coba': nggak ada yang berubah, cuma tampil jumlah data yang bakal dihapus.
--   2. Kalau udah yakin, ganti 'coba' jadi 'hapus' di baris set_config di bawah > Run lagi.
--      Sekali jalan, semuanya kehapus atau nggak sama sekali.

select set_config('reset.mode', 'coba', false);

do $reset$
declare
  mode text := current_setting('reset.mode', true);
  -- Urutan cuma buat tampilan; TRUNCATE ngehapus semuanya sekaligus.
  tabel text[][] := array[
    ['cycles', 'Proyek'], ['purchase_orders', 'PO'], ['approvals', 'Persetujuan'], ['payments', 'Bayar ke pemasok'],
    ['lots', 'Lot'], ['lot_grades', 'Grade lot'], ['productions', 'Produksi'], ['lot_allocations', 'Pemakaian lot'],
    ['production_fish', 'Ekor produksi'], ['production_items', 'Timbangan loin'], ['production_items_history', 'Riwayat timbangan'],
    ['production_loin_totals', 'Loin total per grade'], ['production_components', 'Hasil samping dan limbah'],
    ['storage_units', 'Stok dan titipan'], ['storage_movements', 'Gerakan stok'], ['service_charges', 'Tagihan jasa gudang'],
    ['sales_orders', 'Pesanan jual'], ['sale_allocations', 'Isi pesanan'], ['invoices', 'Invoice'], ['customer_payments', 'Uang masuk'],
    ['expenses', 'Biaya'], ['ledger', 'Buku kas'], ['accounting_periods', 'Tutup buku'], ['bookings', 'Jadwal ABF dan produksi'],
    ['attendance', 'Absen'], ['leave_requests', 'Izin dan sakit'], ['supply_movements', 'Gerakan barang penunjang'],
    ['documents', 'Lampiran']
  ];
  urutan text[] := array[
    'po_kode_seq', 'lot_kode_seq', 'approval_kode_seq', 'payment_kode_seq', 'production_kode_seq', 'storage_unit_kode_seq',
    'service_charge_kode_seq', 'sales_order_kode_seq', 'invoice_kode_seq', 'customer_payment_kode_seq', 'expense_kode_seq',
    'ledger_kode_seq', 'cycles_kode_seq'
  ];
  i int;
  n bigint;
  daftar text := '';
  s text;
begin
  drop table if exists pg_temp.hasil;
  create temp table hasil (urut int, data text, jumlah bigint, keterangan text);

  for i in 1 .. array_length(tabel, 1) loop
    execute format('select count(*) from public.%I', tabel[i][1]) into n;
    insert into hasil values (i, tabel[i][2], n, '');
    daftar := daftar || case when i > 1 then ', ' else '' end || format('public.%I', tabel[i][1]);
  end loop;
  insert into hasil values (100, 'Catatan Monitor Dana di buku kas', (select count(*) from public.ledger where sumber = 'impor'), 'sudah termasuk di Buku kas');

  if mode = 'hapus' then
    execute 'truncate ' || daftar;
    foreach s in array urutan loop
      execute format('alter sequence public.%I restart with 1', s);
    end loop;
    update hasil set keterangan = 'dihapus';
    insert into hasil values (0, 'SELESAI', null, 'Semua transaksi udah dihapus. Kode mulai lagi dari 0001.');
  else
    update hasil set keterangan = 'bakal dihapus' where urut < 100;
    insert into hasil values (0, 'MODE COBA', null, 'Belum ada yang berubah. Kalau udah yakin, ganti ''coba'' jadi ''hapus'' di baris set_config, lalu Run lagi.');
  end if;
end;
$reset$;

select data, jumlah, keterangan from pg_temp.hasil order by urut;
