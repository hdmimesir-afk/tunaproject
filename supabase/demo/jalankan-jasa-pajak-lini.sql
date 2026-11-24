-- Jalanin sekali di Supabase SQL Editor (produksi), SEBELUM push. Isinya sama persis dengan migrasi:
--   20261125000100_jasa_pajak_lini: penjualan jasa (daftar 5 jasa), pajak dan diskon, biaya per lini bisnis
-- Satu transaksi: kalau ada yg gagal, nggak ada yg berubah. Data lama nggak diubah (invoice lama subtotal = total).

begin;

-- =====================================================================
-- 20261125000100_jasa_pajak_lini
-- =====================================================================
-- 25 Nov 2026 (permintaan tim Katalis, tahap 2 rombak menu):
--   1. Penjualan jasa produksi: daftar jasa (paling banyak 5 yang aktif) yang nama dan harganya diatur sendiri dan bisa
--      dikoreksi kapan aja (kecatat sebelum dan sesudahnya). Pesanan jasa isinya jasa dari daftar (harga keisi, boleh
--      diubah per transaksi) plus paling banyak 5 baris manual (keterangan + harga). Nggak lewat kirim, langsung ditagih.
--   2. Pajak (persen, bisa diubah, bisa on/off per transaksi) dan diskon (persen atau nominal) di pesanan barang dan jasa.
--      total = (subtotal - diskon) + pajak% x (subtotal - diskon). Pajak bukan pendapatan; diskon ngurangin pendapatan.
--   3. Biaya per lini bisnis (jual loin, jasa proses loin, titip barang): biaya yang punya proyek ikut lini proyeknya,
--      yang nggak punya proyek dipilih manual, kosong artinya biaya umum.

-- ============================================================ catatan koreksi
alter table public.koreksi_data drop constraint koreksi_data_tabel_check;
alter table public.koreksi_data add constraint koreksi_data_tabel_check
  check (tabel in ('lots', 'purchase_orders', 'payments', 'productions', 'cycles', 'expenses', 'sales_orders', 'customer_payments', 'storage_units', 'service_items'));
drop policy "koreksi terbaca" on public.koreksi_data;
create policy "koreksi terbaca" on public.koreksi_data for select to authenticated using (
  case when tabel in ('purchase_orders', 'payments') then (select private.has_permission('pembelian.read'))
       when tabel = 'expenses' then (select private.has_permission('keuangan.read'))
       when tabel in ('sales_orders', 'customer_payments', 'service_items') then (select private.has_permission('penjualan.read'))
       when tabel = 'storage_units' then (select private.has_permission('gudang.read'))
       else (select private.has_permission('mutu.read')) or (select private.has_permission('produksi.read')) or (select private.has_permission('pembelian.read'))
  end
);

-- ============================================================ 1. daftar jasa
create table public.service_items (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) between 1 and 120),
  harga numeric(16,2) not null check (harga > 0),
  urutan int not null default 0,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
select private.pasang_aturan_tabel('public.service_items');
revoke insert, update on public.service_items from authenticated;
create policy "daftar jasa terbaca" on public.service_items for select to authenticated using ((select private.has_permission('penjualan.read')));

