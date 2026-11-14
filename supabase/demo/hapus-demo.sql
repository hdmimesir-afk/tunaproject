-- MENGHAPUS DATA CONTOH yang dibuat seed-demo.sql, dan hanya itu.
--
-- Cara pakai: Supabase Dashboard > SQL Editor > tempel seluruh berkas ini > Run. Sekali jalan, semuanya terhapus atau tidak sama sekali.
-- Jalankan cek-demo.sql dulu buat lihat apa yang bakal dihapus dan apakah ada data asli yang nyangkut.
--
-- Cara mengenali data contoh: seed-demo.sql membuat semuanya dalam satu transaksi, jadi dibuat_pada-nya sama persis dengan
-- siklus "[DEMO]" (timbangan contoh sengaja dimundurkan). Data asli = dibuat lebih dari 1 menit setelahnya. Hanya baris dari waktu itu (plus penanda "(Demo)" / "[DEMO]" / "demo/") yang dihapus.
-- Kalau ada data asli yang terhubung ke data contoh (misalnya produksi asli memakai lot contoh, atau PO asli di proyek contoh),
-- skrip berhenti dengan pesan galat dan TIDAK menghapus apa pun. Data asli tidak pernah ikut terhapus.
--
-- Aplikasi tidak pernah menghapus baris (ada trigger penolak hapus di setiap tabel). Skrip ini mematikan trigger penolak itu
-- hanya untuk tabel yang disentuh, di dalam satu transaksi, lalu menyalakannya lagi sebelum selesai.
-- Jejak perubahan (activity_log) sengaja tidak dihapus: itu catatan audit yang tidak boleh diubah.

do $hapus$
declare
  tabel text[] := array[
    'ledger', 'documents', 'customer_payments', 'service_charges', 'invoices', 'sale_allocations', 'sales_orders',
    'storage_movements', 'storage_units', 'expenses', 'production_items_history', 'production_items', 'production_components', 'production_fish',
    'production_loin_totals', 'lot_allocations', 'lot_grades', 'productions', 'payments', 'approvals', 'lots', 'purchase_orders', 'bookings',
    'cycles', 'suppliers', 'buyers'
  ];
  t text;
  w timestamptz;
  n int;
  contoh text;
  cyc uuid[]; sup uuid[]; buy uuid[]; prd uuid[]; po uuid[]; lot uuid[]; un uuid[]; ord uuid[]; inv uuid[]; ex uuid[]; pay uuid[]; cpay uuid[];
