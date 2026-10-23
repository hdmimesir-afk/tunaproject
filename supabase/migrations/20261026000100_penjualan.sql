-- Fase 5a · Penjualan: pesanan dari stok, alokasi per unit, kirim (stok berkurang), invoice, pembayaran pembeli, invoice jasa gudang.
-- Aturan (PRD): pesanan draf tidak boleh melebihi stok tersedia dikurangi pesanan draf lain; pengiriman mengurangi stok dan
-- menerbitkan invoice (jatuh tempo bawaan 14 hari); tagihan memakai berat diterima pembeli bila dicatat; tidak ada hapus.

create sequence public.sales_order_kode_seq;
create sequence public.invoice_kode_seq;
create sequence public.customer_payment_kode_seq;

-- Izin Fase 5a. Petugas lapangan mencatat kirim; Finance menerbitkan invoice dan menerima bayar; Super Admin membuat pesanan.
insert into public.role_permissions (role_id, aksi) values
  ('finance', 'penjualan.read'),
  ('finance', 'invoice.write'),
  ('finance', 'terima_bayar.write'),
  ('super_admin', 'penjualan.read'),
  ('super_admin', 'penjualan.write'),
  ('super_admin', 'pengiriman.write'),
  ('super_admin', 'invoice.write'),
  ('kepala_produksi', 'penjualan.read'),
  ('kepala_produksi', 'pengiriman.write'),
  ('petugas_lapangan', 'penjualan.read'),
  ('petugas_lapangan', 'pengiriman.write');

-- Kelompok produk menentukan baris laba rugi (loin, hasil samping, ikan utuh).
alter table public.products add column kelompok text not null default 'loin' check (kelompok in ('utuh', 'loin', 'hasil_samping', 'lainnya'));
update public.products set kelompok = 'utuh' where nama = 'Tuna utuh';
alter table public.storage_units add column kelompok text not null default 'loin';
-- Unit stok selalu membawa kelompok produknya (dipakai laporan laba rugi), tanpa mengubah fungsi stok yang sudah ada.
create or replace function private.set_kelompok_unit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.kelompok into new.kelompok from public.products p where p.id = new.product_id;
  return new;
end;
$$;
revoke all on function private.set_kelompok_unit() from public, anon, authenticated;
create trigger storage_units_kelompok before insert on public.storage_units
  for each row execute function private.set_kelompok_unit();

-- Dokumen boleh dilampirkan ke invoice, pembayaran pembeli, pesanan, dan (Fase 5b) biaya.
alter table public.documents drop constraint documents_ref_tabel_check;
alter table public.documents add constraint documents_ref_tabel_check
  check (ref_tabel in ('purchase_orders', 'payments', 'lots', 'sales_orders', 'invoices', 'customer_payments', 'expenses'));

-- ------------------------------------------------------------ pesanan
create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('PJ-' || lpad(nextval('public.sales_order_kode_seq')::text, 4, '0')),
  buyer_id uuid not null references public.buyers (id),
  buyer_nama text not null,
  cycle_id uuid references public.cycles (id),
  tanggal date not null default current_date,
  tempo_hari int not null default 14 check (tempo_hari between 0 and 365),
  status text not null default 'draf' check (status in ('draf', 'terkirim', 'dibatalkan')),
  catatan text not null default '',
  alasan_batal text not null default '',
  dikirim_pada timestamptz,
  dikirim_oleh uuid,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create index sales_orders_buyer_idx on public.sales_orders (buyer_id, status);
create index sales_orders_cycle_idx on public.sales_orders (cycle_id);

-- Satu pesanan boleh mengambil dari beberapa unit stok (dan satu unit dari beberapa pesanan): banyak-ke-banyak.
-- Baris yang dibuang dari pesanan draf ditandai batal, bukan dihapus.
create table public.sale_allocations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sales_orders (id),
  unit_id uuid not null references public.storage_units (id),
  unit_kode text not null,
  production_id uuid references public.productions (id),
  product_nama text not null,
  grade_kode text,
  kelompok text not null default 'loin',
  kg_pesan numeric(12,3) not null check (kg_pesan > 0),
  harga_per_kg numeric(16,2) not null check (harga_per_kg > 0),
  kg_kirim numeric(12,3) check (kg_kirim is null or kg_kirim > 0),
  kg_diterima numeric(12,3) check (kg_diterima is null or kg_diterima > 0),
  batal boolean not null default false,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create index sale_allocations_order_idx on public.sale_allocations (order_id);