-- Tambah (p_id kosong) atau ubah jasa. Ganti harga atau nama wajib alasan dan kecatat di riwayat koreksi.
create or replace function public.simpan_jasa(p_id uuid, p_nama text, p_harga numeric, p_aktif boolean default true, p_alasan text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.service_items;
  id_s uuid;
begin
  perform private.wajib_izin('penjualan.write');
  if length(trim(coalesce(p_nama, ''))) = 0 then
    raise exception 'Tulis nama jasanya.' using errcode = 'KT001';
  end if;
  if p_harga is null or p_harga <= 0 or round(p_harga, 2) <> p_harga then
    raise exception 'Harga jasa harus lebih dari nol.' using errcode = 'KT001';
  end if;
  if p_id is null then
    if (select count(*) from public.service_items where aktif) >= 5 then
      raise exception 'Jasa yang aktif udah 5. Nonaktifin salah satu dulu.' using errcode = 'KT001';
    end if;
    insert into public.service_items (nama, harga, urutan)
    values (trim(p_nama), p_harga, coalesce((select max(urutan) from public.service_items), 0) + 1)
    returning id into id_s;
    return id_s;
  end if;
  select * into s from public.service_items where id = p_id for update;
  if not found then
    raise exception 'Jasa tidak ditemukan.' using errcode = 'KT001';
  end if;
  if coalesce(p_aktif, true) and not s.aktif and (select count(*) from public.service_items where aktif) >= 5 then
    raise exception 'Jasa yang aktif udah 5. Nonaktifin salah satu dulu.' using errcode = 'KT001';
  end if;
  perform private.cek_alasan(p_alasan, 'Tulis alasan ngubah jasanya, misalnya harga naik.');
  update public.service_items set nama = trim(p_nama), harga = p_harga, aktif = coalesce(p_aktif, true) where id = s.id;
  perform private.catat_koreksi('service_items', s.id, s.nama, p_alasan,
    jsonb_build_object('nama', s.nama, 'harga', s.harga, 'aktif', s.aktif),
    jsonb_build_object('nama', trim(p_nama), 'harga', p_harga, 'aktif', coalesce(p_aktif, true)));
  return s.id;
end;
$$;

-- ============================================================ 2. pesanan jasa, pajak, diskon
alter table public.sales_orders
  add column jenis text not null default 'barang' check (jenis in ('barang', 'jasa')),
  add column pajak_aktif boolean not null default false,
  add column pajak_persen numeric(5,2) not null default 0 check (pajak_persen between 0 and 100),
  add column diskon_jenis text not null default 'nominal' check (diskon_jenis in ('persen', 'nominal')),
  add column diskon_nilai numeric(16,2) not null default 0 check (diskon_nilai >= 0),
  add constraint sales_orders_diskon_persen check (diskon_jenis <> 'persen' or diskon_nilai <= 100);

-- Baris pesanan jasa. Baris yang diganti ditandai batal, bukan dihapus. Ikut kehapus kalau pesanannya dihapus resmi.
create table public.sales_service_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sales_orders (id) on delete cascade,
  service_item_id uuid references public.service_items (id) on delete set null,
  keterangan text not null check (length(trim(keterangan)) between 1 and 200),
  harga numeric(16,2) not null check (harga > 0),
  urutan int not null default 0,
  batal boolean not null default false,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create index sales_service_lines_order_idx on public.sales_service_lines (order_id) where not batal;
select private.pasang_aturan_tabel('public.sales_service_lines');
revoke insert, update on public.sales_service_lines from authenticated;
create policy "baris jasa terbaca" on public.sales_service_lines for select to authenticated using ((select private.has_permission('penjualan.read')));

alter table public.invoices drop constraint invoices_jenis_check;
alter table public.invoices add constraint invoices_jenis_check check (jenis in ('penjualan', 'gudang_dingin', 'jasa_produksi'));
alter table public.invoices
  add column subtotal numeric(16,2),
  add column diskon numeric(16,2) not null default 0,
  add column pajak numeric(16,2) not null default 0,
  add column pajak_persen numeric(5,2) not null default 0;
update public.invoices set subtotal = total where subtotal is null;

-- Diskon dan pajak dari subtotal. Dipakai fungsi dan view, jadi sama persis di mana pun.
create or replace function private.potongan(p_subtotal numeric, p_diskon_jenis text, p_diskon_nilai numeric, p_pajak_aktif boolean, p_pajak_persen numeric)
returns table (diskon numeric, pajak numeric, total numeric)
language sql
immutable
set search_path = ''
as $$
  with d as (
    select least(coalesce(p_subtotal, 0), case when p_diskon_jenis = 'persen' then round(coalesce(p_subtotal, 0) * coalesce(p_diskon_nilai, 0) / 100, 2)
                                            else coalesce(p_diskon_nilai, 0) end)::numeric(16,2) as diskon
  ), p as (
    select d.diskon, case when p_pajak_aktif then round((coalesce(p_subtotal, 0) - d.diskon) * coalesce(p_pajak_persen, 0) / 100, 2) else 0 end::numeric(16,2) as pajak from d
  )
  select p.diskon, p.pajak, (coalesce(p_subtotal, 0) - p.diskon + p.pajak)::numeric(16,2) from p;
$$;
revoke all on function private.potongan(numeric, text, numeric, boolean, numeric) from public, anon;
grant execute on function private.potongan(numeric, text, numeric, boolean, numeric) to authenticated;

-- Isi invoice satu pesanan (baris dan subtotal), barang atau jasa.
create or replace function private.isi_invoice(p_order uuid, out baris jsonb, out subtotal numeric)
language plpgsql
stable
set search_path = ''
as $$
declare
  o public.sales_orders;
begin
  select * into o from public.sales_orders where id = p_order;
  if o.jenis = 'jasa' then
    select jsonb_agg(jsonb_build_object('uraian', l.keterangan, 'kelompok', 'jasa', 'jumlah', l.harga) order by l.urutan, l.dibuat_pada, l.id), sum(l.harga)
    into baris, subtotal
    from public.sales_service_lines l where l.order_id = o.id and not l.batal;
  else
    select jsonb_agg(jsonb_build_object(
             'uraian', a.product_nama || coalesce(' ' || a.grade_kode, ''), 'unit', a.unit_kode, 'kelompok', a.kelompok,
             'kg', coalesce(a.kg_diterima, a.kg_kirim), 'dasar', case when a.kg_diterima is not null then 'diterima pembeli' else 'dikirim' end,
             'harga_per_kg', a.harga_per_kg, 'jumlah', round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2)) order by a.dibuat_pada, a.id),
           sum(round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2))
    into baris, subtotal
    from public.sale_allocations a where a.order_id = o.id and not a.batal;
  end if;
end;
$$;
revoke all on function private.isi_invoice(uuid) from public, anon, authenticated;

