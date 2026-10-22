-- Fase 2 · Tabel pembelian, penerimaan ikan (lot), persetujuan, pembayaran, dokumen, dan bucket nota.
-- Aturan (PRD): status persetujuan terpisah dari status bayar; perubahan status hanya lewat fungsi
-- (migrasi berikutnya); tidak ada hapus; bukti dan nota tersimpan di bucket privat.

create sequence public.po_kode_seq;
create sequence public.lot_kode_seq;
create sequence public.approval_kode_seq;
create sequence public.payment_kode_seq;
grant usage on sequence public.po_kode_seq to authenticated;

-- Izin Fase 2. Penerima ikan (lapangan dan QC) sengaja tidak punya pembelian.read supaya tidak melihat harga.
insert into public.role_permissions (role_id, aksi) values
  ('finance', 'pembelian.read'),
  ('finance', 'persetujuan.read'),
  ('finance', 'persetujuan.periksa'),
  ('finance', 'pembayaran.write'),
  ('finance', 'dokumen.read'),
  ('finance', 'dokumen.write'),
  ('finance', 'mutu.read'),
  ('super_admin', 'pembelian.read'),
  ('super_admin', 'pembelian.write'),
  ('super_admin', 'persetujuan.read'),
  ('super_admin', 'dokumen.read'),
  ('super_admin', 'dokumen.write'),
  ('super_admin', 'mutu.read'),
  ('kepala_produksi', 'mutu.read'),
  ('kepala_produksi', 'mutu.write'),
  ('kepala_produksi', 'penerimaan.write'),
  ('kepala_produksi', 'dokumen.read'),
  ('kepala_produksi', 'dokumen.write'),
  ('petugas_lapangan', 'mutu.read'),
  ('petugas_lapangan', 'penerimaan.write'),
  ('petugas_lapangan', 'dokumen.read'),
  ('petugas_lapangan', 'dokumen.write');

-- ----------------------------------------------------------------- PO
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('PO-' || lpad(nextval('public.po_kode_seq')::text, 4, '0')),
  supplier_id uuid not null references public.suppliers (id),
  cycle_id uuid references public.cycles (id),
  tanggal date not null default current_date,
  kg numeric(12,3) not null check (kg > 0),
  harga_per_kg numeric(16,2) not null check (harga_per_kg > 0),
  total numeric(16,2) generated always as (round(kg * harga_per_kg, 2)) stored,
  catatan text not null default '',
  status_persetujuan text not null default 'draf'
    check (status_persetujuan in ('draf', 'diajukan', 'perlu_revisi', 'disetujui', 'ditolak')),
  harga_acuan numeric(16,2),
  diajukan_pada timestamptz,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create index purchase_orders_supplier_idx on public.purchase_orders (supplier_id, status_persetujuan);
create index purchase_orders_cycle_idx on public.purchase_orders (cycle_id);

-- --------------------------------------------------------------- lot
-- Satu lot per penerimaan. Dibuat hanya oleh fungsi terima_po.
create table public.lots (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('LOT-' || lpad(nextval('public.lot_kode_seq')::text, 3, '0')),
  po_id uuid not null references public.purchase_orders (id),
  po_kode text not null,
  supplier_id uuid not null references public.suppliers (id),
  cycle_id uuid references public.cycles (id),
  tanggal_terima date not null default current_date,
  kg numeric(12,3) not null check (kg > 0),
  sisa_kg numeric(12,3) not null check (sisa_kg >= 0),
  qc text not null default 'menunggu' check (qc in ('menunggu', 'lulus', 'ditahan')),
  grade_id uuid references public.grades (id),
  sebelum_disetujui boolean not null default false,
  catatan text not null default '',
  qc_oleh uuid,
  qc_pada timestamptz,
  qc_catatan text not null default '',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  check (sisa_kg <= kg),
  check (qc <> 'lulus' or grade_id is not null)
);
create index lots_po_idx on public.lots (po_id);
create index lots_qc_idx on public.lots (qc, tanggal_terima desc);