create index sale_allocations_unit_idx on public.sale_allocations (unit_id) where not batal;

-- ------------------------------------------------------------ invoice
alter table public.service_charges add column invoice_id uuid;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('INV-' || lpad(nextval('public.invoice_kode_seq')::text, 4, '0')),
  jenis text not null check (jenis in ('penjualan', 'gudang_dingin')),
  buyer_id uuid not null references public.buyers (id),
  buyer_nama text not null,
  order_id uuid references public.sales_orders (id),
  cycle_id uuid references public.cycles (id),
  tanggal date not null default current_date,
  jatuh_tempo date not null,
  total numeric(16,2) not null check (total > 0),
  baris jsonb not null default '[]'::jsonb,
  catatan text not null default '',
  status text not null default 'terbit' check (status in ('terbit', 'dibatalkan')),
  alasan_batal text not null default '',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create unique index invoices_pesanan_aktif_unik on public.invoices (order_id) where status = 'terbit' and order_id is not null;
create index invoices_buyer_idx on public.invoices (buyer_id, status);
create index invoices_cycle_idx on public.invoices (cycle_id);
alter table public.service_charges add constraint service_charges_invoice_fk foreign key (invoice_id) references public.invoices (id);

create table public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('TRM-' || lpad(nextval('public.customer_payment_kode_seq')::text, 4, '0')),
  invoice_id uuid not null references public.invoices (id),
  jumlah numeric(16,2) not null check (jumlah > 0),
  tanggal date not null default current_date,
  catatan text not null default '',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid()
);
create index customer_payments_invoice_idx on public.customer_payments (invoice_id);

select private.pasang_aturan_tabel('public.sales_orders');
select private.pasang_aturan_tabel('public.sale_allocations');
select private.pasang_aturan_tabel('public.invoices');
select private.pasang_aturan_tabel('public.customer_payments', false);

revoke insert, update on public.sales_orders, public.sale_allocations, public.invoices, public.customer_payments from authenticated;

create policy "pesanan terbaca" on public.sales_orders for select to authenticated using ((select private.has_permission('penjualan.read')));
create policy "alokasi penjualan terbaca" on public.sale_allocations for select to authenticated using ((select private.has_permission('penjualan.read')));
create policy "invoice terbaca" on public.invoices for select to authenticated using ((select private.has_permission('penjualan.read')));
create policy "pembayaran pembeli terbaca" on public.customer_payments for select to authenticated using ((select private.has_permission('penjualan.read')));

-- ----------------------------------------------------------- tampilan
create view public.v_sales_orders with (security_invoker = true) as
select
  o.id, o.kode, o.buyer_id, o.buyer_nama, o.cycle_id, c.kode as siklus_kode, o.tanggal, o.tempo_hari, o.status, o.catatan, o.alasan_batal, o.dikirim_pada,
  coalesce(a.jumlah_baris, 0)::int as jumlah_baris,
  coalesce(a.kg_pesan, 0)::numeric(12,3) as kg_pesan,
  coalesce(a.total_pesan, 0)::numeric(16,2) as total_pesan,
  coalesce(a.kg_final, 0)::numeric(12,3) as kg_final,
  coalesce(a.total_final, 0)::numeric(16,2) as total_final,
  i.id as invoice_id, i.kode as invoice_kode
from public.sales_orders o
left join public.cycles c on c.id = o.cycle_id
left join lateral (
  select count(*) as jumlah_baris, sum(x.kg_pesan) as kg_pesan, sum(round(x.kg_pesan * x.harga_per_kg, 2)) as total_pesan,
         sum(coalesce(x.kg_diterima, x.kg_kirim)) as kg_final,
         sum(round(coalesce(x.kg_diterima, x.kg_kirim) * x.harga_per_kg, 2)) as total_final
  from public.sale_allocations x where x.order_id = o.id and not x.batal
) a on true
left join lateral (select id, kode from public.invoices where order_id = o.id and status = 'terbit' limit 1) i on true;

-- Status tagihan: belum jatuh tempo, jatuh tempo (hari ini), terlambat, lunas. Tanggal dihitung dengan jam Indonesia.
create view public.v_invoices with (security_invoker = true) as
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
  greatest(0, (now() at time zone 'Asia/Jakarta')::date - i.jatuh_tempo)::int as hari_telat
