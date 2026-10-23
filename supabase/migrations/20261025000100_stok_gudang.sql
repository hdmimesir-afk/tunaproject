-- Fase 4 · Stok, gudang dingin (titipan + tarif), dan jadwal ABF.
-- Aturan (PRD): berat numeric(12,3), uang numeric(16,2); tidak ada hapus; stok berubah hanya lewat fungsi (migrasi berikutnya);
-- koreksi stok baru berlaku setelah disetujui Owner; semua angka tarif dari tariff_rules (bukan kode).

create sequence public.storage_unit_kode_seq;
create sequence public.service_charge_kode_seq;

-- Izin Fase 4. Owner memegang semua izin (termasuk stok.setuju untuk koreksi).
insert into public.role_permissions (role_id, aksi) values
  ('finance', 'stok.read'),
  ('finance', 'gudang.read'),
  ('super_admin', 'stok.read'),
  ('super_admin', 'gudang.read'),
  ('super_admin', 'gudang.write'),
  ('kepala_produksi', 'stok.read'),
  ('kepala_produksi', 'stok.write'),
  ('kepala_produksi', 'gudang.read'),
  ('kepala_produksi', 'gudang.write'),
  ('petugas_lapangan', 'stok.read'),
  ('petugas_lapangan', 'stok.write'),
  ('petugas_lapangan', 'gudang.read'),
  ('petugas_lapangan', 'gudang.write');

insert into public.settings (kunci, nilai, keterangan)
values ('kapasitas_gudang_kg', '17500', 'Kapasitas gudang dingin (kg). Titipan baru ditolak bila stok sendiri + titipan melebihi');

-- ------------------------------------------------------------- tarif
-- Satu baris per jenis layanan dan tanggal berlaku. Tarif baru = baris baru; tagihan lama memakai tarif saat ikan masuk.
create table public.tariff_rules (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('simpan', 'abf', 'transit')),
  tarif_per_kg numeric(16,2) not null check (tarif_per_kg >= 0),
  -- Hanya untuk jenis simpan:
  masa_transit_jam int not null default 3 check (masa_transit_jam >= 0),
  minimum_hari int not null default 10 check (minimum_hari >= 1),
  dasar_berat text not null default 'masuk' check (dasar_berat in ('masuk', 'keluar')),
  berlaku_dari date not null default current_date,
  dikonfirmasi boolean not null default false,
  catatan text not null default '',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  unique (jenis, berlaku_dari)
);

-- Angka awal dari proposal dan jawaban owner 22 Oktober 2026; semuanya "belum dikonfirmasi" sampai owner menyatakan sah.
insert into public.tariff_rules (jenis, tarif_per_kg, masa_transit_jam, minimum_hari, dasar_berat, berlaku_dari, dikonfirmasi, catatan) values
  ('simpan', 76, 3, 10, 'masuk', date '2026-10-22', false, 'Simpan Rp76/kg/hari dari owner; minimum 10 hari, masa transit 3 jam, dan dasar berat masuk masih usulan developer'),
  ('abf', 3500, 3, 10, 'masuk', date '2026-10-22', false, 'ABF Rp3.500/kg, ditagih terpisah dari simpan'),
  ('transit', 0, 3, 10, 'masuk', date '2026-10-22', false, 'Tarif transit belum ditetapkan owner, jadi nol');

