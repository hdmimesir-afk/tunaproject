-- Fase 5b · Keuangan (biaya dengan nota, buku kas), penelusuran siklus, laba rugi, harga beli, ringkasan harian, dashboard.
-- Aturan (PRD): biaya yang mewajibkan nota tidak bisa diajukan tanpa nota; biaya baru berlaku setelah disetujui Owner;
-- buku kas hanya bertambah (tanpa ubah/hapus); semua laporan memakai izin pembacanya (security_invoker).

create sequence public.expense_kode_seq;
create sequence public.ledger_kode_seq;

-- Izin Fase 5b. Persetujuan biaya (biaya.setuju) hanya Owner karena Owner memegang semua izin.
insert into public.role_permissions (role_id, aksi) values
  ('finance', 'keuangan.read'),
  ('finance', 'keuangan.write'),
  ('finance', 'laporan.read'),
  ('super_admin', 'keuangan.read'),
  ('super_admin', 'keuangan.write'),
  ('super_admin', 'laporan.read');

alter table public.expense_categories add column nota_wajib boolean not null default true;

-- ------------------------------------------------------------- biaya
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('BYA-' || lpad(nextval('public.expense_kode_seq')::text, 4, '0')),
  category_id uuid not null references public.expense_categories (id),
  kategori_nama text not null,
  uraian text not null check (length(trim(uraian)) > 0),
  jumlah numeric(16,2) not null check (jumlah > 0),
  tanggal date not null default current_date,
  cycle_id uuid references public.cycles (id),
  po_id uuid references public.purchase_orders (id),
  production_id uuid references public.productions (id),
  status text not null default 'draf' check (status in ('draf', 'diajukan', 'disetujui', 'ditolak')),
  alasan_tolak text not null default '',
  diajukan_oleh uuid,
  diajukan_pada timestamptz,
  diputuskan_oleh uuid,
  diputuskan_pada timestamptz,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create index expenses_status_idx on public.expenses (status, tanggal desc);
create index expenses_cycle_idx on public.expenses (cycle_id);

-- ---------------------------------------------------------- buku kas
-- Uang masuk dan keluar. Baris sistem dibuat otomatis oleh pemicu dari pembayaran pemasok, pembayaran pembeli, dan biaya yang disetujui.
create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('KAS-' || lpad(nextval('public.ledger_kode_seq')::text, 5, '0')),
  tanggal date not null,
  arah text not null check (arah in ('masuk', 'keluar')),
  kategori_nama text not null,
  uraian text not null,
  jumlah numeric(16,2) not null check (jumlah > 0),
  ref_tabel text,
  ref_id uuid,
  cycle_id uuid references public.cycles (id),
  sumber text not null default 'sistem' check (sumber in ('sistem', 'impor')),
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid()
);
create unique index ledger_ref_unik on public.ledger (ref_tabel, ref_id) where ref_tabel is not null;
create index ledger_tanggal_idx on public.ledger (tanggal desc);
create index ledger_cycle_idx on public.ledger (cycle_id);

select private.pasang_aturan_tabel('public.expenses');
select private.pasang_aturan_tabel('public.ledger', false);
revoke insert, update on public.expenses, public.ledger from authenticated;

create policy "biaya terbaca" on public.expenses for select to authenticated using ((select private.has_permission('keuangan.read')));
create policy "buku kas terbaca" on public.ledger for select to authenticated using ((select private.has_permission('keuangan.read')));

create or replace function private.catat_kas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  po public.purchase_orders;
  inv public.invoices;