from public.invoices i
left join lateral (select sum(jumlah) as dibayar from public.customer_payments where invoice_id = i.id) p on true;

revoke all on public.v_sales_orders, public.v_invoices from anon;

-- ------------------------------------------------------------ fungsi
create or replace function public.simpan_pesanan(p_order uuid, p_buyer uuid, p_cycle uuid, p_tanggal date, p_catatan text, p_baris jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  b public.buyers;
  r record;
  u public.storage_units;
  id_o uuid;
  id_baris uuid;
  ids uuid[] := array[]::uuid[];
  kurang record;
begin
  perform private.wajib_izin('penjualan.write');
  select * into b from public.buyers where id = p_buyer and aktif;
  if not found then
    raise exception 'Pilih pembeli.' using errcode = 'KT001';
  end if;
  if p_baris is null or jsonb_typeof(p_baris) <> 'array' or jsonb_array_length(p_baris) = 0 then
    raise exception 'Isi minimal satu baris pesanan.' using errcode = 'KT001';
  end if;
  if p_cycle is not null and not exists (select 1 from public.cycles where id = p_cycle) then
    raise exception 'Siklus tidak ditemukan.' using errcode = 'KT001';
  end if;

  if p_order is null then
    insert into public.sales_orders (buyer_id, buyer_nama, cycle_id, tanggal, tempo_hari, catatan)
    values (b.id, b.nama, p_cycle, coalesce(p_tanggal, current_date), b.tempo_hari, coalesce(p_catatan, ''))
    returning id into id_o;
  else
    select * into o from public.sales_orders where id = p_order for update;
    if not found then
      raise exception 'Pesanan tidak ditemukan.' using errcode = 'KT001';
    end if;
    if o.status <> 'draf' then
      raise exception 'Pesanan % sudah % dan tidak bisa diubah.', o.kode, o.status using errcode = 'KT001';
    end if;
    update public.sales_orders
    set buyer_id = b.id, buyer_nama = b.nama, cycle_id = p_cycle, tanggal = coalesce(p_tanggal, tanggal), tempo_hari = b.tempo_hari, catatan = coalesce(p_catatan, '')
    where id = o.id;
    id_o := o.id;
  end if;

  for r in select * from jsonb_to_recordset(p_baris) as x(id uuid, unit_id uuid, kg numeric, harga numeric) order by unit_id loop
    perform private.valid_kg(r.kg, 'Berat pesanan');
    if r.harga is null or r.harga <= 0 or round(r.harga, 2) <> r.harga then
      raise exception 'Harga per kg harus lebih dari nol dengan paling banyak dua desimal.' using errcode = 'KT001';
    end if;
    select * into u from public.storage_units where id = r.unit_id for update;
    if not found or u.status <> 'aktif' then
      raise exception 'Unit stok tidak ditemukan atau sudah habis.' using errcode = 'KT001';
    end if;
    if u.buyer_id is not null then
      raise exception 'Unit % adalah titipan pelanggan, tidak bisa dijual.', u.kode using errcode = 'KT001';
    end if;
    if r.id is not null then
      update public.sale_allocations
      set unit_id = u.id, unit_kode = u.kode, production_id = u.production_id, product_nama = u.product_nama, grade_kode = u.grade_kode, kelompok = u.kelompok,
          kg_pesan = r.kg, harga_per_kg = r.harga
      where id = r.id and order_id = id_o and not batal
      returning id into id_baris;
      if id_baris is null then
        raise exception 'Baris pesanan tidak ditemukan.' using errcode = 'KT001';
      end if;
    else
      insert into public.sale_allocations (order_id, unit_id, unit_kode, production_id, product_nama, grade_kode, kelompok, kg_pesan, harga_per_kg)
      values (id_o, u.id, u.kode, u.production_id, u.product_nama, u.grade_kode, u.kelompok, r.kg, r.harga)
      returning id into id_baris;
    end if;
    ids := ids || id_baris;
  end loop;

  update public.sale_allocations set batal = true where order_id = id_o and not batal and id <> all(ids);

  -- Tidak boleh melebihi stok tersedia = sisa unit dikurangi pesanan draf lain.
  select su.kode as kode, su.sisa_kg as sisa,
         coalesce((select sum(a2.kg_pesan) from public.sale_allocations a2 join public.sales_orders s2 on s2.id = a2.order_id
                   where a2.unit_id = su.id and not a2.batal and s2.status = 'draf' and s2.id <> id_o), 0) as dipesan_lain,
         sum(a.kg_pesan) as diminta
  into kurang
  from public.sale_allocations a join public.storage_units su on su.id = a.unit_id
  where a.order_id = id_o and not a.batal
  group by su.id, su.kode, su.sisa_kg
  having sum(a.kg_pesan) > su.sisa_kg - coalesce((select sum(a2.kg_pesan) from public.sale_allocations a2 join public.sales_orders s2 on s2.id = a2.order_id
                   where a2.unit_id = su.id and not a2.batal and s2.status = 'draf' and s2.id <> id_o), 0)
  limit 1;
  if found then
    raise exception 'Stok % tidak cukup: sisa % kg, sudah dipesan pesanan lain % kg, diminta % kg.', kurang.kode, kurang.sisa::text, kurang.dipesan_lain::text, kurang.diminta::text using errcode = 'KT001';
  end if;
  return id_o;
end;
$$;

create or replace function public.batalkan_pesanan(p_order uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
begin
  perform private.wajib_izin('penjualan.write');
  select * into o from public.sales_orders where id = p_order for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'KT001';
  end if;
  if o.status <> 'draf' then
    raise exception 'Hanya pesanan draf yang bisa dibatalkan. Pesanan % sudah %.', o.kode, o.status using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan membatalkan pesanan.' using errcode = 'KT001';
  end if;
  update public.sales_orders set status = 'dibatalkan', alasan_batal = trim(p_alasan) where id = o.id;
end;
$$;

-- p_baris: [{"id": alokasi, "kg_kirim": 49.5, "kg_diterima": null}, ...] untuk semua baris pesanan. Stok berkurang sebesar berat kirim.
create or replace function public.kirim_pesanan(p_order uuid, p_baris jsonb)
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
  porsi numeric(12,3);
begin
  perform private.wajib_izin('pengiriman.write');
  select * into o from public.sales_orders where id = p_order for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'KT001';
  end if;
  if o.status <> 'draf' then
    raise exception 'Pesanan % sudah % dan tidak bisa dikirim lagi.', o.kode, o.status using errcode = 'KT001';
  end if;
  if p_baris is null or jsonb_typeof(p_baris) <> 'array' then
    raise exception 'Isi berat kirim untuk semua baris.' using errcode = 'KT001';
  end if;
  if (select count(*) from public.sale_allocations where order_id = o.id and not batal) <> jsonb_array_length(p_baris) then
    raise exception 'Isi berat kirim untuk semua baris pesanan.' using errcode = 'KT001';
  end if;

  for r in select * from jsonb_to_recordset(p_baris) as x(id uuid, kg_kirim numeric, kg_diterima numeric) order by id loop
    select * into a from public.sale_allocations where id = r.id and order_id = o.id and not batal;
    if not found then
      raise exception 'Baris pesanan tidak ditemukan.' using errcode = 'KT001';
    end if;
    perform private.valid_kg(r.kg_kirim, 'Berat kirim');
    if r.kg_diterima is not null then
      perform private.valid_kg(r.kg_diterima, 'Berat diterima pembeli');
      if r.kg_diterima > r.kg_kirim then
        raise exception 'Berat diterima pembeli tidak boleh lebih dari berat kirim.' using errcode = 'KT001';
      end if;
    end if;
    select * into u from public.storage_units where id = a.unit_id for update;
    if u.status <> 'aktif' or r.kg_kirim > u.sisa_kg then
      raise exception 'Stok % hanya tersisa % kg, tidak cukup untuk dikirim % kg.', u.kode, u.sisa_kg::text, r.kg_kirim::text using errcode = 'KT001';
    end if;
    porsi := case when r.kg_kirim = u.sisa_kg then u.sisa_dasar_masuk else round(u.sisa_dasar_masuk * r.kg_kirim / u.sisa_kg, 3) end;
    update public.storage_units
    set sisa_kg = sisa_kg - r.kg_kirim, sisa_dasar_masuk = sisa_dasar_masuk - porsi, status = case when sisa_kg - r.kg_kirim = 0 then 'habis' else 'aktif' end
    where id = u.id;
    insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan) values (u.id, 'keluar', r.kg_kirim, porsi, 'Penjualan ' || o.kode);
    update public.sale_allocations set kg_kirim = r.kg_kirim, kg_diterima = r.kg_diterima where id = a.id;
  end loop;

  update public.sales_orders set status = 'terkirim', dikirim_pada = now(), dikirim_oleh = (select auth.uid()) where id = o.id;
end;
$$;

-- Berat diterima pembeli menyusul setelah kirim; hanya boleh sebelum invoice terbit (invoice memakai berat ini).
create or replace function public.catat_berat_diterima(p_order uuid, p_baris jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  r record;
  a public.sale_allocations;
begin
  if not (private.has_permission('invoice.write') or private.has_permission('pengiriman.write')) then
    raise exception 'Peran Anda tidak boleh mencatat berat diterima.' using errcode = '42501';
  end if;
  select * into o from public.sales_orders where id = p_order for update;
  if not found or o.status <> 'terkirim' then
    raise exception 'Pesanan belum dikirim atau tidak ditemukan.' using errcode = 'KT001';
  end if;
  if exists (select 1 from public.invoices where order_id = o.id and status = 'terbit') then
    raise exception 'Invoice pesanan % sudah terbit. Batalkan invoice dulu bila berat perlu diubah.', o.kode using errcode = 'KT001';
  end if;
  for r in select * from jsonb_to_recordset(coalesce(p_baris, '[]'::jsonb)) as x(id uuid, kg_diterima numeric) loop
    select * into a from public.sale_allocations where id = r.id and order_id = o.id and not batal;
    if not found then
      raise exception 'Baris pesanan tidak ditemukan.' using errcode = 'KT001';
    end if;
    perform private.valid_kg(r.kg_diterima, 'Berat diterima pembeli');
    if r.kg_diterima > a.kg_kirim then
      raise exception 'Berat diterima pembeli tidak boleh lebih dari berat kirim.' using errcode = 'KT001';
    end if;
    update public.sale_allocations set kg_diterima = r.kg_diterima where id = a.id;
  end loop;
end;
$$;

create or replace function public.terbitkan_invoice(p_order uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  baris jsonb;
  total numeric(16,2);
  id_inv uuid;
begin
  perform private.wajib_izin('invoice.write');
  select * into o from public.sales_orders where id = p_order for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'KT001';
  end if;
  if o.status <> 'terkirim' then
    raise exception 'Invoice baru bisa terbit setelah pesanan % dikirim.', o.kode using errcode = 'KT001';
  end if;
  if exists (select 1 from public.invoices where order_id = o.id and status = 'terbit') then
    raise exception 'Invoice untuk pesanan % sudah terbit.', o.kode using errcode = 'KT001';
  end if;
  select jsonb_agg(jsonb_build_object(
           'uraian', a.product_nama || coalesce(' ' || a.grade_kode, ''), 'unit', a.unit_kode, 'kelompok', a.kelompok,
           'kg', coalesce(a.kg_diterima, a.kg_kirim), 'dasar', case when a.kg_diterima is not null then 'diterima pembeli' else 'dikirim' end,
           'harga_per_kg', a.harga_per_kg, 'jumlah', round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2)) order by a.dibuat_pada, a.id),
         sum(round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2))
  into baris, total
  from public.sale_allocations a where a.order_id = o.id and not a.batal;
  if total is null or total <= 0 then
    raise exception 'Pesanan % tidak punya nilai yang bisa ditagih.', o.kode using errcode = 'KT001';
  end if;
  insert into public.invoices (jenis, buyer_id, buyer_nama, order_id, cycle_id, tanggal, jatuh_tempo, total, baris)
  values ('penjualan', o.buyer_id, o.buyer_nama, o.id, o.cycle_id, (now() at time zone 'Asia/Jakarta')::date,
          (now() at time zone 'Asia/Jakarta')::date + o.tempo_hari, total, baris)
  returning id into id_inv;
  return id_inv;
end;
$$;

-- Invoice jasa gudang dingin dari tagihan jasa yang belum ditagihkan; rincian hitungan ikut tersimpan di baris invoice.
create or replace function public.terbitkan_invoice_jasa(p_buyer uuid, p_charge_ids uuid[], p_catatan text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.buyers;
  n int;
  baris jsonb;
  total numeric(16,2);
  id_inv uuid;
begin
  perform private.wajib_izin('invoice.write');
  select * into b from public.buyers where id = p_buyer;
  if not found then
    raise exception 'Pelanggan tidak ditemukan.' using errcode = 'KT001';
  end if;
  if p_charge_ids is null or cardinality(p_charge_ids) = 0 then
    raise exception 'Pilih minimal satu tagihan jasa.' using errcode = 'KT001';
  end if;
  select count(*), jsonb_agg(jsonb_build_object(
           'uraian', 'Jasa ' || c.jenis || ' ' || c.kode, 'kg', c.kg_dasar, 'harga_per_kg', c.tarif_per_kg, 'hari', c.hari_ditagih,
           'jumlah', c.jumlah, 'rincian', c.rincian) order by c.dibuat_pada), sum(c.jumlah)
  into n, baris, total
  from public.service_charges c
  where c.id = any(p_charge_ids) and c.buyer_id = b.id and c.invoice_id is null;
  if n <> cardinality(p_charge_ids) then
    raise exception 'Sebagian tagihan jasa bukan milik pelanggan ini atau sudah ditagihkan.' using errcode = 'KT001';
  end if;
  if total is null or total <= 0 then
    raise exception 'Total tagihan jasa nol, tidak perlu invoice.' using errcode = 'KT001';
  end if;
  insert into public.invoices (jenis, buyer_id, buyer_nama, tanggal, jatuh_tempo, total, baris, catatan)
  values ('gudang_dingin', b.id, b.nama, (now() at time zone 'Asia/Jakarta')::date, (now() at time zone 'Asia/Jakarta')::date + b.tempo_hari, total, baris, coalesce(p_catatan, ''))
  returning id into id_inv;
  update public.service_charges set invoice_id = id_inv where id = any(p_charge_ids);
  return id_inv;
end;
$$;

create or replace function public.batalkan_invoice(p_invoice uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.invoices;
begin
  perform private.wajib_izin('invoice.write');
  select * into i from public.invoices where id = p_invoice for update;
  if not found or i.status <> 'terbit' then
    raise exception 'Invoice tidak ditemukan atau sudah dibatalkan.' using errcode = 'KT001';
  end if;
  if exists (select 1 from public.customer_payments where invoice_id = i.id) then
    raise exception 'Invoice % sudah ada pembayaran, tidak bisa dibatalkan.', i.kode using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan membatalkan invoice.' using errcode = 'KT001';
  end if;
  update public.invoices set status = 'dibatalkan', alasan_batal = trim(p_alasan) where id = i.id;
  update public.service_charges set invoice_id = null where invoice_id = i.id;
end;
$$;

create or replace function public.terima_pembayaran(p_invoice uuid, p_jumlah numeric, p_tanggal date default current_date, p_catatan text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.invoices;
  sudah numeric(16,2);
  id_bayar uuid;
begin
  perform private.wajib_izin('terima_bayar.write');
  select * into i from public.invoices where id = p_invoice for update;
  if not found or i.status <> 'terbit' then
    raise exception 'Invoice tidak ditemukan atau sudah dibatalkan.' using errcode = 'KT001';
  end if;
  if p_jumlah is null or p_jumlah <= 0 or round(p_jumlah, 2) <> p_jumlah then
    raise exception 'Jumlah bayar harus lebih dari nol dengan paling banyak dua desimal.' using errcode = 'KT001';
  end if;
  select coalesce(sum(jumlah), 0) into sudah from public.customer_payments where invoice_id = i.id;
  if sudah + p_jumlah > i.total then
    raise exception 'Pembayaran melebihi tagihan. Sisa tagihan %.', (i.total - sudah)::text using errcode = 'KT001';
  end if;
  insert into public.customer_payments (invoice_id, jumlah, tanggal, catatan)
  values (i.id, p_jumlah, coalesce(p_tanggal, current_date), coalesce(p_catatan, ''))
  returning id into id_bayar;
  return id_bayar;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.simpan_pesanan(uuid, uuid, uuid, date, text, jsonb)',
    'public.batalkan_pesanan(uuid, text)',
    'public.kirim_pesanan(uuid, jsonb)',
    'public.catat_berat_diterima(uuid, jsonb)',
    'public.terbitkan_invoice(uuid)',
    'public.terbitkan_invoice_jasa(uuid, uuid[], text)',
    'public.batalkan_invoice(uuid, text)',
    'public.terima_pembayaran(uuid, numeric, date, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