-- --------------------------------------------------------------- stok
-- Satu unit = satu kelompok ikan di gudang (atau yang langsung dikirim). Nama disalin supaya terbaca tanpa izin master.
create table public.storage_units (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('STK-' || lpad(nextval('public.storage_unit_kode_seq')::text, 4, '0')),
  buyer_id uuid references public.buyers (id),
  pemilik_nama text not null default 'Milik sendiri',
  product_id uuid not null references public.products (id),
  product_nama text not null,
  grade_id uuid references public.grades (id),
  grade_kode text,
  kondisi text not null check (kondisi in ('fresh', 'beku')),
  lokasi text not null default '',
  production_id uuid references public.productions (id),
  production_kode text,
  kg_masuk numeric(12,3) not null check (kg_masuk > 0),
  sisa_kg numeric(12,3) not null check (sisa_kg >= 0),
  -- Berat masuk yang belum diambil; dasar tagihan bila dasar berat = masuk (ambil sebagian dibagi sebanding).
  sisa_dasar_masuk numeric(12,3) not null check (sisa_dasar_masuk >= 0),
  masuk_pada timestamptz not null default now(),
  perlu_abf boolean not null default false,
  langsung_kirim boolean not null default false,
  status text not null default 'aktif' check (status in ('aktif', 'habis')),
  catatan text not null default '',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create index storage_units_status_idx on public.storage_units (status, masuk_pada desc);
create index storage_units_buyer_idx on public.storage_units (buyer_id);
create index storage_units_production_idx on public.storage_units (production_id);

-- Setiap perubahan berat adalah satu baris; tidak ada ubah atau hapus. Koreksi menunggu persetujuan Owner.
create table public.storage_movements (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.storage_units (id),
  jenis text not null check (jenis in ('masuk', 'keluar', 'koreksi')),
  kg numeric(12,3) not null check (kg <> 0),
  kg_dasar numeric(12,3) not null default 0,
  waktu timestamptz not null default now(),
  alasan text not null default '',
  status text not null default 'disetujui' check (status in ('diajukan', 'disetujui', 'ditolak')),
  diputuskan_oleh uuid,
  diputuskan_pada timestamptz,
  catatan_putusan text not null default '',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  check (jenis = 'koreksi' or kg > 0)
);
create index storage_movements_unit_idx on public.storage_movements (unit_id, waktu);
create index storage_movements_status_idx on public.storage_movements (status) where status = 'diajukan';

-- Rincian hitungan tagihan jasa gudang. Angka dasar tersimpan supaya invoice bisa menampilkan cara menghitungnya.
create table public.service_charges (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('JSA-' || lpad(nextval('public.service_charge_kode_seq')::text, 4, '0')),
  unit_id uuid not null references public.storage_units (id),
  movement_id uuid references public.storage_movements (id),
  buyer_id uuid references public.buyers (id),
  pemilik_nama text not null,
  jenis text not null check (jenis in ('simpan', 'abf', 'transit')),
  kg_dasar numeric(12,3) not null,
  tarif_per_kg numeric(16,2) not null,
  hari_ditagih int not null default 0,
  jumlah numeric(16,2) not null check (jumlah >= 0),
  rincian jsonb not null default '{}'::jsonb,
  masuk_pada timestamptz not null,
  keluar_pada timestamptz,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid()
);
create index service_charges_unit_idx on public.service_charges (unit_id);
create index service_charges_buyer_idx on public.service_charges (buyer_id);

-- ------------------------------------------------------------ jadwal
-- Mitra yang memakai mesin bergantian dengan produksi sendiri.
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) > 0),
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create unique index partners_nama_unik on public.partners (lower(nama));
insert into public.partners (nama) values ('CV DUS'), ('PT SNS');

-- Mesin tunggal: dua jadwal aktif tidak boleh saling tumpang tindih (jaminan terakhir di database).
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('produksi', 'abf')),
  partner_id uuid references public.partners (id),
  label text not null check (length(trim(label)) > 0),
  mulai timestamptz not null,
  selesai timestamptz not null,
  kg numeric(12,3) check (kg is null or kg > 0),
  status text not null default 'aktif' check (status in ('aktif', 'dibatalkan')),
  alasan_batal text not null default '',
  catatan text not null default '',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  check (selesai > mulai),
  exclude using gist (tstzrange(mulai, selesai) with &&) where (status = 'aktif')
);
create index bookings_mulai_idx on public.bookings (mulai);

-- Aturan bersama: RLS aktif dan dipaksa, tolak hapus, jejak perubahan, diubah_pada.
select private.pasang_aturan_tabel('public.tariff_rules');
select private.pasang_aturan_tabel('public.storage_units');
select private.pasang_aturan_tabel('public.storage_movements');
select private.pasang_aturan_tabel('public.service_charges', false);
select private.pasang_aturan_tabel('public.partners');
select private.pasang_aturan_tabel('public.bookings');

-- Semua perubahan lewat fungsi (migrasi berikutnya); klien hanya membaca. Mitra memakai kebijakan data master.
revoke insert, update on public.tariff_rules, public.storage_units, public.storage_movements, public.service_charges, public.bookings from authenticated;

create policy "unit stok terbaca" on public.storage_units
  for select to authenticated using ((select private.has_permission('stok.read')));
create policy "pergerakan stok terbaca" on public.storage_movements
  for select to authenticated using ((select private.has_permission('stok.read')));
create policy "tagihan jasa terbaca" on public.service_charges
  for select to authenticated using ((select private.has_permission('gudang.read')));
create policy "tarif terbaca" on public.tariff_rules
  for select to authenticated using ((select private.has_permission('gudang.read')));
create policy "jadwal terbaca" on public.bookings
  for select to authenticated using ((select private.has_permission('gudang.read')));
create policy "mitra terbaca" on public.partners
  for select to authenticated using ((select private.has_permission('gudang.read')));
create policy "mitra ditambah" on public.partners
  for insert to authenticated with check ((select private.has_permission('master.write')));
create policy "mitra diubah" on public.partners
  for update to authenticated using ((select private.has_permission('master.write'))) with check ((select private.has_permission('master.write')));

-- ----------------------------------------------------------- tampilan
create view public.v_gudang_isi with (security_invoker = true) as
select
  coalesce((select (s.nilai #>> '{}')::numeric from public.settings s where s.kunci = 'kapasitas_gudang_kg'), 17500)::numeric(12,3) as kapasitas_kg,
  coalesce(sum(u.sisa_kg) filter (where u.buyer_id is null), 0)::numeric(12,3) as isi_sendiri_kg,
  coalesce(sum(u.sisa_kg) filter (where u.buyer_id is not null), 0)::numeric(12,3) as isi_titipan_kg
from public.storage_units u
where u.status = 'aktif';

revoke all on public.v_gudang_isi from anon;
