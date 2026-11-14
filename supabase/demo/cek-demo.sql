-- CEK SEBELUM MENGHAPUS DATA CONTOH. Hanya membaca, tidak mengubah apa pun.
--
-- Cara pakai: Supabase Dashboard > SQL Editor > tempel seluruh berkas ini > Run.
--
-- Data contoh dibuat seed-demo.sql dalam satu transaksi, jadi semua barisnya punya dibuat_pada yang sama persis
-- (sama dengan dibuat_pada siklus "[DEMO]"; timbangan contoh sengaja dimundurkan). Baris yang dibuat lebih dari 1 menit setelahnya = data asli yang diisi tim.
-- Hasilnya:
--   - baris "DATA ASLI NYANGKUT": data asli yang terhubung ke data contoh. Kalau ada, hapus-demo.sql akan berhenti
--     dan tidak menghapus apa pun, supaya data asli tidak ikut hilang. Kirim hasilnya ke developer dulu.
--   - baris "data contoh": jumlah data contoh yang akan dihapus.

with
t as (select min(dibuat_pada) as w from public.cycles where catatan like '[DEMO]%'),
cyc as (select id from public.cycles where catatan like '[DEMO]%'),
sup as (select id from public.suppliers where nama like '%(Demo)'),
buy as (select id from public.buyers where nama like '%(Demo)'),
po as (select id from public.purchase_orders, t where dibuat_pada <= t.w + interval '1 minute' and (cycle_id in (select id from cyc) or supplier_id in (select id from sup))),
lot as (select id from public.lots, t where dibuat_pada <= t.w + interval '1 minute' and po_id in (select id from po)),
prd as (select id from public.productions, t where dibuat_pada <= t.w + interval '1 minute' and cycle_id in (select id from cyc)),
unit as (select id from public.storage_units, t where dibuat_pada <= t.w + interval '1 minute' and (production_id in (select id from prd) or buyer_id in (select id from buy))),
ord as (select id from public.sales_orders, t where dibuat_pada <= t.w + interval '1 minute' and (cycle_id in (select id from cyc) or buyer_id in (select id from buy))),
inv as (select id from public.invoices, t where dibuat_pada <= t.w + interval '1 minute' and (buyer_id in (select id from buy) or cycle_id in (select id from cyc) or order_id in (select id from ord))),
ex as (select id from public.expenses, t where dibuat_pada <= t.w + interval '1 minute' and (uraian like '%(Demo)' or cycle_id in (select id from cyc))),
semua as (
  select id from po union all select id from lot union all select id from prd union all select id from unit
  union all select id from ord union all select id from inv union all select id from ex
),
nyangkut as (
  select 'PO asli di proyek atau pemasok contoh' as jenis, kode as kode, to_char(tanggal, 'DD-MM-YYYY') as keterangan
    from public.purchase_orders, t where dibuat_pada > t.w + interval '1 minute' and (cycle_id in (select id from cyc) or supplier_id in (select id from sup))
  union all select 'Lot asli dari PO contoh', kode, po_kode || ' · ' || kg::text || ' kg'
    from public.lots, t where dibuat_pada > t.w + interval '1 minute' and po_id in (select id from po)
  union all select 'Cek mutu asli di lot contoh', l.kode, g.kode || ' ' || lg.kg::text || ' kg'
    from public.lot_grades lg join public.lots l on l.id = lg.lot_id join public.grades g on g.id = lg.grade_id, t
    where lg.dibuat_pada > t.w + interval '1 minute' and lg.lot_id in (select id from lot)
  union all select 'Produksi asli di proyek contoh', kode, to_char(tanggal, 'DD-MM-YYYY')
    from public.productions, t where dibuat_pada > t.w + interval '1 minute' and cycle_id in (select id from cyc)
  union all select 'Produksi asli memakai lot contoh', p.kode, l.kode || ' · ' || la.kg::text || ' kg'
    from public.lot_allocations la join public.productions p on p.id = la.production_id join public.lots l on l.id = la.lot_id, t
    where la.dibuat_pada > t.w + interval '1 minute' and la.lot_id in (select id from lot)
  union all select 'Timbangan asli di produksi contoh', p.kode, count(*)::text || ' baris'
    from public.production_items i join public.productions p on p.id = i.production_id, t
    where i.dibuat_pada > t.w + interval '1 minute' and i.production_id in (select id from prd) group by p.kode
  union all select 'Loin total asli di produksi contoh', p.kode, count(*)::text || ' grade'
    from public.production_loin_totals x join public.productions p on p.id = x.production_id, t
    where x.dibuat_pada > t.w + interval '1 minute' and x.production_id in (select id from prd) group by p.kode
  union all select 'Stok asli dari produksi, pembeli, atau proyek contoh', kode, product_nama || ' · ' || kg_masuk::text || ' kg'
    from public.storage_units, t where dibuat_pada > t.w + interval '1 minute'
      and (production_id in (select id from prd) or buyer_id in (select id from buy) or cycle_id in (select id from cyc))
  union all select 'Gerak stok asli di stok contoh', u.kode, m.jenis || ' ' || m.kg::text || ' kg'
    from public.storage_movements m join public.storage_units u on u.id = m.unit_id, t
    where m.dibuat_pada > t.w + interval '1 minute' and m.unit_id in (select id from unit)
  union all select 'Pesanan asli di proyek atau pembeli contoh', kode, buyer_nama
    from public.sales_orders, t where dibuat_pada > t.w + interval '1 minute' and (cycle_id in (select id from cyc) or buyer_id in (select id from buy))
  union all select 'Penjualan asli dari stok atau produksi contoh', o.kode, coalesce(u.kode, '-')
    from public.sale_allocations a join public.sales_orders o on o.id = a.order_id left join public.storage_units u on u.id = a.unit_id, t
    where a.dibuat_pada > t.w + interval '1 minute' and (a.unit_id in (select id from unit) or a.production_id in (select id from prd))
  union all select 'Invoice asli di proyek atau pembeli contoh', kode, buyer_nama
    from public.invoices, t where dibuat_pada > t.w + interval '1 minute' and (buyer_id in (select id from buy) or cycle_id in (select id from cyc) or order_id in (select id from ord))
  union all select 'Pembayaran asli ke PO contoh', kode, jumlah::text
    from public.payments, t where dibuat_pada > t.w + interval '1 minute' and po_id in (select id from po)
  union all select 'Uang masuk asli di invoice contoh', kode, jumlah::text
    from public.customer_payments, t where dibuat_pada > t.w + interval '1 minute' and invoice_id in (select id from inv)
  union all select 'Biaya asli di proyek, PO, atau produksi contoh', kode, uraian
    from public.expenses, t where dibuat_pada > t.w + interval '1 minute'
      and (cycle_id in (select id from cyc) or po_id in (select id from po) or production_id in (select id from prd))
  union all select 'Tagihan jasa asli di stok atau pembeli contoh', kode, pemilik_nama
    from public.service_charges, t where dibuat_pada > t.w + interval '1 minute' and (unit_id in (select id from unit) or buyer_id in (select id from buy))
  union all select 'Lampiran asli di catatan contoh', ref_tabel, nama_asli
    from public.documents where path not like 'demo/%' and ref_id in (select id from semua)
)
select 'DATA ASLI NYANGKUT' as status, jenis, kode, keterangan from nyangkut
union all
select 'data contoh', 'Akan dihapus', x.apa, x.n::text from (
  select 1 as u, 'proyek' as apa, (select count(*) from cyc) as n
  union all select 2, 'PO', (select count(*) from po)
  union all select 3, 'lot', (select count(*) from lot)
  union all select 4, 'produksi', (select count(*) from prd)
  union all select 5, 'stok', (select count(*) from unit)
  union all select 6, 'pesanan', (select count(*) from ord)
  union all select 7, 'invoice', (select count(*) from inv)
  union all select 8, 'biaya', (select count(*) from ex)
  union all select 9, 'pemasok', (select count(*) from sup)
  union all select 10, 'pembeli', (select count(*) from buy)
  order by u
) x;