-- Hitung ulang invoice yg udah terbit (abis koreksi isi, pajak, atau diskon). Total baru nggak boleh di bawah yg udah dibayar.
create or replace function private.hitung_ulang_invoice(p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  inv public.invoices;
  isi record;
  pot record;
  dibayar numeric(16,2);
begin
  select * into o from public.sales_orders where id = p_order;
  select * into inv from public.invoices where order_id = o.id and status = 'terbit' for update;
  if not found then
    return;
  end if;
  select * into isi from private.isi_invoice(o.id);
  select * into pot from private.potongan(isi.subtotal, o.diskon_jenis, o.diskon_nilai, o.pajak_aktif, o.pajak_persen);
  if coalesce(pot.total, 0) <= 0 then
    raise exception 'Total tagihannya jadi nol. Cek diskonnya.' using errcode = 'KT001';
  end if;
  select coalesce(sum(jumlah), 0) into dibayar from public.customer_payments where invoice_id = inv.id;
  if pot.total < dibayar then
    raise exception 'Total baru % lebih kecil dari yg udah dibayar %. Koreksi atau hapus uang masuknya dulu.', pot.total::text, dibayar::text using errcode = 'KT001';
  end if;
  update public.invoices
  set baris = isi.baris, subtotal = isi.subtotal, diskon = pot.diskon, pajak = pot.pajak, pajak_persen = case when o.pajak_aktif then o.pajak_persen else 0 end, total = pot.total
  where id = inv.id;
end;
$$;
revoke all on function private.hitung_ulang_invoice(uuid) from public, anon, authenticated;

-- Cek isian pajak dan diskon.
create or replace function private.cek_pajak_diskon(p_pajak_aktif boolean, p_pajak_persen numeric, p_diskon_jenis text, p_diskon_nilai numeric)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if coalesce(p_pajak_aktif, false) and (p_pajak_persen is null or p_pajak_persen < 0 or p_pajak_persen > 100 or round(p_pajak_persen, 2) <> p_pajak_persen) then
    raise exception 'Persen pajak harus antara 0 sampai 100.' using errcode = 'KT001';
  end if;
  if coalesce(p_diskon_jenis, 'nominal') not in ('persen', 'nominal') then
    raise exception 'Pilih diskon persen atau nominal.' using errcode = 'KT001';
  end if;
  if coalesce(p_diskon_nilai, 0) < 0 or round(coalesce(p_diskon_nilai, 0), 2) <> coalesce(p_diskon_nilai, 0) then
    raise exception 'Diskon nggak boleh minus.' using errcode = 'KT001';
  end if;
  if p_diskon_jenis = 'persen' and coalesce(p_diskon_nilai, 0) > 100 then
    raise exception 'Diskon persen paling banyak 100.' using errcode = 'KT001';
  end if;
end;
$$;
revoke all on function private.cek_pajak_diskon(boolean, numeric, text, numeric) from public, anon, authenticated;

-- Atur pajak dan diskon satu pesanan (barang atau jasa). Kalau invoice-nya udah terbit, wajib alasan, invoice dihitung ulang,
-- dan perubahannya kecatat di riwayat koreksi.
create or replace function public.atur_pajak_diskon(p_order uuid, p_pajak_aktif boolean, p_pajak_persen numeric, p_diskon_jenis text, p_diskon_nilai numeric, p_alasan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  ada_invoice boolean;
begin
  perform private.wajib_izin('penjualan.write');
  perform private.cek_pajak_diskon(p_pajak_aktif, p_pajak_persen, p_diskon_jenis, p_diskon_nilai);
  select * into o from public.sales_orders where id = p_order for update;
  if not found or o.status = 'dibatalkan' then
    raise exception 'Pesanan tidak ditemukan atau udah dibatalkan.' using errcode = 'KT001';
  end if;
  ada_invoice := exists (select 1 from public.invoices where order_id = o.id and status = 'terbit');
  if ada_invoice then
    perform private.cek_alasan(p_alasan, 'Invoice-nya udah terbit. Tulis alasan ngubah pajak atau diskonnya.');
  end if;
  update public.sales_orders
  set pajak_aktif = coalesce(p_pajak_aktif, false), pajak_persen = case when coalesce(p_pajak_aktif, false) then p_pajak_persen else 0 end,
      diskon_jenis = coalesce(p_diskon_jenis, 'nominal'), diskon_nilai = coalesce(p_diskon_nilai, 0)
  where id = o.id;
  if ada_invoice then
    perform private.hitung_ulang_invoice(o.id);
    perform private.catat_koreksi('sales_orders', o.id, o.kode, p_alasan,
      jsonb_build_object('pajak_aktif', o.pajak_aktif, 'pajak_persen', o.pajak_persen, 'diskon_jenis', o.diskon_jenis, 'diskon_nilai', o.diskon_nilai),
      jsonb_build_object('pajak_aktif', coalesce(p_pajak_aktif, false), 'pajak_persen', case when coalesce(p_pajak_aktif, false) then p_pajak_persen else 0 end,
                         'diskon_jenis', coalesce(p_diskon_jenis, 'nominal'), 'diskon_nilai', coalesce(p_diskon_nilai, 0)));
  end if;
end;
$$;

-- Ganti isi baris jasa satu pesanan. p_baris: [{"service_item_id": uuid|null, "keterangan": "...", "harga": 1500000}, ...].
create or replace function private.isi_baris_jasa(p_order uuid, p_baris jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n int := 0;
  manual int := 0;
  hasil jsonb := '[]'::jsonb;
begin
  if p_baris is null or jsonb_typeof(p_baris) <> 'array' or jsonb_array_length(p_baris) = 0 then
    raise exception 'Isi minimal satu jasa.' using errcode = 'KT001';
  end if;
  update public.sales_service_lines set batal = true where order_id = p_order and not batal;
  for r in select * from jsonb_to_recordset(p_baris) as x(service_item_id uuid, keterangan text, harga numeric) loop
    n := n + 1;
    if r.service_item_id is null then
      manual := manual + 1;
    elsif not exists (select 1 from public.service_items where id = r.service_item_id) then
      raise exception 'Jasa yang dipilih nggak ada di daftar.' using errcode = 'KT001';
    end if;
    if length(trim(coalesce(r.keterangan, ''))) = 0 then
      raise exception 'Tulis keterangan jasa di baris %.', n using errcode = 'KT001';
    end if;
    if r.harga is null or r.harga <= 0 or round(r.harga, 2) <> r.harga then
      raise exception 'Harga jasa di baris % harus lebih dari nol.', n using errcode = 'KT001';
    end if;
    insert into public.sales_service_lines (order_id, service_item_id, keterangan, harga, urutan)
    values (p_order, r.service_item_id, trim(r.keterangan), r.harga, n);
    hasil := hasil || jsonb_build_array(jsonb_build_object('keterangan', trim(r.keterangan), 'harga', r.harga));
  end loop;
  if manual > 5 then
    raise exception 'Baris manual paling banyak 5.' using errcode = 'KT001';
  end if;
  if n > 10 then
    raise exception 'Satu pesanan jasa paling banyak 10 baris.' using errcode = 'KT001';
  end if;
  return hasil;
end;
$$;
revoke all on function private.isi_baris_jasa(uuid, jsonb) from public, anon, authenticated;

-- Pesanan jasa baru (p_order kosong) atau ubah yang belum ditagih.
create or replace function public.simpan_pesanan_jasa(p_order uuid, p_buyer uuid, p_cycle uuid, p_tanggal date, p_catatan text, p_baris jsonb,
  p_pajak_aktif boolean default false, p_pajak_persen numeric default 0, p_diskon_jenis text default 'nominal', p_diskon_nilai numeric default 0)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  b public.buyers;
  id_o uuid;
begin
  perform private.wajib_izin('penjualan.write');
  perform private.cek_pajak_diskon(p_pajak_aktif, p_pajak_persen, p_diskon_jenis, p_diskon_nilai);
  select * into b from public.buyers where id = p_buyer and aktif;
  if not found then
    raise exception 'Pilih pelanggan jasanya.' using errcode = 'KT001';
  end if;
  if p_cycle is not null and not exists (select 1 from public.cycles where id = p_cycle) then
    raise exception 'Proyek tidak ditemukan.' using errcode = 'KT001';
  end if;
  if p_order is null then
    insert into public.sales_orders (jenis, buyer_id, buyer_nama, cycle_id, tanggal, tempo_hari, catatan, pajak_aktif, pajak_persen, diskon_jenis, diskon_nilai)
    values ('jasa', b.id, b.nama, p_cycle, coalesce(p_tanggal, current_date), b.tempo_hari, coalesce(trim(p_catatan), ''),
            coalesce(p_pajak_aktif, false), case when coalesce(p_pajak_aktif, false) then p_pajak_persen else 0 end, coalesce(p_diskon_jenis, 'nominal'), coalesce(p_diskon_nilai, 0))
    returning id into id_o;
  else
    select * into o from public.sales_orders where id = p_order for update;
    if not found or o.jenis <> 'jasa' then
      raise exception 'Pesanan jasa tidak ditemukan.' using errcode = 'KT001';
    end if;
    if o.status <> 'draf' then
      raise exception 'Pesanan % udah ditagih. Pakai Koreksi aja.', o.kode using errcode = 'KT001';
    end if;
    update public.sales_orders
    set buyer_id = b.id, buyer_nama = b.nama, cycle_id = p_cycle, tanggal = coalesce(p_tanggal, tanggal), tempo_hari = b.tempo_hari, catatan = coalesce(trim(p_catatan), ''),
        pajak_aktif = coalesce(p_pajak_aktif, false), pajak_persen = case when coalesce(p_pajak_aktif, false) then p_pajak_persen else 0 end,
        diskon_jenis = coalesce(p_diskon_jenis, 'nominal'), diskon_nilai = coalesce(p_diskon_nilai, 0)
    where id = o.id;
    id_o := o.id;
  end if;
  perform private.isi_baris_jasa(id_o, p_baris);
  return id_o;
end;
$$;

-- Koreksi pesanan jasa yg udah ditagih: isi jasa, tanggal, catatan. Wajib alasan, invoice dihitung ulang.
create or replace function public.koreksi_pesanan_jasa(p_order uuid, p_tanggal date, p_catatan text, p_baris jsonb, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  sebelum jsonb;
  sesudah jsonb;
begin
  perform private.wajib_izin('penjualan.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan koreksinya.');
  select * into o from public.sales_orders where id = p_order for update;
  if not found or o.jenis <> 'jasa' or o.status = 'dibatalkan' then
    raise exception 'Pesanan jasa tidak ditemukan.' using errcode = 'KT001';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('keterangan', keterangan, 'harga', harga) order by urutan), '[]'::jsonb) into sebelum
  from public.sales_service_lines where order_id = o.id and not batal;
  sesudah := private.isi_baris_jasa(o.id, p_baris);
  update public.sales_orders set tanggal = coalesce(p_tanggal, o.tanggal), catatan = coalesce(trim(p_catatan), o.catatan) where id = o.id;
  perform private.hitung_ulang_invoice(o.id);
  perform private.catat_koreksi('sales_orders', o.id, o.kode, p_alasan,
    jsonb_build_object('tanggal', o.tanggal, 'catatan', o.catatan, 'baris', sebelum),
    jsonb_build_object('tanggal', coalesce(p_tanggal, o.tanggal), 'catatan', coalesce(trim(p_catatan), o.catatan), 'baris', sesudah));
end;
$$;

-- Invoice: barang setelah dikirim, jasa langsung (pesanan jasa jadi "terkirim" = udah ditagih). Pajak dan diskon ikut dihitung.
create or replace function public.terbitkan_invoice(p_order uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  isi record;
  pot record;
  id_inv uuid;
  hari date := (now() at time zone 'Asia/Jakarta')::date;
begin
  perform private.wajib_izin('invoice.write');
  select * into o from public.sales_orders where id = p_order for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'KT001';
  end if;
  if o.jenis = 'barang' and o.status <> 'terkirim' then
    raise exception 'Invoice baru bisa terbit setelah pesanan % dikirim.', o.kode using errcode = 'KT001';
  end if;
  if o.status = 'dibatalkan' then
    raise exception 'Pesanan % udah dibatalkan.', o.kode using errcode = 'KT001';
  end if;
  if exists (select 1 from public.invoices where order_id = o.id and status = 'terbit') then
    raise exception 'Invoice untuk pesanan % sudah terbit.', o.kode using errcode = 'KT001';
  end if;
  select * into isi from private.isi_invoice(o.id);
  if isi.subtotal is null or isi.subtotal <= 0 then
    raise exception 'Pesanan % tidak punya nilai yang bisa ditagih.', o.kode using errcode = 'KT001';
  end if;
  select * into pot from private.potongan(isi.subtotal, o.diskon_jenis, o.diskon_nilai, o.pajak_aktif, o.pajak_persen);
  if pot.total <= 0 then
    raise exception 'Total tagihan pesanan % jadi nol. Cek diskonnya.', o.kode using errcode = 'KT001';
  end if;
  insert into public.invoices (jenis, buyer_id, buyer_nama, order_id, cycle_id, tanggal, jatuh_tempo, total, baris, subtotal, diskon, pajak, pajak_persen)
  values (case when o.jenis = 'jasa' then 'jasa_produksi' else 'penjualan' end, o.buyer_id, o.buyer_nama, o.id, o.cycle_id, hari, hari + o.tempo_hari,
          pot.total, isi.baris, isi.subtotal, pot.diskon, pot.pajak, case when o.pajak_aktif then o.pajak_persen else 0 end)
  returning id into id_inv;
  if o.jenis = 'jasa' and o.status = 'draf' then
    update public.sales_orders set status = 'terkirim', dikirim_pada = now(), dikirim_oleh = (select auth.uid()) where id = o.id;
  end if;
  return id_inv;
end;
$$;

-- Pesanan barang: kirim cuma buat pesanan barang.
create or replace function private.tolak_kirim_jasa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.jenis = 'jasa' and new.status = 'terkirim' and old.status = 'draf'
     and not exists (select 1 from public.invoices where order_id = new.id and status = 'terbit') then
    raise exception 'Pesanan jasa nggak dikirim, langsung terbitin invoice-nya.' using errcode = 'KT001';
  end if;
  return new;
end;
$$;
revoke all on function private.tolak_kirim_jasa() from public, anon, authenticated;
-- Dicek setelah invoice masuk (terbitkan_invoice insert invoice dulu baru ngubah status), jadi trigger cukup sebelum update.
create trigger sales_orders_kirim_jasa before update of status on public.sales_orders for each row execute function private.tolak_kirim_jasa();

-- Koreksi pesanan barang yg udah dikirim: sama kayak sebelumnya, hitung ulang invoice sekarang ikut pajak dan diskon.
create or replace function public.koreksi_pesanan_terkirim(p_order uuid, p_tanggal date, p_catatan text, p_baris jsonb, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  a public.sale_allocations;
  u public.storage_units;
  r record;
  selisih numeric(12,3);
  dipesan numeric(12,3);
  sebelum jsonb := '[]'::jsonb;
  sesudah jsonb := '[]'::jsonb;
begin
  perform private.wajib_izin('penjualan.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan koreksinya.');
  select * into o from public.sales_orders where id = p_order for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'KT001';
  end if;
  if o.jenis = 'jasa' then
    raise exception 'Pesanan jasa dikoreksi lewat Koreksi jasa.' using errcode = 'KT001';
  end if;
  if o.status <> 'terkirim' then
    raise exception 'Pesanan % masih %. Yg belum dikirim cukup diubah lewat Ubah pesanan.', o.kode, o.status using errcode = 'KT001';
  end if;
  if p_baris is not null and jsonb_typeof(p_baris) <> 'array' then
    raise exception 'Isian barisnya nggak valid.' using errcode = 'KT001';
  end if;

  perform 1 from public.storage_units
  where id in (select unit_id from public.sale_allocations where order_id = o.id and not batal)
  order by id for update;

  for r in select * from jsonb_to_recordset(coalesce(p_baris, '[]'::jsonb)) as x(id uuid, kg_kirim numeric, kg_diterima numeric, harga_per_kg numeric) order by id loop
    select * into a from public.sale_allocations where id = r.id and order_id = o.id and not batal;
    if not found then
      raise exception 'Baris pesanan tidak ditemukan.' using errcode = 'KT001';
    end if;
    perform private.valid_kg(r.kg_kirim, 'Berat kirim');
    if r.kg_diterima is not null then
      perform private.valid_kg(r.kg_diterima, 'Berat diterima pembeli');
      if r.kg_diterima > r.kg_kirim then
        raise exception 'Berat diterima pembeli nggak boleh lebih dari berat kirim.' using errcode = 'KT001';
      end if;
    end if;
    if r.harga_per_kg is null or r.harga_per_kg <= 0 or round(r.harga_per_kg, 2) <> r.harga_per_kg then
      raise exception 'Harga per kg harus lebih dari nol.' using errcode = 'KT001';
    end if;

    selisih := round(r.kg_kirim, 3) - a.kg_kirim;
    if selisih <> 0 then
      select * into u from public.storage_units where id = a.unit_id;
      if selisih > 0 then
        dipesan := private.kg_dipesan(u.id);
        if selisih > u.sisa_kg - dipesan then
          raise exception 'Stok % tinggal % kg%, jadi berat kirim cuma bisa ditambah % kg.',
            u.kode, trim_scale(u.sisa_kg)::text,
            case when dipesan > 0 then format(', %s kg di antaranya udah dipesan %s', trim_scale(dipesan), private.pesanan_pemegang(u.id)) else '' end,
            trim_scale(greatest(u.sisa_kg - dipesan, 0))::text using errcode = 'KT001';
        end if;
      end if;
      update public.storage_units
      set sisa_kg = sisa_kg - selisih, sisa_dasar_masuk = greatest(sisa_dasar_masuk - selisih, 0),
          status = case when sisa_kg - selisih > 0 then 'aktif' else 'habis' end
      where id = u.id;
      insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan)
      values (u.id, 'koreksi', -selisih, -selisih, 'Koreksi penjualan ' || o.kode || ': ' || trim(p_alasan));
    end if;

    sebelum := sebelum || jsonb_build_array(jsonb_build_object('unit', a.unit_kode, 'kg_kirim', a.kg_kirim, 'kg_diterima', a.kg_diterima, 'harga', a.harga_per_kg));
    sesudah := sesudah || jsonb_build_array(jsonb_build_object('unit', a.unit_kode, 'kg_kirim', round(r.kg_kirim, 3), 'kg_diterima', r.kg_diterima, 'harga', r.harga_per_kg));
    update public.sale_allocations set kg_kirim = round(r.kg_kirim, 3), kg_diterima = r.kg_diterima, harga_per_kg = r.harga_per_kg where id = a.id;
  end loop;

  update public.sales_orders set tanggal = coalesce(p_tanggal, o.tanggal), catatan = coalesce(trim(p_catatan), o.catatan) where id = o.id;
  perform private.hitung_ulang_invoice(o.id);

  perform private.catat_koreksi('sales_orders', o.id, o.kode, p_alasan,
    jsonb_build_object('tanggal', o.tanggal, 'catatan', o.catatan, 'baris', sebelum),
    jsonb_build_object('tanggal', coalesce(p_tanggal, o.tanggal), 'catatan', coalesce(trim(p_catatan), o.catatan), 'baris', sesudah));
end;
$$;

-- ============================================================ tampilan
-- total_pesan dan total_final sekarang udah dipotong diskon dan ditambah pajak. Kolom baru di akhir.
create or replace view public.v_sales_orders with (security_invoker = true) as
select
  o.id, o.kode, o.buyer_id, o.buyer_nama, o.cycle_id, c.kode as siklus_kode, o.tanggal, o.tempo_hari, o.status, o.catatan, o.alasan_batal, o.dikirim_pada,
  coalesce(a.jumlah_baris, 0)::int as jumlah_baris,
  coalesce(a.kg_pesan, 0)::numeric(12,3) as kg_pesan,
  coalesce(tp.total, 0)::numeric(16,2) as total_pesan,
  coalesce(a.kg_final, 0)::numeric(12,3) as kg_final,
  coalesce(tf.total, 0)::numeric(16,2) as total_final,
  i.id as invoice_id, i.kode as invoice_kode,
  o.jenis, o.pajak_aktif, o.pajak_persen, o.diskon_jenis, o.diskon_nilai,
  coalesce(a.sub_pesan, 0)::numeric(16,2) as subtotal_pesan,
  coalesce(a.sub_final, 0)::numeric(16,2) as subtotal_final,
  coalesce(tf.diskon, 0)::numeric(16,2) as diskon_final,
  coalesce(tf.pajak, 0)::numeric(16,2) as pajak_final
from public.sales_orders o
left join public.cycles c on c.id = o.cycle_id
left join lateral (
  select count(*) as jumlah_baris, sum(x.kg_pesan) as kg_pesan, sum(round(x.kg_pesan * x.harga_per_kg, 2)) as sub_pesan,
         sum(coalesce(x.kg_diterima, x.kg_kirim)) as kg_final,
         sum(round(coalesce(x.kg_diterima, x.kg_kirim) * x.harga_per_kg, 2)) as sub_final
  from public.sale_allocations x where x.order_id = o.id and not x.batal and o.jenis = 'barang'
  union all
  select count(*), null, sum(l.harga), null, sum(l.harga)
  from public.sales_service_lines l where l.order_id = o.id and not l.batal and o.jenis = 'jasa'
  order by 1 desc
  limit 1
) a on true
left join lateral private.potongan(a.sub_pesan, o.diskon_jenis, o.diskon_nilai, o.pajak_aktif, o.pajak_persen) tp on true
left join lateral private.potongan(a.sub_final, o.diskon_jenis, o.diskon_nilai, o.pajak_aktif, o.pajak_persen) tf on true
left join lateral (select id, kode from public.invoices where order_id = o.id and status = 'terbit' limit 1) i on true;

create or replace view public.v_invoices with (security_invoker = true) as
select
  i.id, i.kode, i.jenis, i.buyer_id, i.buyer_nama, i.order_id, i.cycle_id, i.tanggal, i.jatuh_tempo, i.total, i.baris, i.catatan, i.status as status_terbit, i.alasan_batal,
  coalesce(p.dibayar, 0)::numeric(16,2) as dibayar,
  (i.total - coalesce(p.dibayar, 0))::numeric(16,2) as sisa,
  case
    when i.status = 'dibatalkan' then 'dibatalkan'
    when i.total - coalesce(p.dibayar, 0) <= 0 then 'lunas'
    when (now() at time zone 'Asia/Jakarta')::date < i.jatuh_tempo then 'belum_jatuh_tempo'
    when (now() at time zone 'Asia/Jakarta')::date = i.jatuh_tempo then 'jatuh_tempo'
    else 'terlambat'
  end as status_tagihan,
  greatest(0, (now() at time zone 'Asia/Jakarta')::date - i.jatuh_tempo)::int as hari_telat,
  coalesce(i.subtotal, i.total)::numeric(16,2) as subtotal, i.diskon, i.pajak, i.pajak_persen
from public.invoices i
left join lateral (select sum(jumlah) as dibayar from public.customer_payments where invoice_id = i.id) p on true;

-- Laba rugi per proyek: pendapatan total = barang + jasa produksi - diskon (pajak bukan pendapatan). Kolom baru di akhir.
create or replace view public.v_laba_rugi_siklus with (security_invoker = true) as
select
  c.id as cycle_id, c.kode, c.ref_po_pembeli, c.status,
  coalesce(j.pendapatan_loin, 0)::numeric(16,2) as pendapatan_loin,
  coalesce(j.pendapatan_samping, 0)::numeric(16,2) as pendapatan_samping,
  (coalesce(j.pendapatan_barang, 0) + coalesce(js.pendapatan_jasa, 0) - coalesce(dk.diskon, 0))::numeric(16,2) as pendapatan_total,
  coalesce(j.kg_loin_terjual, 0)::numeric(12,3) as kg_loin_terjual,
  coalesce(b.biaya_ikan, 0)::numeric(16,2) as biaya_ikan,
  coalesce(b.kg_ikan, 0)::numeric(12,3) as kg_ikan,
  coalesce(x.biaya_lain, 0)::numeric(16,2) as biaya_lain,
  (coalesce(b.biaya_ikan, 0) + coalesce(x.biaya_lain, 0))::numeric(16,2) as biaya_total,
  (coalesce(j.pendapatan_barang, 0) + coalesce(js.pendapatan_jasa, 0) - coalesce(dk.diskon, 0) - coalesce(b.biaya_ikan, 0) - coalesce(x.biaya_lain, 0))::numeric(16,2) as laba_kotor,
  case when coalesce(j.pendapatan_barang, 0) + coalesce(js.pendapatan_jasa, 0) - coalesce(dk.diskon, 0) > 0
    then round((coalesce(j.pendapatan_barang, 0) + coalesce(js.pendapatan_jasa, 0) - coalesce(dk.diskon, 0) - coalesce(b.biaya_ikan, 0) - coalesce(x.biaya_lain, 0))
               / (coalesce(j.pendapatan_barang, 0) + coalesce(js.pendapatan_jasa, 0) - coalesce(dk.diskon, 0)) * 100, 1)
  end as margin_pct,
  coalesce(pr.loin_kg, 0)::numeric(12,3) as loin_kg,
  coalesce(pr.masuk_kg, 0)::numeric(12,3) as kg_diolah,
  coalesce(js.pendapatan_jasa, 0)::numeric(16,2) as pendapatan_jasa,
  coalesce(dk.diskon, 0)::numeric(16,2) as diskon
from public.cycles c
left join lateral (
  select
    sum(round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2)) filter (where a.kelompok = 'loin') as pendapatan_loin,
    sum(round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2)) filter (where a.kelompok <> 'loin') as pendapatan_samping,
    sum(round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2)) as pendapatan_barang,
    sum(coalesce(a.kg_diterima, a.kg_kirim)) filter (where a.kelompok = 'loin') as kg_loin_terjual
  from public.sale_allocations a join public.sales_orders s on s.id = a.order_id
  where s.cycle_id = c.id and s.status = 'terkirim' and not a.batal
) j on true
left join lateral (
  select sum(l.harga) as pendapatan_jasa
  from public.sales_service_lines l join public.sales_orders s on s.id = l.order_id
  where s.cycle_id = c.id and s.status = 'terkirim' and not l.batal
) js on true
left join lateral (
  select sum(i.diskon) as diskon from public.invoices i where i.cycle_id = c.id and i.status = 'terbit' and i.order_id is not null
) dk on true
left join lateral (
  select sum(po.total) as biaya_ikan, sum(po.kg) as kg_ikan
  from public.purchase_orders po where po.cycle_id = c.id and po.status_persetujuan = 'disetujui'
) b on true
left join lateral (
  select sum(e.jumlah) as biaya_lain from public.expenses e where e.cycle_id = c.id and e.status = 'disetujui'
) x on true
left join lateral (
  select sum(n.loin_kg) as loin_kg, sum(n.masuk_kg) as masuk_kg
  from public.productions p join public.v_neraca_produksi n on n.production_id = p.id where p.cycle_id = c.id
) pr on true;

