-- MENGHAPUS DATA CONTOH yang dibuat seed-demo.sql. Data yang diisi tim TIDAK PERNAH dihapus.
--
-- Cara pakai (Supabase Dashboard > SQL Editor):
--   1. Tempel seluruh berkas ini > Run. Mode awalnya 'coba': tidak ada yang berubah, cuma tampil rencananya
--      (apa yang dihapus, apa yang dipertahankan, sambungan apa yang dilepas).
--   2. Kalau rencananya udah benar, ganti 'coba' di baris set_config di bawah jadi 'hapus' > Run lagi.
--      Sekali jalan, semuanya berubah atau tidak sama sekali.
--
-- Cara mengenali data contoh: seed-demo.sql membuat semuanya dalam satu transaksi, jadi dibuat_pada-nya sama dengan siklus
-- "[DEMO]" (timbangan contoh sengaja dimundurkan). Baris yang dibuat lebih dari 1 menit setelahnya = data tim.
--
-- Data tim yang dibangun di atas data contoh tetap utuh:
--   - Baris contoh yang WAJIB ada buat data tim ikut dipertahankan (misalnya lot asli diterima lewat PO contoh: PO-nya tetap ada,
--     atau produksi asli memakai lot contoh: lot dan PO-nya tetap ada, atau penjualan asli ke pembeli contoh: pembelinya tetap ada).
--   - Sambungan yang boleh kosong ke data contoh yang dihapus dilepas: proyek contoh (jadi "tanpa proyek"), dan asal produksi
--     contoh pada stok atau penjualan tim. Berat, harga, dan isian tim lainnya tidak diubah.
--   - Sisa berat lot contoh yang dipertahankan dihitung ulang dari pemakaian yang tersisa.
-- Jejak perubahan (activity_log) sengaja tidak dihapus: itu catatan audit yang tidak boleh diubah.

select set_config('demo.mode', 'coba', false);

do $hapus$
declare
  mode text := current_setting('demo.mode', true);
  tabel text[] := array[
    'ledger', 'documents', 'customer_payments', 'service_charges', 'invoices', 'sale_allocations', 'sales_orders',
    'storage_movements', 'storage_units', 'expenses', 'production_items_history', 'production_items', 'production_components', 'production_fish',
    'production_loin_totals', 'lot_allocations', 'lot_grades', 'productions', 'payments', 'approvals', 'lots', 'purchase_orders', 'bookings',
    'cycles', 'suppliers', 'buyers'
  ];
  t text;
  w timestamptz;
  b timestamptz;
  -- Semua data contoh.
  cyc uuid[]; sup uuid[]; buy uuid[]; po uuid[]; lot uuid[]; prd uuid[]; un uuid[]; ord uuid[]; inv uuid[]; ex uuid[]; pay uuid[]; cpay uuid[];
  -- Data contoh yang dipertahankan karena wajib ada buat data tim.
  po_k uuid[]; lot_k uuid[]; prd_k uuid[]; un_k uuid[]; ord_k uuid[]; inv_k uuid[]; sup_k uuid[]; buy_k uuid[];
  -- Data contoh yang dihapus.
  po_d uuid[]; lot_d uuid[]; prd_d uuid[]; un_d uuid[]; ord_d uuid[]; inv_d uuid[]; sup_d uuid[]; buy_d uuid[];
