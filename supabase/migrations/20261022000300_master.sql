-- Fase 1 · Data master, pengaturan, dan siklus.
-- Data master tidak dihapus; yang tidak dipakai lagi dinonaktifkan (aktif = false).

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) > 0),
  kontak text not null default '',
  catatan text not null default '',
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create unique index suppliers_nama_unik on public.suppliers (lower(nama));

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) > 0),
  kontak text not null default '',
  tempo_hari int not null default 14 check (tempo_hari between 0 and 365),
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create unique index buyers_nama_unik on public.buyers (lower(nama));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) > 0),
  satuan text not null default 'kg',
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create unique index products_nama_unik on public.products (lower(nama));

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  kode text not null check (length(trim(kode)) > 0),
  nama text not null default '',
  urutan int not null default 0,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create unique index grades_kode_unik on public.grades (upper(kode));

-- Jenis komponen hasil produksi: hasil samping per jenis, limbah dan susut ditimbang total (keputusan owner 22 Okt).
create table public.component_categories (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) > 0),
  komponen text not null check (komponen in ('hasil_samping', 'limbah', 'susut')),
  urutan int not null default 0,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create unique index component_categories_nama_unik on public.component_categories (lower(nama));

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) > 0),
  urutan int not null default 0,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create unique index expense_categories_nama_unik on public.expense_categories (lower(nama));

-- Pengaturan yang bisa diubah tanpa programmer.
create table public.settings (
  kunci text primary key,
  nilai jsonb not null,
  keterangan text not null default '',
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);

-- Siklus: satu putaran dari beli ikan sampai uang masuk. Kode dibuat sistem; nomor PO pembeli dan nomor bongkar tetap bisa dicari.
create sequence public.cycles_kode_seq;
create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('SIK-' || lpad(nextval('public.cycles_kode_seq')::text, 4, '0')),
  tanggal_bongkar date,
  ref_po_pembeli text not null default '',
  no_bongkar text not null default '',
  catatan text not null default '',
  status text not null default 'terbuka' check (status in ('terbuka', 'ditutup')),
  ditutup_oleh uuid,
  ditutup_pada timestamptz,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create index cycles_ref_idx on public.cycles (ref_po_pembeli, no_bongkar);
grant usage on sequence public.cycles_kode_seq to authenticated;

-- Aturan bersama: RLS, tolak hapus, jejak, diubah_pada.
select private.pasang_aturan_tabel('public.suppliers');
select private.pasang_aturan_tabel('public.buyers');
select private.pasang_aturan_tabel('public.products');
select private.pasang_aturan_tabel('public.grades');
select private.pasang_aturan_tabel('public.component_categories');
select private.pasang_aturan_tabel('public.expense_categories');
select private.pasang_aturan_tabel('public.settings');
select private.pasang_aturan_tabel('public.cycles');

-- Kebijakan data master.
do $$
declare
  t text;
begin
  foreach t in array array['suppliers', 'buyers', 'products', 'grades', 'component_categories', 'expense_categories'] loop
    execute format('create policy "master terbaca" on public.%I for select to authenticated using ((select private.has_permission(%L)))', t, 'master.read');
    execute format('create policy "master ditambah" on public.%I for insert to authenticated with check ((select private.has_permission(%L)))', t, 'master.write');
    execute format('create policy "master diubah" on public.%I for update to authenticated using ((select private.has_permission(%L))) with check ((select private.has_permission(%L)))', t, 'master.write', 'master.write');
  end loop;
end;
$$;

create policy "pengaturan terbaca" on public.settings
  for select to authenticated using ((select private.has_permission('master.read')));
create policy "pengaturan diubah" on public.settings
  for update to authenticated
  using ((select private.has_permission('pengaturan.write')))
  with check ((select private.has_permission('pengaturan.write')));
revoke insert on public.settings from authenticated;

create policy "siklus terbaca" on public.cycles
  for select to authenticated using ((select private.has_permission('siklus.read')));
create policy "siklus ditambah" on public.cycles
  for insert to authenticated with check ((select private.has_permission('siklus.write')));
create policy "siklus diubah" on public.cycles
  for update to authenticated
  using ((select private.has_permission('siklus.write')))
  with check ((select private.has_permission('siklus.write')));

-- Data awal. Daftar lengkap produk, grade, dan jenis limbah menunggu bahan dari owner.
insert into public.grades (kode, nama, urutan) values
  ('A-SO', 'A dengan kulit', 1), ('B-SO', 'B dengan kulit', 2), ('C-SO', 'C dengan kulit', 3),
  ('A-SL', 'A tanpa kulit', 4), ('B-SL', 'B tanpa kulit', 5), ('C-SL', 'C tanpa kulit', 6);

insert into public.products (nama, satuan) values ('Tuna utuh', 'kg'), ('Loin tuna', 'kg');

insert into public.component_categories (nama, komponen, urutan) values
  ('Toro', 'hasil_samping', 1),
  ('Kepala dan rahang', 'hasil_samping', 2),
  ('Tetelan coklat', 'hasil_samping', 3),
  ('Daging kerok', 'hasil_samping', 4),
  ('Limbah (total)', 'limbah', 5),
  ('Susut (total)', 'susut', 6);

insert into public.expense_categories (nama, urutan) values
  ('Bahan baku', 1), ('Produksi', 2), ('Pengemasan dan pengiriman', 3), ('Operasional rutin', 4),
  ('Perawatan dan perbaikan', 5), ('Aset', 6), ('Penerimaan penjualan', 7), ('Pembayaran dan tagihan', 8);

insert into public.settings (kunci, nilai, keterangan) values
  ('rencana_hasil_pct', '60', 'Rencana hasil olahan (loin dibagi ikan masuk), persen'),
  ('batas_hasil_min_pct', '40', 'Batas bawah hasil wajar; di bawahnya ditandai untuk diperiksa'),
  ('batas_hasil_max_pct', '80', 'Batas atas hasil wajar; di atasnya ditandai untuk diperiksa');