-- Ringkasan harian: nilai penjualan ikut jasa produksi dan dikurangin diskon.
create or replace view public.v_ringkasan_harian with (security_invoker = true) as
select
  tanggal,
  coalesce(sum(nilai) filter (where metrik = 'po'), 0)::numeric(16,2) as nilai_beli,
  coalesce(sum(n) filter (where metrik = 'po'), 0)::int as jumlah_po,
  coalesce(sum(nilai) filter (where metrik = 'terima'), 0)::numeric(12,3) as kg_diterima,
  coalesce(sum(nilai) filter (where metrik = 'loin'), 0)::numeric(12,3) as kg_loin,
  coalesce(sum(nilai) filter (where metrik = 'kirim'), 0)::numeric(12,3) as kg_kirim,
  coalesce(sum(nilai) filter (where metrik = 'jual'), 0)::numeric(16,2) as nilai_penjualan,
  coalesce(sum(nilai) filter (where metrik = 'masuk'), 0)::numeric(16,2) as uang_masuk,
  coalesce(sum(nilai) filter (where metrik = 'keluar'), 0)::numeric(16,2) as uang_keluar
from (
  select tanggal, 'po' as metrik, total as nilai, 1 as n from public.purchase_orders where status_persetujuan = 'disetujui'
  union all select tanggal_terima, 'terima', kg, 1 from public.lots
  union all select p.tanggal, 'loin', n.loin_kg, 1 from public.productions p join public.v_neraca_produksi n on n.production_id = p.id
  union all select (o.dikirim_pada at time zone 'Asia/Jakarta')::date, 'kirim', a.kg_kirim, 1
            from public.sale_allocations a join public.sales_orders o on o.id = a.order_id where o.status = 'terkirim' and not a.batal
  union all select (o.dikirim_pada at time zone 'Asia/Jakarta')::date, 'jual', round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2), 1
            from public.sale_allocations a join public.sales_orders o on o.id = a.order_id where o.status = 'terkirim' and not a.batal
  union all select (o.dikirim_pada at time zone 'Asia/Jakarta')::date, 'jual', l.harga, 1
            from public.sales_service_lines l join public.sales_orders o on o.id = l.order_id where o.status = 'terkirim' and not l.batal
  union all select (o.dikirim_pada at time zone 'Asia/Jakarta')::date, 'jual', -i.diskon, 1
            from public.invoices i join public.sales_orders o on o.id = i.order_id where i.status = 'terbit' and i.diskon > 0
  union all select tanggal, arah, jumlah, 1 from public.ledger
) x
group by tanggal;