begin
  drop table if exists pg_temp.rencana;
  create temp table rencana (urut int, aksi text, data text, kode text, keterangan text);

  select min(dibuat_pada) into w from public.cycles where catatan like '[DEMO]%';
  if w is null then
    insert into rencana values (0, 'Selesai', '-', '-', 'Tidak ada data contoh yang perlu dihapus.');
    return;
  end if;
  b := w + interval '1 minute';

  -- Transaksi contoh dikenali dari waktunya saja (satu transaksi seed), bukan dari nama pemasok/pembeli,
  -- karena tim bisa saja sudah mengganti nama pemasok/pembeli contoh lalu memakainya untuk data asli.
  -- Pemasok/pembeli contoh hanya dihapus kalau namanya masih berakhiran "(Demo)" dan tidak dipakai data yang tetap ada.
  select coalesce(array_agg(id), '{}') into cyc from public.cycles where catatan like '[DEMO]%';
  select coalesce(array_agg(id), '{}') into sup from public.suppliers where nama like '%(Demo)' and dibuat_pada between w and b;
  select coalesce(array_agg(id), '{}') into buy from public.buyers where nama like '%(Demo)' and dibuat_pada between w and b;
  select coalesce(array_agg(id), '{}') into po from public.purchase_orders where dibuat_pada between w and b;
  select coalesce(array_agg(id), '{}') into lot from public.lots where dibuat_pada between w and b;
  select coalesce(array_agg(id), '{}') into prd from public.productions where dibuat_pada between w and b;
  select coalesce(array_agg(id), '{}') into un from public.storage_units where dibuat_pada between w and b;
  select coalesce(array_agg(id), '{}') into ord from public.sales_orders where dibuat_pada between w and b;
  select coalesce(array_agg(id), '{}') into inv from public.invoices where dibuat_pada between w and b;
  select coalesce(array_agg(id), '{}') into ex from public.expenses where dibuat_pada between w and b;

  -- Yang wajib dipertahankan (kolom wajib di data tim menunjuk ke situ).
  select coalesce(array_agg(distinct x), '{}') into un_k from (
    select unit_id x from public.sale_allocations where dibuat_pada > b and unit_id = any(un)
    union select unit_id from public.storage_movements where dibuat_pada > b and unit_id = any(un)
    union select unit_id from public.service_charges where dibuat_pada > b and unit_id = any(un)) s;
  select coalesce(array_agg(distinct x), '{}') into ord_k from (
    select order_id x from public.sale_allocations where dibuat_pada > b and order_id = any(ord)) s;
  select coalesce(array_agg(distinct x), '{}') into inv_k from (
    select invoice_id x from public.customer_payments where dibuat_pada > b and invoice_id = any(inv)) s;
  select coalesce(array_agg(distinct x), '{}') into prd_k from (
    select production_id x from public.lot_allocations where dibuat_pada > b and production_id = any(prd)
    union select production_id from public.production_items where dibuat_pada > b and production_id = any(prd)
    union select production_id from public.production_loin_totals where dibuat_pada > b and production_id = any(prd)
    union select production_id from public.production_components where dibuat_pada > b and production_id = any(prd)
    union select production_id from public.production_fish where dibuat_pada > b and production_id = any(prd)) s;
  select coalesce(array_agg(distinct x), '{}') into lot_k from (
    select lot_id x from public.lot_allocations where dibuat_pada > b and lot_id = any(lot)
    union select lot_id from public.lot_allocations where production_id = any(prd_k) and lot_id = any(lot)
    union select lot_id from public.lot_grades where dibuat_pada > b and dibuat_oleh is not null and lot_id = any(lot)) s;
  select coalesce(array_agg(distinct x), '{}') into po_k from (
    select po_id x from public.lots where id = any(lot_k)
    union select po_id from public.lots where dibuat_pada > b and po_id = any(po)
    union select po_id from public.payments where dibuat_pada > b and po_id = any(po)) s;

  po_d := array(select unnest(po) except select unnest(po_k));
  lot_d := array(select unnest(lot) except select unnest(lot_k));
  prd_d := array(select unnest(prd) except select unnest(prd_k));
  un_d := array(select unnest(un) except select unnest(un_k));
  ord_d := array(select unnest(ord) except select unnest(ord_k));
  inv_d := array(select unnest(inv) except select unnest(inv_k));

  select coalesce(array_agg(distinct x), '{}') into sup_k from (
    select supplier_id x from public.purchase_orders where supplier_id = any(sup) and not (id = any(po_d))
    union select supplier_id from public.lots where supplier_id = any(sup) and not (id = any(lot_d))) s;
  select coalesce(array_agg(distinct x), '{}') into buy_k from (
    select buyer_id x from public.sales_orders where buyer_id = any(buy) and not (id = any(ord_d))
    union select buyer_id from public.invoices where buyer_id = any(buy) and not (id = any(inv_d))
    union select buyer_id from public.storage_units where buyer_id = any(buy) and not (id = any(un_d))) s;
  sup_d := array(select unnest(sup) except select unnest(sup_k));
  buy_d := array(select unnest(buy) except select unnest(buy_k));

  -- Pembayaran dan uang masuk contoh: uangnya bohongan, jadi dihapus walau PO/invoice-nya dipertahankan.
  select coalesce(array_agg(id), '{}') into pay from public.payments where dibuat_pada between w and b;
  select coalesce(array_agg(id), '{}') into cpay from public.customer_payments where dibuat_pada between w and b and invoice_id = any(inv_d);

  -- ------------------------------------------------------------ rencana
  insert into rencana
  select 1, 'Dipertahankan', 'PO', p.kode, 'dipakai data tim: ' || coalesce((select string_agg(l.kode, ', ') from public.lots l where l.po_id = p.id and (l.dibuat_pada > b or l.id = any(lot_k))), 'pembayaran tim')
    from public.purchase_orders p where p.id = any(po_k)
  union all select 1, 'Dipertahankan', 'Lot', l.kode, 'dipakai data tim: ' || coalesce((select string_agg(distinct pr.kode, ', ') from public.lot_allocations la join public.productions pr on pr.id = la.production_id
      where la.lot_id = l.id and (la.dibuat_pada > b or pr.id = any(prd_k))), 'cek mutu tim')
    from public.lots l where l.id = any(lot_k)
  union all select 1, 'Dipertahankan', 'Produksi', kode, 'diisi tim' from public.productions where id = any(prd_k)
  union all select 1, 'Dipertahankan', 'Stok', kode, 'dipakai penjualan atau gerak stok tim' from public.storage_units where id = any(un_k)
  union all select 1, 'Dipertahankan', 'Pesanan', kode, 'berisi baris dari tim' from public.sales_orders where id = any(ord_k)
  union all select 1, 'Dipertahankan', 'Invoice', kode, 'ada uang masuk dari tim' from public.invoices where id = any(inv_k)
  union all select 1, 'Dipertahankan', 'Pemasok', s.nama, 'dipakai: ' || coalesce((select string_agg(x, ', ') from (
      select kode x from public.purchase_orders where supplier_id = s.id and not (id = any(po_d))
      union select kode from public.lots where supplier_id = s.id and not (id = any(lot_d))) r), '-')
    from public.suppliers s where s.id = any(sup_k)
  union all select 1, 'Dipertahankan', 'Pembeli', y.nama, 'dipakai: ' || coalesce((select string_agg(x, ', ') from (
      select kode x from public.sales_orders where buyer_id = y.id and not (id = any(ord_d))
      union select kode from public.invoices where buyer_id = y.id and not (id = any(inv_d))
      union select kode from public.storage_units where buyer_id = y.id and not (id = any(un_d))) r), '-')
    from public.buyers y where y.id = any(buy_k)
  -- Pemasok/pembeli dari skrip contoh yang namanya sudah diganti tim: dianggap data tim, tidak disentuh.
  union all select 1, 'Dibiarkan', 'Pemasok', nama, 'dibuat skrip contoh, tapi namanya udah diganti tim' from public.suppliers
    where dibuat_pada between w and b and nama not like '%(Demo)'
  union all select 1, 'Dibiarkan', 'Pembeli', nama, 'dibuat skrip contoh, tapi namanya udah diganti tim' from public.buyers
    where dibuat_pada between w and b and nama not like '%(Demo)';

  insert into rencana
  select 2, 'Dilepas', 'PO', p.kode, 'proyek ' || c.kode || ' dilepas' from public.purchase_orders p join public.cycles c on c.id = p.cycle_id where p.cycle_id = any(cyc) and not (p.id = any(po_d))
  union all select 2, 'Dilepas', 'Lot', l.kode, 'proyek ' || c.kode || ' dilepas' from public.lots l join public.cycles c on c.id = l.cycle_id where l.cycle_id = any(cyc) and not (l.id = any(lot_d))
  union all select 2, 'Dilepas', 'Produksi', p.kode, 'proyek ' || c.kode || ' dilepas' from public.productions p join public.cycles c on c.id = p.cycle_id where p.cycle_id = any(cyc) and not (p.id = any(prd_d))
  union all select 2, 'Dilepas', 'Stok', u.kode, 'proyek ' || c.kode || ' dilepas' from public.storage_units u join public.cycles c on c.id = u.cycle_id where u.cycle_id = any(cyc) and not (u.id = any(un_d))
  union all select 2, 'Dilepas', 'Stok', u.kode, 'asal produksi contoh ' || coalesce(u.production_kode, '-') || ' dilepas' from public.storage_units u where u.production_id = any(prd_d) and not (u.id = any(un_d))
  union all select 2, 'Dilepas', 'Pesanan', o.kode, 'proyek ' || c.kode || ' dilepas' from public.sales_orders o join public.cycles c on c.id = o.cycle_id where o.cycle_id = any(cyc) and not (o.id = any(ord_d))
  union all select distinct 2, 'Dilepas', 'Pesanan', o.kode, 'asal produksi contoh di barisnya dilepas' from public.sale_allocations a join public.sales_orders o on o.id = a.order_id
      where a.production_id = any(prd_d) and not (a.order_id = any(ord_d) or a.unit_id = any(un_d))
  union all select 2, 'Dilepas', 'Invoice', i.kode, 'proyek ' || c.kode || ' dilepas' from public.invoices i join public.cycles c on c.id = i.cycle_id where i.cycle_id = any(cyc) and not (i.id = any(inv_d))
  union all select 2, 'Dilepas', 'Biaya', e.kode, 'kaitan ke proyek, PO, atau produksi contoh dilepas' from public.expenses e
      where not (e.id = any(ex)) and (e.cycle_id = any(cyc) or e.po_id = any(po_d) or e.production_id = any(prd_d));

  insert into rencana
  select 3, 'Dihapus', x.data, x.n::text, x.kode from (
    select 'Proyek' data, cardinality(cyc) n, (select string_agg(kode, ', ' order by kode) from public.cycles where id = any(cyc)) kode
    union all select 'PO', cardinality(po_d), (select string_agg(kode, ', ' order by kode) from public.purchase_orders where id = any(po_d))
    union all select 'Lot', cardinality(lot_d), (select string_agg(kode, ', ' order by kode) from public.lots where id = any(lot_d))
    union all select 'Produksi', cardinality(prd_d), (select string_agg(kode, ', ' order by kode) from public.productions where id = any(prd_d))
    union all select 'Stok', cardinality(un_d), (select string_agg(kode, ', ' order by kode) from public.storage_units where id = any(un_d))
    union all select 'Pesanan', cardinality(ord_d), (select string_agg(kode, ', ' order by kode) from public.sales_orders where id = any(ord_d))
    union all select 'Invoice', cardinality(inv_d), (select string_agg(kode, ', ' order by kode) from public.invoices where id = any(inv_d))
    union all select 'Biaya', cardinality(ex), (select string_agg(kode, ', ' order by kode) from public.expenses where id = any(ex))
    union all select 'Pembayaran ke pemasok', cardinality(pay), (select string_agg(kode, ', ' order by kode) from public.payments where id = any(pay))
    union all select 'Uang masuk', cardinality(cpay), (select string_agg(kode, ', ' order by kode) from public.customer_payments where id = any(cpay))
    union all select 'Pemasok', cardinality(sup_d), (select string_agg(nama, ', ' order by nama) from public.suppliers where id = any(sup_d))
    union all select 'Pembeli', cardinality(buy_d), (select string_agg(nama, ', ' order by nama) from public.buyers where id = any(buy_d))
  ) x;

  if mode is distinct from 'hapus' then
    insert into rencana values (0, 'MODE COBA', '-', '-', 'Belum ada yang berubah. Kalau rencana di bawah udah benar, ganti ''coba'' jadi ''hapus'' di baris set_config, lalu Run lagi.');
    return;
  end if;

  -- ------------------------------------------------------------ jalankan
  foreach t in array tabel loop
    execute format('alter table public.%I disable trigger %I', t, t || '_tolak_hapus');
  end loop;

  -- Lepas sambungan yang boleh kosong dari data yang tetap ada ke data contoh yang dihapus.
  update public.purchase_orders set cycle_id = null where cycle_id = any(cyc) and not (id = any(po_d));
  update public.lots set cycle_id = null where cycle_id = any(cyc) and not (id = any(lot_d));
  update public.productions set cycle_id = null where cycle_id = any(cyc) and not (id = any(prd_d));
  update public.storage_units set cycle_id = null where cycle_id = any(cyc) and not (id = any(un_d));
  update public.storage_units set production_id = null, production_kode = null where production_id = any(prd_d) and not (id = any(un_d));
  update public.sales_orders set cycle_id = null where cycle_id = any(cyc) and not (id = any(ord_d));
  update public.sale_allocations set production_id = null where production_id = any(prd_d) and not (order_id = any(ord_d) or unit_id = any(un_d));
  update public.invoices set cycle_id = null where cycle_id = any(cyc) and not (id = any(inv_d));
  update public.invoices set order_id = null where order_id = any(ord_d) and not (id = any(inv_d));
  update public.expenses set cycle_id = null where cycle_id = any(cyc) and not (id = any(ex));
  update public.expenses set po_id = null where po_id = any(po_d) and not (id = any(ex));
  update public.expenses set production_id = null where production_id = any(prd_d) and not (id = any(ex));
  update public.service_charges set invoice_id = null where invoice_id = any(inv_d) and not (unit_id = any(un_d));
  update public.ledger set cycle_id = null where cycle_id = any(cyc)
    and not ((ref_tabel = 'payments' and ref_id = any(pay)) or (ref_tabel = 'customer_payments' and ref_id = any(cpay)) or (ref_tabel = 'expenses' and ref_id = any(ex)));

  delete from public.ledger where (ref_tabel = 'payments' and ref_id = any(pay)) or (ref_tabel = 'customer_payments' and ref_id = any(cpay))
    or (ref_tabel = 'expenses' and ref_id = any(ex));
  delete from public.documents where path like 'demo/%';
  delete from public.customer_payments where id = any(cpay);
  delete from public.service_charges where unit_id = any(un_d);
  delete from public.invoices where id = any(inv_d);
  delete from public.sale_allocations where order_id = any(ord_d) or unit_id = any(un_d);
  delete from public.sales_orders where id = any(ord_d);
  delete from public.storage_movements where unit_id = any(un_d);
  delete from public.storage_units where id = any(un_d);
  delete from public.expenses where id = any(ex);
  delete from public.production_items_history where production_id = any(prd_d);
  delete from public.production_items where production_id = any(prd_d);
  delete from public.production_components where production_id = any(prd_d);
  delete from public.production_fish where production_id = any(prd_d);
  delete from public.production_loin_totals where production_id = any(prd_d);
  delete from public.lot_allocations where production_id = any(prd_d);
  delete from public.productions where id = any(prd_d);
  delete from public.payments where id = any(pay);
  delete from public.approvals where ref_tabel = 'purchase_orders' and ref_id = any(po_d);
  delete from public.lot_grades where lot_id = any(lot_d);
  delete from public.lots where id = any(lot_d);
  delete from public.purchase_orders where id = any(po_d);
  delete from public.bookings where label like '%(Demo)' and dibuat_pada between w and b;
  delete from public.cycles where id = any(cyc);
  delete from public.suppliers where id = any(sup_d);
  delete from public.buyers where id = any(buy_d);

  -- Sisa berat lot contoh yang dipertahankan: berat lot dikurangi pemakaian yang tersisa (pemakaian produksi contoh sudah terhapus).
  update public.lots l set sisa_kg = l.kg - coalesce((select sum(la.kg) from public.lot_allocations la where la.lot_id = l.id), 0)
    where l.id = any(lot_k);

  foreach t in array tabel loop
    execute format('alter table public.%I enable trigger %I', t, t || '_tolak_hapus');
  end loop;
  insert into rencana values (0, 'SELESAI', '-', '-', 'Data contoh udah dihapus sesuai rencana di bawah.');
end;
$hapus$;

select aksi, data, kode, keterangan from pg_temp.rencana order by urut, data, kode;