begin
  if tg_table_name = 'payments' then
    select * into po from public.purchase_orders where id = new.po_id;
    insert into public.ledger (tanggal, arah, kategori_nama, uraian, jumlah, ref_tabel, ref_id, cycle_id)
    values (new.tanggal, 'keluar', 'Bahan baku', 'Bayar pemasok ' || po.kode || ' (' || new.kode || ')', new.jumlah, 'payments', new.id, po.cycle_id);
  elsif tg_table_name = 'customer_payments' then
    select * into inv from public.invoices where id = new.invoice_id;
    insert into public.ledger (tanggal, arah, kategori_nama, uraian, jumlah, ref_tabel, ref_id, cycle_id)
    values (new.tanggal, 'masuk', 'Penerimaan penjualan', 'Bayar ' || inv.kode || ' ' || inv.buyer_nama || ' (' || new.kode || ')', new.jumlah, 'customer_payments', new.id, inv.cycle_id);
  elsif tg_table_name = 'expenses' and new.status = 'disetujui' and old.status is distinct from 'disetujui' then
    insert into public.ledger (tanggal, arah, kategori_nama, uraian, jumlah, ref_tabel, ref_id, cycle_id)
    values (new.tanggal, 'keluar', new.kategori_nama, new.kode || ' ' || new.uraian, new.jumlah, 'expenses', new.id, new.cycle_id);
  end if;
  return new;
end;
$$;
revoke all on function private.catat_kas() from public, anon, authenticated;
create trigger payments_kas after insert on public.payments for each row execute function private.catat_kas();
create trigger customer_payments_kas after insert on public.customer_payments for each row execute function private.catat_kas();
create trigger expenses_kas after update on public.expenses for each row execute function private.catat_kas();

