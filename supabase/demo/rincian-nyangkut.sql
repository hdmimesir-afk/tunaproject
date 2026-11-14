-- RINCIAN DATA ASLI YANG NYANGKUT KE DATA CONTOH. Hanya membaca, tidak mengubah apa pun.
-- Dipakai buat ngecek data tim yang dibangun di atas data contoh, sebelum atau sesudah hapus-demo.sql.
-- Cara pakai: Supabase Dashboard > SQL Editor > tempel seluruh berkas ini > Run, lalu kirim hasilnya ke developer.
-- "Asli" = dibuat lebih dari 1 menit setelah data contoh. Grade lot hasil migrasi (dibuat_oleh kosong) tidak dihitung.

with
t as (select min(dibuat_pada) + interval '1 minute' as batas from public.cycles where catatan like '[DEMO]%'),
cyc as (select id from public.cycles where catatan like '[DEMO]%'),
sup as (select id from public.suppliers where nama like '%(Demo)'),
po as (select id from public.purchase_orders, t where dibuat_pada <= t.batas and (cycle_id in (select id from cyc) or supplier_id in (select id from sup))),
lot as (select id from public.lots, t where dibuat_pada <= t.batas and po_id in (select id from po)),
prd as (select id from public.productions, t where dibuat_pada <= t.batas and cycle_id in (select id from cyc)),
nama as (select user_id, coalesce(nullif(nama, ''), email) as nama from public.profiles),
prd_asli as (
  select p.* from public.productions p, t where p.dibuat_pada > t.batas
    and (p.cycle_id in (select id from cyc) or exists (select 1 from public.lot_allocations la where la.production_id = p.id and la.lot_id in (select id from lot)))
)
select * from (
  -- 1. Produksi asli: lot yang dipakai (contoh atau asli), hasil, dan siapa yang input.
  select 1 as urut, 'Produksi asli' as bagian, p.kode,
    to_char(p.tanggal, 'DD-MM-YYYY') || ' · ' || p.status || ' · proyek ' || coalesce(c.kode, '-')
    || ' · lot: ' || coalesce((select string_agg(la.lot_kode || case when la.lot_id in (select id from lot) then ' (CONTOH) ' else ' ' end || la.kg::text || ' kg', ', ')
         from public.lot_allocations la where la.production_id = p.id), '-')
    || ' · loin ' || coalesce(v.loin_kg::text, '0') || ' kg · input ' || coalesce(n.nama, '-') as rincian
  from prd_asli p left join public.cycles c on c.id = p.cycle_id left join public.v_productions v on v.id = p.id left join nama n on n.user_id = p.dibuat_oleh
  -- 2. Lot asli yang diterima lewat PO contoh.
  union all
  select 2, 'Lot asli dari PO contoh', l.kode,
    l.po_kode || ' · ' || l.kg::text || ' kg · terima ' || to_char(l.tanggal_terima, 'DD-MM-YYYY') || ' · ' || l.qc
    || ' · input ' || coalesce(n.nama, '-')
  from public.lots l left join nama n on n.user_id = l.dibuat_oleh, t where l.dibuat_pada > t.batas and l.po_id in (select id from po)
  -- 3. Lot contoh yang dicek mutu oleh tim.
  union all
  select 3, 'Cek mutu tim di lot contoh', l.kode,
    string_agg(g.kode || ' ' || lg.kg::text || ' kg', ', ') || ' · input ' || coalesce(min(n.nama), '-')
  from public.lot_grades lg join public.lots l on l.id = lg.lot_id join public.grades g on g.id = lg.grade_id left join nama n on n.user_id = lg.dibuat_oleh, t
  where lg.dibuat_pada > t.batas and lg.dibuat_oleh is not null and lg.lot_id in (select id from lot) group by l.kode
  -- 4. Stok asli yang asalnya dari produksi atau proyek contoh / produksi asli di atas.
  union all
  select 4, 'Stok asli', u.kode,
    u.product_nama || coalesce(' ' || u.grade_kode, '') || ' ' || u.kondisi || ' · masuk ' || u.kg_masuk::text || ' kg · sisa ' || u.sisa_kg::text
    || ' kg · dari ' || coalesce(u.production_kode, '-') || ' · input ' || coalesce(n.nama, '-')
  from public.storage_units u left join nama n on n.user_id = u.dibuat_oleh, t
  where u.dibuat_pada > t.batas and (u.production_id in (select id from prd) or u.production_id in (select id from prd_asli) or u.cycle_id in (select id from cyc))
  -- 5. Penjualan asli yang ngambil stok contoh atau stok dari produksi di atas.
  union all
  select 5, 'Penjualan asli', o.kode,
    o.buyer_nama || ' · ' || to_char(o.tanggal, 'DD-MM-YYYY') || ' · ' || o.status
    || ' · stok: ' || string_agg(coalesce(u.kode, '-') || ' ' || a.kg_pesan::text || ' kg', ', ')
    || ' · invoice ' || coalesce((select string_agg(i.kode, ', ') from public.invoices i where i.order_id = o.id), '-')
    || ' · input ' || coalesce(min(n.nama), '-')
  from public.sale_allocations a join public.sales_orders o on o.id = a.order_id left join public.storage_units u on u.id = a.unit_id
    left join nama n on n.user_id = o.dibuat_oleh, t
  where a.dibuat_pada > t.batas
    and (a.unit_id in (select id from public.storage_units where production_id in (select id from prd) or production_id in (select id from prd_asli))
      or a.production_id in (select id from prd) or a.production_id in (select id from prd_asli))
  group by o.id, o.kode, o.buyer_nama, o.tanggal, o.status
  -- 6. Pembanding: semua PO dan lot asli lain (yang tidak terhubung ke data contoh).
  union all
  select 6, 'PO asli lain', p.kode,
    coalesce(s.nama, '-') || ' · ' || p.kg::text || ' kg · ' || p.status_persetujuan || ' · ' || to_char(p.tanggal, 'DD-MM-YYYY')
  from public.purchase_orders p left join public.suppliers s on s.id = p.supplier_id, t
  where p.dibuat_pada > t.batas and p.id not in (select id from po) and coalesce(p.cycle_id::text, '') not in (select id::text from cyc)
  union all
  select 7, 'Lot asli lain', l.kode,
    l.po_kode || ' · ' || l.kg::text || ' kg · sisa ' || l.sisa_kg::text || ' kg · ' || l.qc
  from public.lots l, t where l.dibuat_pada > t.batas and l.po_id not in (select id from po)
) x
order by urut, kode;