-- Pajak penjualan bawaan (bisa diubah di Pengaturan, tetap bisa diganti per transaksi).
insert into public.settings (kunci, nilai, keterangan)
values ('pajak_persen_bawaan', '11'::jsonb, 'Persen pajak bawaan di form penjualan (bisa diubah per transaksi)')
on conflict (kunci) do nothing;

-- ============================================================ 3. biaya per lini bisnis
alter table public.expenses add column lini_bisnis text check (lini_bisnis in ('jual', 'jasa', 'titip'));
update public.expenses e set lini_bisnis = c.lini_bisnis from public.cycles c where c.id = e.cycle_id and e.lini_bisnis is null;

-- Biaya yg punya proyek selalu ikut lini proyeknya.
create or replace function private.lini_biaya()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cycle_id is not null then
    select c.lini_bisnis into new.lini_bisnis from public.cycles c where c.id = new.cycle_id;
  end if;
  return new;
end;
$$;
revoke all on function private.lini_biaya() from public, anon, authenticated;
create trigger expenses_lini before insert or update of cycle_id, lini_bisnis on public.expenses for each row execute function private.lini_biaya();

-- Lini biaya yg nggak punya proyek (null = umum). Biaya yg punya proyek tetap ngikut proyeknya.
create or replace function public.atur_lini_biaya(p_id uuid, p_lini text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.expenses;
begin
  perform private.wajib_izin('keuangan.write');
  if p_lini is not null and p_lini not in ('jual', 'jasa', 'titip') then
    raise exception 'Lini bisnis nggak dikenal.' using errcode = 'KT001';
  end if;
  select * into e from public.expenses where id = p_id for update;
  if not found then
    raise exception 'Biaya tidak ditemukan.' using errcode = 'KT001';
  end if;
  if e.lini_bisnis is not distinct from p_lini or e.cycle_id is not null then
    return;
  end if;
  update public.expenses set lini_bisnis = p_lini where id = e.id;
end;
$$;

create or replace view public.v_expenses with (security_invoker = true) as
select
  e.id, e.kode, e.category_id, e.kategori_nama, e.uraian, e.jumlah, e.tanggal, e.cycle_id, c.kode as siklus_kode, e.po_id, p.kode as po_kode, e.production_id,
  e.status, e.alasan_tolak, e.diajukan_oleh, e.diajukan_pada, e.diputuskan_oleh, e.diputuskan_pada,
  (select count(*) from public.documents d where d.ref_tabel = 'expenses' and d.ref_id = e.id and d.jenis = 'nota')::int as jml_nota,
  k.nota_wajib,
  pr.kode as produksi_kode,
  e.fixed_cost_id, e.bulan_tetap,
  e.lini_bisnis
from public.expenses e
left join public.cycles c on c.id = e.cycle_id
left join public.purchase_orders p on p.id = e.po_id
left join public.productions pr on pr.id = e.production_id
left join public.expense_categories k on k.id = e.category_id;

-- ============================================================ hak panggil
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.simpan_jasa(uuid, text, numeric, boolean, text)',
    'public.atur_pajak_diskon(uuid, boolean, numeric, text, numeric, text)',
    'public.simpan_pesanan_jasa(uuid, uuid, uuid, date, text, jsonb, boolean, numeric, text, numeric)',
    'public.koreksi_pesanan_jasa(uuid, date, text, jsonb, text)',
    'public.terbitkan_invoice(uuid)',
    'public.koreksi_pesanan_terkirim(uuid, date, text, jsonb, text)',
    'public.atur_lini_biaya(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
revoke all on public.v_sales_orders, public.v_invoices, public.v_laba_rugi_siklus, public.v_ringkasan_harian, public.v_expenses from anon;

-- Catat migrasinya biar Supabase tahu udah jalan.
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261125000100', 'jasa_pajak_lini')
on conflict do nothing;

commit;

-- Cek abis jalan (cuma baca): harus keluar 1 baris migrasi.
select version, name from supabase_migrations.schema_migrations where version = '20261125000100';
notify pgrst, 'reload schema';