-- ------------------------------------------------------ fungsi biaya
create or replace function public.simpan_biaya(
  p_id uuid, p_category uuid, p_uraian text, p_jumlah numeric, p_tanggal date, p_cycle uuid, p_po uuid default null, p_production uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  k public.expense_categories;
  e public.expenses;
  id_e uuid;
begin
  perform private.wajib_izin('keuangan.write');
  select * into k from public.expense_categories where id = p_category and aktif;
  if not found then
    raise exception 'Pilih kategori biaya.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_uraian, ''))) = 0 then
    raise exception 'Tulis uraian biaya.' using errcode = 'KT001';
  end if;
  if p_jumlah is null or p_jumlah <= 0 or round(p_jumlah, 2) <> p_jumlah then
    raise exception 'Jumlah biaya harus lebih dari nol dengan paling banyak dua desimal.' using errcode = 'KT001';
  end if;
  if p_po is not null and not exists (select 1 from public.purchase_orders where id = p_po) then
    raise exception 'PO tidak ditemukan.' using errcode = 'KT001';
  end if;
  if p_id is null then
    insert into public.expenses (category_id, kategori_nama, uraian, jumlah, tanggal, cycle_id, po_id, production_id)
    values (k.id, k.nama, trim(p_uraian), p_jumlah, coalesce(p_tanggal, current_date), p_cycle, p_po, p_production)
    returning id into id_e;
  else
    select * into e from public.expenses where id = p_id for update;
    if not found then
      raise exception 'Biaya tidak ditemukan.' using errcode = 'KT001';
    end if;
    if e.status not in ('draf', 'ditolak') then
      raise exception 'Biaya % sudah % dan tidak bisa diubah.', e.kode, e.status using errcode = 'KT001';
    end if;
    update public.expenses
    set category_id = k.id, kategori_nama = k.nama, uraian = trim(p_uraian), jumlah = p_jumlah, tanggal = coalesce(p_tanggal, tanggal),
        cycle_id = p_cycle, po_id = p_po, production_id = p_production, status = 'draf', alasan_tolak = ''
    where id = e.id;
    id_e := e.id;
  end if;
  return id_e;
end;
$$;

create or replace function public.ajukan_biaya(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.expenses;
  k public.expense_categories;
begin
  perform private.wajib_izin('keuangan.write');
  select * into e from public.expenses where id = p_id for update;
  if not found then
    raise exception 'Biaya tidak ditemukan.' using errcode = 'KT001';
  end if;
  if e.status <> 'draf' then
    raise exception 'Biaya % tidak bisa diajukan dari status %.', e.kode, e.status using errcode = 'KT001';
  end if;
  select * into k from public.expense_categories where id = e.category_id;
  if k.nota_wajib and not exists (select 1 from public.documents d where d.ref_tabel = 'expenses' and d.ref_id = e.id and d.jenis = 'nota') then
    raise exception 'Lampirkan nota sebelum mengajukan biaya kategori %.', k.nama using errcode = 'KT001';
  end if;
  update public.expenses set status = 'diajukan', diajukan_oleh = (select auth.uid()), diajukan_pada = now() where id = e.id;
end;
$$;

create or replace function public.putuskan_biaya(p_id uuid, p_setuju boolean, p_catatan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.expenses;
begin
  perform private.wajib_izin('biaya.setuju');
  select * into e from public.expenses where id = p_id for update;
  if not found or e.status <> 'diajukan' then
    raise exception 'Biaya tidak ditemukan atau tidak sedang menunggu keputusan.' using errcode = 'KT001';
  end if;
  if not coalesce(p_setuju, false) and length(trim(coalesce(p_catatan, ''))) = 0 then
    raise exception 'Tulis alasan menolak biaya.' using errcode = 'KT001';
  end if;
  update public.expenses
  set status = case when p_setuju then 'disetujui' else 'ditolak' end,
      alasan_tolak = case when p_setuju then '' else trim(p_catatan) end,
      diputuskan_oleh = (select auth.uid()), diputuskan_pada = now()
  where id = e.id;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.simpan_biaya(uuid, uuid, text, numeric, date, uuid, uuid, uuid)', 'public.ajukan_biaya(uuid)', 'public.putuskan_biaya(uuid, boolean, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- ----------------------------------------------------------- tampilan
create view public.v_expenses with (security_invoker = true) as
select
  e.id, e.kode, e.category_id, e.kategori_nama, e.uraian, e.jumlah, e.tanggal, e.cycle_id, c.kode as siklus_kode, e.po_id, p.kode as po_kode, e.production_id,
  e.status, e.alasan_tolak, e.diajukan_oleh, e.diajukan_pada, e.diputuskan_oleh, e.diputuskan_pada,
  (select count(*) from public.documents d where d.ref_tabel = 'expenses' and d.ref_id = e.id and d.jenis = 'nota')::int as jml_nota,
  k.nota_wajib
from public.expenses e
left join public.cycles c on c.id = e.cycle_id
left join public.purchase_orders p on p.id = e.po_id
left join public.expense_categories k on k.id = e.category_id;

-- Laba rugi ringkas per siklus (pendapatan dari penjualan terkirim; biaya = ikan dari PO disetujui + biaya lain disetujui).
-- Rincian per grade dan per kategori dihitung di aplikasi dari baris yang sama (lib/logic/labarugi.ts).
create view public.v_laba_rugi_siklus with (security_invoker = true) as
select
  c.id as cycle_id, c.kode, c.ref_po_pembeli, c.status,
  coalesce(j.pendapatan_loin, 0)::numeric(16,2) as pendapatan_loin,
  coalesce(j.pendapatan_samping, 0)::numeric(16,2) as pendapatan_samping,
  coalesce(j.pendapatan_total, 0)::numeric(16,2) as pendapatan_total,
  coalesce(j.kg_loin_terjual, 0)::numeric(12,3) as kg_loin_terjual,
  coalesce(b.biaya_ikan, 0)::numeric(16,2) as biaya_ikan,
  coalesce(b.kg_ikan, 0)::numeric(12,3) as kg_ikan,
  coalesce(x.biaya_lain, 0)::numeric(16,2) as biaya_lain,
  (coalesce(b.biaya_ikan, 0) + coalesce(x.biaya_lain, 0))::numeric(16,2) as biaya_total,
  (coalesce(j.pendapatan_total, 0) - coalesce(b.biaya_ikan, 0) - coalesce(x.biaya_lain, 0))::numeric(16,2) as laba_kotor,
  case when coalesce(j.pendapatan_total, 0) > 0
    then round((coalesce(j.pendapatan_total, 0) - coalesce(b.biaya_ikan, 0) - coalesce(x.biaya_lain, 0)) / j.pendapatan_total * 100, 1)
  end as margin_pct,
  coalesce(pr.loin_kg, 0)::numeric(12,3) as loin_kg
from public.cycles c
left join lateral (
  select
    sum(round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2)) filter (where a.kelompok = 'loin') as pendapatan_loin,
    sum(round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2)) filter (where a.kelompok <> 'loin') as pendapatan_samping,
    sum(round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2)) as pendapatan_total,
    sum(coalesce(a.kg_diterima, a.kg_kirim)) filter (where a.kelompok = 'loin') as kg_loin_terjual
  from public.sale_allocations a join public.sales_orders s on s.id = a.order_id
  where s.cycle_id = c.id and s.status = 'terkirim' and not a.batal
) j on true
left join lateral (
  select sum(po.total) as biaya_ikan, sum(po.kg) as kg_ikan
  from public.purchase_orders po where po.cycle_id = c.id and po.status_persetujuan = 'disetujui'
) b on true
left join lateral (
  select sum(e.jumlah) as biaya_lain from public.expenses e where e.cycle_id = c.id and e.status = 'disetujui'
) x on true
left join lateral (
  select sum(n.loin_kg) as loin_kg
  from public.productions p join public.v_neraca_produksi n on n.production_id = p.id where p.cycle_id = c.id
) pr on true;

-- Harga beli per hari, pemasok, dan kelas mutu. Rata-rata tertimbang dihitung dari jumlah nilai dan jumlah kg di aplikasi.
-- Harga tersimpan di PO saat diajukan, jadi harga baru tidak mengubah transaksi lama.
create view public.v_harga_beli with (security_invoker = true) as
select
  l.tanggal_terima as tanggal, l.supplier_id, coalesce(s.nama, '-') as supplier_nama,
  coalesce(g.kode, 'Belum dinilai') as grade_kode,
  sum(l.kg)::numeric(12,3) as kg,
  sum(round(l.kg * po.harga_per_kg, 2))::numeric(16,2) as nilai,
  count(*)::int as jumlah_lot
from public.lots l
join public.purchase_orders po on po.id = l.po_id
left join public.suppliers s on s.id = l.supplier_id
left join public.grades g on g.id = l.grade_id
group by l.tanggal_terima, l.supplier_id, s.nama, g.kode;

-- Ringkasan harian: transaksi, nilai beli, hasil produksi, kiriman, uang masuk dan keluar.
create view public.v_ringkasan_harian with (security_invoker = true) as
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
  union all select tanggal, arah, jumlah, 1 from public.ledger
) x
group by tanggal;

