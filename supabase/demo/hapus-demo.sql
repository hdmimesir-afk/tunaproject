-- MENGHAPUS DATA CONTOH yang dibuat seed-demo.sql, dan hanya itu.
--
-- Cara pakai: Supabase Dashboard > SQL Editor > tempel seluruh berkas ini > Run. Sekali jalan, semuanya terhapus atau tidak sama sekali.
--
-- Aplikasi tidak pernah menghapus baris (ada trigger penolak hapus di setiap tabel). Skrip ini mematikan trigger penolak itu
-- hanya untuk tabel yang disentuh, di dalam satu transaksi, lalu menyalakannya lagi sebelum selesai.
-- Yang dihapus ditentukan dari penanda: pemasok/pembeli berakhiran "(Demo)", siklus berawalan "[DEMO]", biaya dan jadwal berakhiran
-- "(Demo)", dokumen berawalan "demo/". Data asli tidak punya penanda ini, jadi tidak tersentuh.
-- Jejak perubahan (activity_log) sengaja tidak dihapus: itu catatan audit yang tidak boleh diubah.

do $hapus$
declare
  tabel text[] := array[
    'ledger', 'documents', 'customer_payments', 'service_charges', 'invoices', 'sale_allocations', 'sales_orders',
    'storage_movements', 'storage_units', 'expenses', 'production_items_history', 'production_items', 'production_components', 'production_fish',
    'lot_allocations', 'productions', 'payments', 'approvals', 'lots', 'purchase_orders', 'bookings', 'cycles', 'suppliers', 'buyers'
  ];
  t text;
  cyc uuid[]; sup uuid[]; buy uuid[]; prd uuid[]; po uuid[]; un uuid[]; ord uuid[]; inv uuid[]; ex uuid[]; pay uuid[]; cpay uuid[];
begin
  select coalesce(array_agg(id), '{}') into cyc from public.cycles where catatan like '[DEMO]%';
  select coalesce(array_agg(id), '{}') into sup from public.suppliers where nama like '%(Demo)';
  select coalesce(array_agg(id), '{}') into buy from public.buyers where nama like '%(Demo)';
  if cardinality(cyc) + cardinality(sup) + cardinality(buy) = 0 then
    raise notice 'Tidak ada data contoh yang perlu dihapus.';
    return;
  end if;
  select coalesce(array_agg(id), '{}') into prd from public.productions where cycle_id = any(cyc);
  select coalesce(array_agg(id), '{}') into po from public.purchase_orders where cycle_id = any(cyc) or supplier_id = any(sup);
  select coalesce(array_agg(id), '{}') into un from public.storage_units where production_id = any(prd) or buyer_id = any(buy);
  select coalesce(array_agg(id), '{}') into ord from public.sales_orders where cycle_id = any(cyc) or buyer_id = any(buy);
  select coalesce(array_agg(id), '{}') into inv from public.invoices where buyer_id = any(buy) or cycle_id = any(cyc) or order_id = any(ord);
  select coalesce(array_agg(id), '{}') into ex from public.expenses where uraian like '%(Demo)' or cycle_id = any(cyc);
  select coalesce(array_agg(id), '{}') into pay from public.payments where po_id = any(po);
  select coalesce(array_agg(id), '{}') into cpay from public.customer_payments where invoice_id = any(inv);

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
  delete from public.lot_allocations where production_id = any(prd);
  delete from public.productions where id = any(prd);
  delete from public.payments where id = any(pay);
  delete from public.approvals where ref_tabel = 'purchase_orders' and ref_id = any(po);
  delete from public.lots where po_id = any(po);
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
