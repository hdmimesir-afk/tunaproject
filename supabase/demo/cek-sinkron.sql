-- Cek data sinkron (cuma baca, nggak ngubah apa pun). Jalanin di Supabase SQL Editor kapan aja.
-- Hasilnya selalu 6 baris, satu per pengecekan. Kolom Hasil: "Aman" atau "Perlu dicek".
-- Kalau Perlu dicek, kolom Yang nggak cocok nyebutin kodenya (produksi, stok, atau lot) biar gampang dicari di aplikasi.
--   1. Produksi disetujui tapi hasilnya belum ada di stok.
--   2. Stok otomatis beda sama timbangan produksi (loin per grade, hasil samping per jenis).
--   3. Sisa stok beda sama jumlah riwayat masuk, keluar, dan koreksinya.
--   4. Sisa lot beda sama berat lot dikurangi yang dipakai produksi.
--   5. Lot dipakai produksi dari proyek lain.
--   6. Lot beda proyek sama pembeliannya.

with hasil_produksi as (
  -- Yang seharusnya ada di stok: loin per grade dan hasil samping per jenis, dari produksi yang disetujui.
  select p.id as production_id, p.kode, x.grade_id, null::uuid as kategori, sum(x.kg) as kg
  from public.productions p
  join (
    select t.production_id, t.grade_id, t.kg from public.production_loin_totals t
    union all
    select i.production_id, i.grade_id, i.kg from public.production_items i where not i.batal
  ) x on x.production_id = p.id
  where p.status = 'diperiksa'
  group by p.id, p.kode, x.grade_id
  union all
  select p.id, p.kode, null, c.category_id, c.kg
  from public.productions p
  join public.production_components c on c.production_id = p.id
  join public.component_categories k on k.id = c.category_id and k.komponen = 'hasil_samping'
  where p.status = 'diperiksa'
),
otomatis as (
  select u.production_id, u.grade_id, u.component_category_id as kategori, u.kg_masuk, u.sisa_kg, u.kode
  from public.storage_units u where u.otomatis
),
manual as (
  select distinct production_id from public.storage_units where production_id is not null and not otomatis
),
masalah as (
select 1 as no, 'Produksi disetujui, hasilnya belum di stok' as cek, p.kode, '' as rincian
from public.productions p
where p.status = 'diperiksa'
  and not exists (select 1 from public.storage_units u where u.production_id = p.id)
  and exists (select 1 from hasil_produksi h where h.production_id = p.id and h.kg > 0)

union all
select 2, 'Stok otomatis beda sama timbangan produksi', h.kode,
  coalesce(g.kode, k.nama) || ': timbangan ' || trim_scale(h.kg)::text || ' kg, stok ' || coalesce(trim_scale(o.kg_masuk)::text, 'nggak ada')
from hasil_produksi h
left join otomatis o on o.production_id = h.production_id
  and o.grade_id is not distinct from h.grade_id and o.kategori is not distinct from h.kategori
left join public.grades g on g.id = h.grade_id
left join public.component_categories k on k.id = h.kategori
where h.production_id not in (select production_id from manual)
  and h.kg > 0 and o.kg_masuk is distinct from h.kg

union all
select 2, 'Stok otomatis tanpa timbangan produksinya', o.kode, trim_scale(o.kg_masuk)::text || ' kg'
from otomatis o
where o.sisa_kg > 0
  and not exists (select 1 from hasil_produksi h where h.production_id = o.production_id
    and h.grade_id is not distinct from o.grade_id and h.kategori is not distinct from o.kategori and h.kg > 0)

union all
select 3, 'Sisa stok beda sama riwayatnya', u.kode,
  'sisa ' || trim_scale(u.sisa_kg)::text || ' kg, riwayat ' || trim_scale(coalesce(m.kg, 0))::text || ' kg'
from public.storage_units u
left join (
  select unit_id, sum(case when jenis = 'keluar' then -abs(kg) else kg end) as kg
  from public.storage_movements where status = 'disetujui' group by unit_id
) m on m.unit_id = u.id
where u.sisa_kg <> coalesce(m.kg, 0)

union all
select 4, 'Sisa lot beda sama yang dipakai produksi', l.kode,
  'berat ' || trim_scale(l.kg)::text || ', dipakai ' || trim_scale(coalesce(a.kg, 0))::text || ', sisa tercatat ' || trim_scale(l.sisa_kg)::text
from public.lots l
left join (select lot_id, sum(kg) as kg from public.lot_allocations group by lot_id) a on a.lot_id = l.id
where l.sisa_kg <> l.kg - coalesce(a.kg, 0)

union all
select 5, 'Lot dipakai produksi proyek lain', l.kode, 'produksi ' || p.kode
from public.lot_allocations a
join public.lots l on l.id = a.lot_id
join public.productions p on p.id = a.production_id
where p.cycle_id is not null and l.cycle_id is distinct from p.cycle_id

union all
select 6, 'Lot beda proyek sama pembeliannya', l.kode, coalesce(po.kode, 'pengajuan belum terbit')
from public.lots l
join public.purchase_orders po on po.id = l.po_id
where po.cycle_id is not null and l.cycle_id is distinct from po.cycle_id

),
daftar (no, cek, arti) as (values
  (1, 'Hasil produksi udah masuk stok', 'Produksi yg udah disetujui Owner hasilnya harus ada di Stok.'),
  (2, 'Berat stok sama dengan timbangan produksi', 'Loin per grade dan hasil samping per jenis di Stok harus sama dengan timbangan di Produksi.'),
  (3, 'Sisa stok sesuai riwayatnya', 'Sisa tiap stok harus sama dengan masuk dikurangi keluar, ditambah koreksi.'),
  (4, 'Sisa ikan utuh (lot) sesuai', 'Sisa lot harus sama dengan berat terima dikurangi yg udah dipakai produksi.'),
  (5, 'Lot nggak kecampur antarproyek di produksi', 'Lot cuma boleh dipakai produksi di proyeknya sendiri.'),
  (6, 'Lot sama proyek pembeliannya', 'Lot harus satu proyek dengan pembelian (PO) nya.')
)
select
  d.no as "No",
  d.cek as "Yang dicek",
  case when count(m.no) = 0 then 'Aman' else 'Perlu dicek (' || count(m.no) || ')' end as "Hasil",
  case when count(m.no) = 0 then d.arti
       else string_agg(m.kode || case when m.rincian <> '' then ': ' || m.rincian else '' end, ' | ' order by m.kode) end as "Keterangan / yang nggak cocok"
from daftar d
left join masalah m on m.no = d.no
group by d.no, d.cek, d.arti
order by d.no;