-- ------------------------------------------------------ persetujuan
-- Aturan per jenis transaksi: siapa memeriksa, siapa menyetujui (nama izin), dan apakah bukti wajib.
create table public.approval_rules (
  jenis text primary key,
  pemeriksa_aksi text not null,
  penyetuju_aksi text not null,
  bukti_wajib boolean not null default true,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
insert into public.approval_rules (jenis, pemeriksa_aksi, penyetuju_aksi, bukti_wajib)
values ('pembelian', 'persetujuan.periksa', 'persetujuan.setuju', true);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('APV-' || lpad(nextval('public.approval_kode_seq')::text, 4, '0')),
  jenis text not null references public.approval_rules (jenis),
  ref_tabel text not null,
  ref_id uuid not null,
  judul text not null,
  jumlah numeric(16,2) not null,
  status text not null default 'diajukan'
    check (status in ('diajukan', 'diperiksa', 'perlu_revisi', 'disetujui', 'ditolak')),
  payload jsonb not null default '{}'::jsonb,
  diajukan_oleh uuid not null,
  diajukan_pada timestamptz not null default now(),
  diperiksa_oleh uuid,
  diperiksa_pada timestamptz,
  catatan_periksa text not null default '',
  disetujui_oleh uuid,
  disetujui_pada timestamptz,
  catatan_revisi text not null default '',
  alasan_tolak text not null default '',
  batch_id uuid,
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
-- Satu pengajuan aktif per transaksi.
create unique index approvals_aktif_unik on public.approvals (ref_tabel, ref_id) where status in ('diajukan', 'diperiksa');
create index approvals_status_idx on public.approvals (status, diajukan_pada desc);

-- ------------------------------------------------------ pembayaran
-- Status bayar PO dihitung dari tabel ini. Baris tidak diubah; koreksi lewat baris pembalik (migrasi berikutnya).
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('BYR-' || lpad(nextval('public.payment_kode_seq')::text, 4, '0')),
  po_id uuid not null references public.purchase_orders (id),
  jumlah numeric(16,2) not null check (jumlah > 0),
  tanggal date not null default current_date,
  catatan text not null default '',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid()
);
create index payments_po_idx on public.payments (po_id);

-- --------------------------------------------------------- dokumen
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  ref_tabel text not null check (ref_tabel in ('purchase_orders', 'payments', 'lots')),
  ref_id uuid not null,
  jenis text not null check (jenis in ('nota', 'bukti_transfer', 'surat_jalan', 'foto_timbangan', 'lainnya')),
  path text not null unique,
  nama_asli text not null,
  ukuran bigint not null check (ukuran > 0),
  tipe text not null,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid()
);
create index documents_ref_idx on public.documents (ref_tabel, ref_id);

-- Aturan bersama: RLS aktif dan dipaksa, tolak hapus, jejak perubahan, diubah_pada.
select private.pasang_aturan_tabel('public.purchase_orders');
select private.pasang_aturan_tabel('public.lots');
select private.pasang_aturan_tabel('public.approval_rules');
select private.pasang_aturan_tabel('public.approvals');
select private.pasang_aturan_tabel('public.payments', false);
select private.pasang_aturan_tabel('public.documents', false);

-- Hak akses per kolom. Status, harga acuan, dan kolom turunan hanya diubah fungsi.
revoke insert, update on public.purchase_orders from authenticated;
grant insert (supplier_id, cycle_id, tanggal, kg, harga_per_kg, catatan) on public.purchase_orders to authenticated;
grant update (supplier_id, cycle_id, tanggal, kg, harga_per_kg, catatan) on public.purchase_orders to authenticated;
revoke insert, update on public.lots from authenticated;
revoke insert, update on public.approvals from authenticated;
revoke insert, update on public.approval_rules from authenticated;
revoke insert, update on public.payments from authenticated;
revoke insert, update on public.documents from authenticated;
grant insert (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe) on public.documents to authenticated;

-- ---------------------------------------------------------- kebijakan
create policy "po terbaca" on public.purchase_orders
  for select to authenticated using ((select private.has_permission('pembelian.read')));