begin
  select min(dibuat_pada) into w from public.cycles where catatan like '[DEMO]%';
  if w is null then
    raise notice 'Tidak ada data contoh yang perlu dihapus.';
    return;
  end if;
  select coalesce(array_agg(id), '{}') into cyc from public.cycles where catatan like '[DEMO]%';
  select coalesce(array_agg(id), '{}') into sup from public.suppliers where nama like '%(Demo)';
  select coalesce(array_agg(id), '{}') into buy from public.buyers where nama like '%(Demo)';
  select coalesce(array_agg(id), '{}') into po from public.purchase_orders where dibuat_pada <= w + interval '1 minute' and (cycle_id = any(cyc) or supplier_id = any(sup));
  select coalesce(array_agg(id), '{}') into lot from public.lots where dibuat_pada <= w + interval '1 minute' and po_id = any(po);
  select coalesce(array_agg(id), '{}') into prd from public.productions where dibuat_pada <= w + interval '1 minute' and cycle_id = any(cyc);
  select coalesce(array_agg(id), '{}') into un from public.storage_units where dibuat_pada <= w + interval '1 minute' and (production_id = any(prd) or buyer_id = any(buy));
  select coalesce(array_agg(id), '{}') into ord from public.sales_orders where dibuat_pada <= w + interval '1 minute' and (cycle_id = any(cyc) or buyer_id = any(buy));
  select coalesce(array_agg(id), '{}') into inv from public.invoices where dibuat_pada <= w + interval '1 minute' and (buyer_id = any(buy) or cycle_id = any(cyc) or order_id = any(ord));
  select coalesce(array_agg(id), '{}') into ex from public.expenses where dibuat_pada <= w + interval '1 minute' and (uraian like '%(Demo)' or cycle_id = any(cyc));
  select coalesce(array_agg(id), '{}') into pay from public.payments where dibuat_pada <= w + interval '1 minute' and po_id = any(po);
  select coalesce(array_agg(id), '{}') into cpay from public.customer_payments where dibuat_pada <= w + interval '1 minute' and invoice_id = any(inv);

  -- Data asli yang terhubung ke data contoh: berhenti, jangan hapus apa pun. Sama dengan bagian "DATA ASLI NYANGKUT" di cek-demo.sql.
  select count(*), string_agg(x, ', ') into n, contoh from (
    select kode as x from public.purchase_orders where dibuat_pada > w + interval '1 minute' and (cycle_id = any(cyc) or supplier_id = any(sup))
    union all select kode from public.lots where dibuat_pada > w + interval '1 minute' and po_id = any(po)
    union all select 'cek mutu ' || l.kode from public.lot_grades lg join public.lots l on l.id = lg.lot_id where lg.dibuat_pada > w + interval '1 minute' and lg.lot_id = any(lot)
    union all select kode from public.productions where dibuat_pada > w + interval '1 minute' and cycle_id = any(cyc)
    union all select p.kode || ' pakai lot contoh' from public.lot_allocations la join public.productions p on p.id = la.production_id where la.dibuat_pada > w + interval '1 minute' and la.lot_id = any(lot)
    union all select distinct 'timbangan ' || p.kode from public.production_items i join public.productions p on p.id = i.production_id where i.dibuat_pada > w + interval '1 minute' and i.production_id = any(prd)
    union all select distinct 'loin total ' || p.kode from public.production_loin_totals x join public.productions p on p.id = x.production_id where x.dibuat_pada > w + interval '1 minute' and x.production_id = any(prd)
    union all select kode from public.storage_units where dibuat_pada > w + interval '1 minute' and (production_id = any(prd) or buyer_id = any(buy) or cycle_id = any(cyc))
    union all select 'gerak stok ' || u.kode from public.storage_movements m join public.storage_units u on u.id = m.unit_id where m.dibuat_pada > w + interval '1 minute' and m.unit_id = any(un)
    union all select kode from public.sales_orders where dibuat_pada > w + interval '1 minute' and (cycle_id = any(cyc) or buyer_id = any(buy))
    union all select o.kode || ' pakai stok contoh' from public.sale_allocations a join public.sales_orders o on o.id = a.order_id where a.dibuat_pada > w + interval '1 minute' and (a.unit_id = any(un) or a.production_id = any(prd))
    union all select kode from public.invoices where dibuat_pada > w + interval '1 minute' and (buyer_id = any(buy) or cycle_id = any(cyc) or order_id = any(ord))
    union all select kode from public.payments where dibuat_pada > w + interval '1 minute' and po_id = any(po)
    union all select kode from public.customer_payments where dibuat_pada > w + interval '1 minute' and invoice_id = any(inv)
    union all select kode from public.expenses where dibuat_pada > w + interval '1 minute' and (cycle_id = any(cyc) or po_id = any(po) or production_id = any(prd))
    union all select kode from public.service_charges where dibuat_pada > w + interval '1 minute' and (unit_id = any(un) or buyer_id = any(buy))
    union all select 'lampiran ' || nama_asli from public.documents where path not like 'demo/%'
      and ref_id = any(po || lot || prd || un || ord || inv || ex || pay || cpay)
  ) s;
  if n > 0 then
    raise exception 'Dibatalkan, tidak ada yang dihapus: % data asli terhubung ke data contoh (%). Jalankan cek-demo.sql dan kirim hasilnya ke developer.', n, contoh;
  end if;

  -- Matikan trigger penolak hapus pada tabel yang disentuh (dinyalakan lagi di akhir, masih di transaksi yang sama).
  foreach t in array tabel loop
    execute format('alter table public.%I disable trigger %I', t, t || '_tolak_hapus');
  end loop;

  delete from public.ledger where (ref_tabel = 'payments' and ref_id = any(pay)) or (ref_tabel = 'customer_payments' and ref_id = any(cpay))
    or (ref_tabel = 'expenses' and ref_id = any(ex));
  delete from public.documents where path like 'demo/%';
  delete from public.customer_payments where id = any(cpay);
  delete from public.service_charges where unit_id = any(un) or buyer_id = any(buy) or invoice_id = any(inv);
  delete from public.invoices where id = any(inv);
  delete from public.sale_allocations where order_id = any(ord) or unit_id = any(un);
  delete from public.sales_orders where id = any(ord);
  delete from public.storage_movements where unit_id = any(un);
  delete from public.storage_units where id = any(un);
  delete from public.expenses where id = any(ex);
  delete from public.production_items_history where production_id = any(prd);
  delete from public.production_items where production_id = any(prd);
  delete from public.production_components where production_id = any(prd);
  delete from public.production_fish where production_id = any(prd);
  delete from public.production_loin_totals where production_id = any(prd);
  delete from public.lot_allocations where production_id = any(prd);
  delete from public.productions where id = any(prd);
  delete from public.payments where id = any(pay);
  delete from public.approvals where ref_tabel = 'purchase_orders' and ref_id = any(po);
  delete from public.lot_grades where lot_id = any(lot);
  delete from public.lots where id = any(lot);
  delete from public.purchase_orders where id = any(po);
  delete from public.bookings where label like '%(Demo)';
  delete from public.cycles where id = any(cyc);
  delete from public.suppliers where id = any(sup);
  delete from public.buyers where id = any(buy);

  foreach t in array tabel loop
    execute format('alter table public.%I enable trigger %I', t, t || '_tolak_hapus');
  end loop;
end;
$hapus$;

-- Sisa data contoh (semua harus 0).
select 'pemasok' as data, count(*)::int as sisa from public.suppliers where nama like '%(Demo)'
union all select 'pembeli', count(*) from public.buyers where nama like '%(Demo)'
union all select 'siklus', count(*) from public.cycles where catatan like '[DEMO]%'
union all select 'biaya', count(*) from public.expenses where uraian like '%(Demo)'
union all select 'dokumen', count(*) from public.documents where path like 'demo/%'
union all select 'jadwal', count(*) from public.bookings where label like '%(Demo)';
