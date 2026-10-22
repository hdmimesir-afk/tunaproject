-- Fase 3 · Tabel produksi: alokasi lot, ikan utuh per ekor, loin per potong, komponen hasil, riwayat koreksi, dan neraca berat.
-- Aturan (PRD): berat numeric(12,3); tidak ada hapus (loin dibatalkan dengan alasan); perubahan hanya lewat fungsi
-- (migrasi berikutnya); setiap perubahan baris loin tercatat sebelum/sesudah; selisih belum jelas adalah sisa hitungan.

create sequence public.production_kode_seq;

-- Izin Fase 3. Owner memegang semua izin, jadi produksi.setuju tidak perlu baris. Pemeriksa (QC) tidak boleh menimbang produksi yang sama.
insert into public.role_permissions (role_id, aksi) values
  ('finance', 'produksi.read'),
  ('super_admin', 'produksi.read'),
  ('kepala_produksi', 'produksi.read'),
  ('kepala_produksi', 'produksi.write'),
  ('kepala_produksi', 'produksi.periksa'),
  ('petugas_lapangan', 'produksi.read'),
  ('petugas_lapangan', 'produksi.write');

-- ------------------------------------------------------------ produksi
create table public.productions (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('PRD-' || lpad(nextval('public.production_kode_seq')::text, 3, '0')),
  cycle_id uuid references public.cycles (id),
  tanggal date not null default current_date,
  status text not null default 'berjalan' check (status in ('berjalan', 'selesai', 'diperiksa_qc', 'diperiksa')),
  -- null = belum ditimbang (bukan nol). Ditimbang total saja (keputusan owner).
  limbah_kg numeric(12,3) check (limbah_kg is null or limbah_kg >= 0),
  susut_kg numeric(12,3) check (susut_kg is null or susut_kg >= 0),
  catatan text not null default '',
  penjelasan_selisih text not null default '',
  selisih_diterima boolean not null default false,
  catatan_perbaikan text not null default '',
  selesai_oleh uuid,
  selesai_pada timestamptz,
  qc_oleh uuid,
  qc_pada timestamptz,
  owner_oleh uuid,
  owner_pada timestamptz,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create index productions_status_idx on public.productions (status, tanggal desc);
create index productions_cycle_idx on public.productions (cycle_id);

-- Satu lot bisa ke beberapa produksi dan sebaliknya (banyak-ke-banyak). Berat lot berkurang saat alokasi dibuat.
create table public.lot_allocations (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions (id),
  lot_id uuid not null references public.lots (id),
  lot_kode text not null,
  kg numeric(12,3) not null check (kg > 0),
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  unique (production_id, lot_id)
);
create index lot_allocations_lot_idx on public.lot_allocations (lot_id);

-- Berat ikan utuh per ekor (opsional). Hasil per ekor = loin dengan nomor ekor sama dibagi berat utuh.
create table public.production_fish (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions (id),
  no_ekor int not null check (no_ekor > 0),
  berat_utuh_kg numeric(12,3) not null check (berat_utuh_kg > 0),
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  unique (production_id, no_ekor)
);

-- Satu baris per potong loin. id dibuat di perangkat supaya simpan ulang (jaringan putus, klik ganda) tidak menggandakan baris.
create table public.production_items (
  id uuid primary key,
  production_id uuid not null references public.productions (id),
  no_ekor int check (no_ekor is null or no_ekor > 0),
  no_loin int not null check (no_loin > 0),
  grade_id uuid not null references public.grades (id),
  kg numeric(12,3) not null check (kg > 0),
  versi int not null default 1,
  batal boolean not null default false,
  alasan_batal text not null default '',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  check (not batal or length(trim(alasan_batal)) > 0)
);
create unique index production_items_loin_unik on public.production_items (production_id, no_loin) where not batal;
create index production_items_prod_idx on public.production_items (production_id, no_loin);

-- Riwayat koreksi per baris loin: siapa, kapan, sebelum dan sesudah.
create table public.production_items_history (
  id bigint generated always as identity primary key,
  item_id uuid not null,
  production_id uuid not null,
  aksi text not null check (aksi in ('tambah', 'koreksi', 'batal')),
  sebelum jsonb,
  sesudah jsonb not null,
  oleh uuid,
  pada timestamptz not null default now()
);
create index production_items_history_item_idx on public.production_items_history (item_id, pada);

-- Hasil samping per jenis. Limbah dan susut ada di kolom productions.
create table public.production_components (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions (id),
  category_id uuid not null references public.component_categories (id),
  kg numeric(12,3) not null check (kg >= 0),
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  unique (production_id, category_id)
);

create or replace function private.catat_riwayat_loin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.production_items_history (item_id, production_id, aksi, sebelum, sesudah, oleh)
  values (
    new.id, new.production_id,
    case when tg_op = 'INSERT' then 'tambah' when new.batal and not old.batal then 'batal' else 'koreksi' end,
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new),
    (select auth.uid())
  );
  return new;