create policy "po dibuat" on public.purchase_orders
  for insert to authenticated with check ((select private.has_permission('pembelian.write')));
create policy "po diubah saat draf atau revisi" on public.purchase_orders
  for update to authenticated
  using ((select private.has_permission('pembelian.write')) and status_persetujuan in ('draf', 'perlu_revisi'))
  with check ((select private.has_permission('pembelian.write')) and status_persetujuan in ('draf', 'perlu_revisi'));

create policy "lot terbaca" on public.lots
  for select to authenticated
  using ((select private.has_permission('mutu.read')) or (select private.has_permission('pembelian.read')));

create policy "aturan persetujuan terbaca" on public.approval_rules
  for select to authenticated using ((select private.has_permission('persetujuan.read')));
create policy "persetujuan terbaca" on public.approvals
  for select to authenticated using ((select private.has_permission('persetujuan.read')));

create policy "pembayaran terbaca" on public.payments
  for select to authenticated using ((select private.has_permission('pembelian.read')));

create policy "dokumen terbaca" on public.documents
  for select to authenticated using ((select private.has_permission('dokumen.read')));
create policy "dokumen dicatat" on public.documents
  for insert to authenticated with check ((select private.has_permission('dokumen.write')));

-- ---------------------------------------------------------- storage
-- Bucket privat untuk nota dan bukti. Tidak ada kebijakan hapus atau ubah: berkas tidak bisa dihapus dari aplikasi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dokumen', 'dokumen', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "dokumen terbaca" on storage.objects
  for select to authenticated
  using (bucket_id = 'dokumen' and (select private.has_permission('dokumen.read')));
create policy "dokumen diunggah" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dokumen' and (select private.has_permission('dokumen.write')));

-- ----------------------------------------------------------- tampilan
-- security_invoker: pembaca memakai izin dan RLS sendiri.
create view public.v_purchase_orders with (security_invoker = true) as
select
  po.id, po.kode, po.tanggal, po.supplier_id,
  coalesce(s.nama, '-') as supplier_nama,
  po.cycle_id, c.kode as siklus_kode,
  po.kg, po.harga_per_kg, po.total, po.catatan,
  po.status_persetujuan, po.harga_acuan, po.diajukan_pada,
  t.kg_diterima,
  case when t.n = 0 then 'belum' when t.kg_diterima >= po.kg then 'selesai' else 'sebagian' end as status_terima,
  b.total_bayar,
  case when b.total_bayar = 0 then 'belum' when b.total_bayar >= po.total then 'lunas' else 'sebagian' end as status_bayar
from public.purchase_orders po
left join public.suppliers s on s.id = po.supplier_id
left join public.cycles c on c.id = po.cycle_id
left join lateral (
  select count(*) as n, coalesce(sum(l.kg), 0)::numeric(12,3) as kg_diterima
  from public.lots l where l.po_id = po.id
) t on true
left join lateral (
  select coalesce(sum(p.jumlah), 0)::numeric(16,2) as total_bayar
  from public.payments p where p.po_id = po.id
) b on true;

create view public.v_persetujuan with (security_invoker = true) as
select
  a.id, a.kode, a.jenis, a.ref_tabel, a.ref_id, a.judul, a.jumlah, a.status, a.payload,
  a.diajukan_oleh, a.diajukan_pada, a.diperiksa_oleh, a.diperiksa_pada, a.catatan_periksa,
  a.disetujui_oleh, a.disetujui_pada, a.catatan_revisi, a.alasan_tolak, a.batch_id,
  po.kode as po_kode, po.kg as po_kg, po.harga_per_kg, po.harga_acuan,
  coalesce(s.nama, '-') as supplier_nama,
  (select count(*) from public.documents d where d.ref_tabel = 'purchase_orders' and d.ref_id = po.id and d.jenis = 'nota')::int as jml_nota
from public.approvals a
left join public.purchase_orders po on a.ref_tabel = 'purchase_orders' and po.id = a.ref_id
left join public.suppliers s on s.id = po.supplier_id;

revoke all on public.v_purchase_orders, public.v_persetujuan from anon;