-- Satu baris per siklus: dari beli sampai uang masuk.
create view public.v_rincian_siklus with (security_invoker = true) as
select
  c.id as cycle_id, c.kode, c.ref_po_pembeli, c.no_bongkar, c.status, c.tanggal_bongkar,
  (select count(*) from public.purchase_orders po where po.cycle_id = c.id)::int as jumlah_po,
  (select coalesce(sum(po.total), 0) from public.purchase_orders po where po.cycle_id = c.id and po.status_persetujuan = 'disetujui')::numeric(16,2) as nilai_beli,
  (select coalesce(sum(l.kg), 0) from public.lots l where l.cycle_id = c.id)::numeric(12,3) as kg_diterima,
  (select count(*) from public.productions p where p.cycle_id = c.id)::int as jumlah_produksi,
  (select coalesce(sum(n.loin_kg), 0) from public.productions p join public.v_neraca_produksi n on n.production_id = p.id where p.cycle_id = c.id)::numeric(12,3) as loin_kg,
  (select count(*) from public.sales_orders s where s.cycle_id = c.id and s.status <> 'dibatalkan')::int as jumlah_pesanan,
  (select coalesce(sum(i.total), 0) from public.invoices i where i.cycle_id = c.id and i.status = 'terbit')::numeric(16,2) as nilai_invoice,
  (select coalesce(sum(cp.jumlah), 0) from public.customer_payments cp join public.invoices i on i.id = cp.invoice_id where i.cycle_id = c.id)::numeric(16,2) as uang_masuk,
  (select coalesce(sum(e.jumlah), 0) from public.expenses e where e.cycle_id = c.id and e.status = 'disetujui')::numeric(16,2) as biaya_lain