end;
$$;
revoke all on function private.catat_riwayat_loin() from public, anon, authenticated;
create trigger production_items_riwayat after insert or update on public.production_items
  for each row execute function private.catat_riwayat_loin();

-- Aturan bersama: RLS aktif dan dipaksa, tolak hapus, jejak perubahan, diubah_pada.
select private.pasang_aturan_tabel('public.productions');
select private.pasang_aturan_tabel('public.lot_allocations', false);
select private.pasang_aturan_tabel('public.production_fish');
select private.pasang_aturan_tabel('public.production_items');
select private.pasang_aturan_tabel('public.production_items_history', false);
select private.pasang_aturan_tabel('public.production_components');

-- Semua perubahan lewat fungsi (migrasi berikutnya); klien hanya membaca.
revoke insert, update on public.productions, public.lot_allocations, public.production_fish,
  public.production_items, public.production_items_history, public.production_components from authenticated;
grant usage on sequence public.production_kode_seq to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['productions', 'lot_allocations', 'production_fish', 'production_items', 'production_items_history', 'production_components'] loop
    execute format('create policy "produksi terbaca" on public.%I for select to authenticated using ((select private.has_permission(%L)))', t, 'produksi.read');
  end loop;
end;
$$;

-- ----------------------------------------------------------- neraca
-- Sisa hitungan: ikan masuk dikurangi semua yang ditimbang. Tidak pernah diisi manual dan tidak dipindah ke susut.
create view public.v_neraca_produksi with (security_invoker = true) as
select
  p.id as production_id,
  coalesce(a.masuk, 0)::numeric(12,3) as masuk_kg,
  coalesce(i.loin, 0)::numeric(12,3) as loin_kg,
  coalesce(i.n, 0)::int as jumlah_loin,
  coalesce(c.samping, 0)::numeric(12,3) as samping_kg,
  p.limbah_kg,
  p.susut_kg,
  (coalesce(a.masuk, 0) - coalesce(i.loin, 0) - coalesce(c.samping, 0) - coalesce(p.limbah_kg, 0) - coalesce(p.susut_kg, 0))::numeric(12,3) as belum_jelas_kg,
  case when coalesce(a.masuk, 0) > 0 then round(coalesce(i.loin, 0) / a.masuk * 100, 1) else 0 end as hasil_pct,
  case when coalesce(a.masuk, 0) > 0
    then round((a.masuk - coalesce(i.loin, 0) - coalesce(c.samping, 0) - coalesce(p.limbah_kg, 0) - coalesce(p.susut_kg, 0)) / a.masuk * 100, 1)
    else 0 end as belum_jelas_pct
from public.productions p
left join lateral (select sum(kg) as masuk from public.lot_allocations where production_id = p.id) a on true
left join lateral (select sum(kg) as loin, count(*) as n from public.production_items where production_id = p.id and not batal) i on true
left join lateral (select sum(kg) as samping from public.production_components where production_id = p.id) c on true;

create view public.v_productions with (security_invoker = true) as
select
  p.id, p.kode, p.tanggal, p.status, p.cycle_id, cy.kode as siklus_kode, p.catatan,
  n.masuk_kg, n.loin_kg, n.jumlah_loin, n.samping_kg, n.limbah_kg, n.susut_kg, n.belum_jelas_kg, n.hasil_pct, n.belum_jelas_pct,
  p.penjelasan_selisih, p.selisih_diterima, p.catatan_perbaikan,
  p.selesai_oleh, p.selesai_pada, p.qc_oleh, p.qc_pada, p.owner_oleh, p.owner_pada, p.dibuat_pada
from public.productions p
left join public.cycles cy on cy.id = p.cycle_id
left join public.v_neraca_produksi n on n.production_id = p.id;

revoke all on public.v_neraca_produksi, public.v_productions from anon;