from public.cycles c;

-- Angka dashboard owner. Setiap angka mengikuti izin pembaca: yang tidak boleh melihat tabelnya mendapat nol.
create view public.v_dashboard with (security_invoker = true) as
select
  (select coalesce(sum(po.total), 0) from public.purchase_orders po where po.status_persetujuan = 'disetujui')::numeric(16,2)
    - (select coalesce(sum(p.jumlah), 0) from public.payments p)::numeric(16,2) as hutang_pemasok,
  (select coalesce(sum(i.sisa), 0) from public.v_invoices i where i.status_tagihan <> 'dibatalkan')::numeric(16,2) as piutang,
  (select count(*) from public.v_invoices i where i.status_tagihan = 'terlambat')::int as invoice_terlambat,
  (select coalesce(sum(i.sisa), 0) from public.v_invoices i where i.status_tagihan = 'terlambat')::numeric(16,2) as piutang_terlambat,
  (select coalesce(sum(l.jumlah), 0) from public.ledger l where l.arah = 'masuk' and date_trunc('month', l.tanggal) = date_trunc('month', (now() at time zone 'Asia/Jakarta')::date))::numeric(16,2) as kas_masuk_bulan_ini,
  (select coalesce(sum(l.jumlah), 0) from public.ledger l where l.arah = 'keluar' and date_trunc('month', l.tanggal) = date_trunc('month', (now() at time zone 'Asia/Jakarta')::date))::numeric(16,2) as kas_keluar_bulan_ini,
  (select count(*) from public.approvals a where a.status in ('diajukan', 'diperiksa'))::int as persetujuan_menunggu,
  (select count(*) from public.expenses e where e.status = 'diajukan')::int as biaya_menunggu,
  (select count(*) from public.storage_movements m where m.jenis = 'koreksi' and m.status = 'diajukan')::int as koreksi_menunggu,
  (select count(*) from public.productions p where p.status in ('selesai', 'diperiksa_qc'))::int as produksi_menunggu,
  (select count(*) from public.productions p where p.status = 'berjalan')::int as produksi_berjalan,
  (select count(*) from public.lots l where l.qc = 'menunggu')::int as lot_menunggu_mutu,
  (select coalesce(sum(u.sisa_kg), 0) from public.storage_units u where u.status = 'aktif' and u.buyer_id is null)::numeric(12,3) as stok_sendiri_kg,
  (select coalesce(sum(u.sisa_kg), 0) from public.storage_units u where u.status = 'aktif' and u.buyer_id is not null)::numeric(12,3) as stok_titipan_kg,
  (select count(*) from public.sales_orders s where s.status = 'draf')::int as pesanan_belum_dikirim,
  -- Transaksi tanpa bukti: PO yang diajukan/disetujui tanpa nota, biaya yang mewajibkan nota tanpa nota, pembayaran tanpa bukti transfer.
  (
    (select count(*) from public.purchase_orders po where po.status_persetujuan in ('diajukan', 'disetujui')
       and not exists (select 1 from public.documents d where d.ref_tabel = 'purchase_orders' and d.ref_id = po.id and d.jenis = 'nota'))
    + (select count(*) from public.expenses e join public.expense_categories k on k.id = e.category_id where e.status in ('diajukan', 'disetujui') and k.nota_wajib
       and not exists (select 1 from public.documents d where d.ref_tabel = 'expenses' and d.ref_id = e.id and d.jenis = 'nota'))
    + (select count(*) from public.payments p where not exists (select 1 from public.documents d where d.ref_tabel = 'payments' and d.ref_id = p.id))
    + (select count(*) from public.customer_payments cp where not exists (select 1 from public.documents d where d.ref_tabel = 'customer_payments' and d.ref_id = cp.id))
  )::int as dokumen_kurang;

revoke all on public.v_expenses, public.v_laba_rugi_siklus, public.v_harga_beli, public.v_ringkasan_harian, public.v_rincian_siklus, public.v_dashboard from anon;
