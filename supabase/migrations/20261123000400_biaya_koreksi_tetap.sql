-- 23 Nov 2026: permintaan tim finance Katalis (testing ketahan karena biaya yg udah diajukan nggak bisa dikoreksi).
--   1. Koreksi biaya: semua isian (kategori, uraian, jumlah, tanggal, PO, produksi, proyek) bisa dikoreksi di status apa pun.
--      Langsung berlaku (nggak balik ke Owner), wajib alasan, sebelum dan sesudahnya kecatat di koreksi_data.
--      Kalau biayanya udah disetujui, baris buku kasnya ikut dibenerin. Bulan yg udah tutup buku tetap terkunci.
--   2. Hapus biaya permanen (buat biaya dobel): biaya, notanya, riwayat koreksinya, dan baris buku kasnya dihapus.
--      Wajib alasan, kecatat di hapus_data_log (log ini nggak bisa diubah atau dihapus). Bulan yg udah tutup buku ditolak.
--   3. Biaya tetap (fixed cost): daftar biaya rutin bulanan (gaji, sewa, listrik). Tiap bulan tinggal "catat bulan ini",
--      biayanya kebikin otomatis. Kategori yg wajib nota jadi draf (lampirkan nota dulu), yg nggak wajib langsung diajukan ke Owner.
--      Satu biaya tetap cuma bisa kecatat sekali per bulan.

-- ============================================================ catatan koreksi buat biaya
alter table public.koreksi_data drop constraint koreksi_data_tabel_check;
alter table public.koreksi_data add constraint koreksi_data_tabel_check
  check (tabel in ('lots', 'purchase_orders', 'payments', 'productions', 'cycles', 'expenses'));
drop policy "koreksi terbaca" on public.koreksi_data;
create policy "koreksi terbaca" on public.koreksi_data for select to authenticated using (
  case when tabel in ('purchase_orders', 'payments') then (select private.has_permission('pembelian.read'))
       when tabel = 'expenses' then (select private.has_permission('keuangan.read'))
       else (select private.has_permission('mutu.read')) or (select private.has_permission('produksi.read')) or (select private.has_permission('pembelian.read'))
  end
);

-- ============================================================ biaya tetap
create table public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) between 1 and 120),
  category_id uuid not null references public.expense_categories (id),
  jumlah numeric(16,2) not null check (jumlah > 0),
  aktif boolean not null default true,
  catatan text not null default '' check (length(catatan) <= 300),
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create unique index fixed_costs_nama_unik on public.fixed_costs (lower(trim(nama))) where aktif;
select private.pasang_aturan_tabel('public.fixed_costs');
revoke insert, update on public.fixed_costs from authenticated;
create policy "biaya tetap terbaca" on public.fixed_costs for select to authenticated using ((select private.has_permission('keuangan.read')));

alter table public.expenses add column fixed_cost_id uuid references public.fixed_costs (id);
alter table public.expenses add column bulan_tetap date check (bulan_tetap is null or bulan_tetap = date_trunc('month', bulan_tetap)::date);
alter table public.expenses add constraint expenses_tetap_lengkap check ((fixed_cost_id is null) = (bulan_tetap is null));
create unique index expenses_tetap_sebulan on public.expenses (fixed_cost_id, bulan_tetap) where fixed_cost_id is not null;

-- Tampilan biaya: kolom baru ditaruh paling belakang (create or replace view cuma boleh nambah di ujung).
create or replace view public.v_expenses with (security_invoker = true) as
select
  e.id, e.kode, e.category_id, e.kategori_nama, e.uraian, e.jumlah, e.tanggal, e.cycle_id, c.kode as siklus_kode, e.po_id, p.kode as po_kode, e.production_id,
  e.status, e.alasan_tolak, e.diajukan_oleh, e.diajukan_pada, e.diputuskan_oleh, e.diputuskan_pada,
  (select count(*) from public.documents d where d.ref_tabel = 'expenses' and d.ref_id = e.id and d.jenis = 'nota')::int as jml_nota,
  k.nota_wajib,
  pr.kode as produksi_kode,
  e.fixed_cost_id, e.bulan_tetap
from public.expenses e
left join public.cycles c on c.id = e.cycle_id
left join public.purchase_orders p on p.id = e.po_id
left join public.productions pr on pr.id = e.production_id
left join public.expense_categories k on k.id = e.category_id;

-- ============================================================ cek isian biaya (dipakai simpan dan koreksi)
-- Balikin proyek yg dipakai: proyek yg dipilih, atau ikut PO/produksinya. Ditolak kalau beda dengan proyek PO/produksinya.
create or replace function private.cek_isian_biaya(p_category uuid, p_uraian text, p_jumlah numeric, p_cycle uuid, p_po uuid, p_production uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  siklus_po uuid;
  siklus_prd uuid;
  siklus uuid := p_cycle;
begin
  if not exists (select 1 from public.expense_categories where id = p_category and aktif) then
    raise exception 'Pilih kategori biaya.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_uraian, ''))) = 0 then
    raise exception 'Tulis uraian biaya.' using errcode = 'KT001';
  end if;
  if p_jumlah is null or p_jumlah <= 0 or round(p_jumlah, 2) <> p_jumlah then
    raise exception 'Jumlah biaya harus lebih dari nol dengan paling banyak dua desimal.' using errcode = 'KT001';
  end if;
  if p_po is not null then
    select po.cycle_id into siklus_po from public.purchase_orders po where po.id = p_po;
    if not found then
      raise exception 'PO tidak ditemukan.' using errcode = 'KT001';
    end if;
  end if;
  if p_production is not null then
    select pr.cycle_id into siklus_prd from public.productions pr where pr.id = p_production;
    if not found then
      raise exception 'Produksi tidak ditemukan.' using errcode = 'KT001';
    end if;
  end if;
  siklus := coalesce(siklus, siklus_po, siklus_prd);
  if (siklus_po is not null and siklus_po <> siklus) or (siklus_prd is not null and siklus_prd <> siklus) then
    raise exception 'Proyek biaya beda dengan proyek PO atau produksi yang dipilih.' using errcode = 'KT001';
  end if;
  return siklus;
end;
$$;
revoke all on function private.cek_isian_biaya(uuid, text, numeric, uuid, uuid, uuid) from public, anon, authenticated;

-- ============================================================ 1. koreksi biaya
create or replace function public.koreksi_biaya(
  p_id uuid, p_category uuid, p_uraian text, p_jumlah numeric, p_tanggal date, p_cycle uuid, p_po uuid, p_production uuid, p_alasan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.expenses;
  baru public.expenses;
  k public.expense_categories;
  siklus uuid;
begin
  perform private.wajib_izin('keuangan.write');
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan koreksinya.' using errcode = 'KT001';
  end if;
  if length(trim(p_alasan)) > 500 then
    raise exception 'Alasannya kepanjangan, maksimal 500 huruf.' using errcode = 'KT001';
  end if;
  select * into e from public.expenses where id = p_id for update;
  if not found then
    raise exception 'Biaya tidak ditemukan.' using errcode = 'KT001';
  end if;
  siklus := private.cek_isian_biaya(p_category, p_uraian, p_jumlah, p_cycle, p_po, p_production);
  select * into k from public.expense_categories where id = p_category;

  -- Status nggak berubah: yg nunggu Owner tetap nunggu, yg udah disetujui tetap disetujui (langsung berlaku).
  -- Pemicu tutup buku nolak kalau tanggal lama atau tanggal barunya ada di bulan yg udah ditutup.
  update public.expenses
  set category_id = k.id, kategori_nama = k.nama, uraian = trim(p_uraian), jumlah = p_jumlah, tanggal = coalesce(p_tanggal, e.tanggal),
      cycle_id = siklus, po_id = p_po, production_id = p_production
  where id = e.id
  returning * into baru;

  -- Biaya yg udah disetujui udah ada di buku kas: barisnya ikut dibenerin biar saldo dan laporan langsung bener.
  if e.status = 'disetujui' then
    update public.ledger
    set tanggal = baru.tanggal, kategori_nama = baru.kategori_nama, uraian = baru.kode || ' ' || baru.uraian, jumlah = baru.jumlah, cycle_id = baru.cycle_id
    where ref_tabel = 'expenses' and ref_id = e.id;
  end if;

  perform private.catat_koreksi('expenses', e.id, e.kode, p_alasan,
    jsonb_build_object('kategori', e.kategori_nama, 'uraian', e.uraian, 'jumlah', e.jumlah, 'tanggal', e.tanggal, 'cycle_id', e.cycle_id, 'po_id', e.po_id, 'production_id', e.production_id),
    jsonb_build_object('kategori', baru.kategori_nama, 'uraian', baru.uraian, 'jumlah', baru.jumlah, 'tanggal', baru.tanggal, 'cycle_id', baru.cycle_id, 'po_id', baru.po_id, 'production_id', baru.production_id));
end;
$$;

-- ============================================================ 2. hapus biaya permanen
create or replace function public.hapus_biaya(p_id uuid, p_alasan text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.expenses;
  nama text;
  id_log bigint;
  n_nota int;
  n_kas int;
  n_koreksi int;
  rincian jsonb;
begin
  perform private.wajib_izin('keuangan.write');
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan kenapa biayanya dihapus.' using errcode = 'KT001';
  end if;
  if length(trim(p_alasan)) > 500 then
    raise exception 'Alasannya kepanjangan, maksimal 500 huruf.' using errcode = 'KT001';
  end if;
  select * into e from public.expenses where id = p_id for update;
  if not found then
    raise exception 'Biaya tidak ditemukan.' using errcode = 'KT001';
  end if;
  if private.periode_ditutup(e.tanggal) then
    raise exception 'Buku bulan % udah ditutup, jadi biaya % nggak bisa dihapus. Minta Owner buka lagi bulannya kalau perlu.',
      to_char(e.tanggal, 'YYYY-MM'), e.kode using errcode = 'KT001';
  end if;

  select count(*) into n_nota from public.documents where ref_tabel = 'expenses' and ref_id = e.id;
  select count(*) into n_kas from public.ledger where ref_tabel = 'expenses' and ref_id = e.id;
  select count(*) into n_koreksi from public.koreksi_data where tabel = 'expenses' and ref_id = e.id;

  perform set_config('katalis.hapus_resmi', 'ya', true);
  delete from public.documents where ref_tabel = 'expenses' and ref_id = e.id;
  delete from public.ledger where ref_tabel = 'expenses' and ref_id = e.id;
  delete from public.koreksi_data where tabel = 'expenses' and ref_id = e.id;
  delete from public.expenses where id = e.id;
  perform set_config('katalis.hapus_resmi', '', true);

  rincian := jsonb_build_array(jsonb_build_object('tabel', 'expenses', 'label', 'Biaya', 'jumlah', 1,
    'kode', jsonb_build_array(e.kode || ' · ' || e.kategori_nama || ' · ' || e.uraian || ' · Rp' || to_char(e.jumlah, 'FM999G999G999G990D00'))));
  if n_nota > 0 then
    rincian := rincian || jsonb_build_array(jsonb_build_object('tabel', 'documents', 'label', 'Nota', 'jumlah', n_nota, 'kode', '[]'::jsonb));
  end if;
  if n_kas > 0 then
    rincian := rincian || jsonb_build_array(jsonb_build_object('tabel', 'ledger', 'label', 'Baris buku kas', 'jumlah', n_kas, 'kode', '[]'::jsonb));
  end if;
  if n_koreksi > 0 then
    rincian := rincian || jsonb_build_array(jsonb_build_object('tabel', 'koreksi_data', 'label', 'Riwayat koreksi', 'jumlah', n_koreksi, 'kode', '[]'::jsonb));
  end if;

  select coalesce(nullif(p.nama, ''), 'pengguna') into nama from public.profiles p where p.user_id = (select auth.uid());
  insert into public.hapus_data_log (oleh, oleh_nama, bagian, alasan, rincian, total)
  values ((select auth.uid()), coalesce(nama, 'pengguna'), array['biaya'], trim(p_alasan), rincian, 1 + n_nota + n_kas + n_koreksi)
  returning id into id_log;
  return id_log;
end;
$$;

-- ============================================================ 3. biaya tetap
create or replace function public.simpan_biaya_tetap(p_id uuid, p_nama text, p_category uuid, p_jumlah numeric, p_aktif boolean, p_catatan text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_b uuid;
begin
  perform private.wajib_izin('keuangan.write');
  if length(trim(coalesce(p_nama, ''))) = 0 then
    raise exception 'Tulis nama biaya tetapnya.' using errcode = 'KT001';
  end if;
  if not exists (select 1 from public.expense_categories where id = p_category and aktif) then
    raise exception 'Pilih kategori biaya.' using errcode = 'KT001';
  end if;
  if p_jumlah is null or p_jumlah <= 0 or round(p_jumlah, 2) <> p_jumlah then
    raise exception 'Jumlah per bulan harus lebih dari nol dengan paling banyak dua desimal.' using errcode = 'KT001';
  end if;
  if coalesce(p_aktif, true) and exists (
    select 1 from public.fixed_costs f where f.aktif and lower(trim(f.nama)) = lower(trim(p_nama)) and f.id is distinct from p_id
  ) then
    raise exception 'Biaya tetap "%" udah ada.', trim(p_nama) using errcode = 'KT001';
  end if;
  if p_id is null then
    insert into public.fixed_costs (nama, category_id, jumlah, aktif, catatan)
    values (trim(p_nama), p_category, p_jumlah, coalesce(p_aktif, true), trim(coalesce(p_catatan, '')))
    returning id into id_b;
  else
    update public.fixed_costs
    set nama = trim(p_nama), category_id = p_category, jumlah = p_jumlah, aktif = coalesce(p_aktif, true), catatan = trim(coalesce(p_catatan, ''))
    where id = p_id
    returning id into id_b;
    if id_b is null then
      raise exception 'Biaya tetap tidak ditemukan.' using errcode = 'KT001';
    end if;
  end if;
  return id_b;
end;
$$;

-- Catat semua biaya tetap yg aktif buat satu bulan (yg udah kecatat bulan itu dilewatin). Balikin jumlah biaya yg baru dibikin.
create or replace function public.catat_biaya_tetap(p_bulan date, p_tanggal date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  bulan date := date_trunc('month', p_bulan)::date;
  tgl date := coalesce(p_tanggal, (now() at time zone 'Asia/Jakarta')::date);
  f record;
  n int := 0;
  nama_bulan text[] := array['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  label text;
begin
  perform private.wajib_izin('keuangan.write');
  if p_bulan is null then
    raise exception 'Pilih bulannya.' using errcode = 'KT001';
  end if;
  if date_trunc('month', tgl)::date <> bulan then
    raise exception 'Tanggal biayanya harus di bulan yg dicatat.' using errcode = 'KT001';
  end if;
  label := nama_bulan[extract(month from bulan)::int] || ' ' || extract(year from bulan)::int;
  for f in
    select fc.*, k.nama as kategori_nama, k.nota_wajib
    from public.fixed_costs fc join public.expense_categories k on k.id = fc.category_id
    where fc.aktif and not exists (select 1 from public.expenses e where e.fixed_cost_id = fc.id and e.bulan_tetap = bulan)
    order by fc.nama
  loop
    insert into public.expenses (category_id, kategori_nama, uraian, jumlah, tanggal, fixed_cost_id, bulan_tetap, status, diajukan_oleh, diajukan_pada)
    values (f.category_id, f.kategori_nama, f.nama || ' bulan ' || label, f.jumlah, tgl, f.id, bulan,
      case when f.nota_wajib then 'draf' else 'diajukan' end,
      case when f.nota_wajib then null else (select auth.uid()) end,
      case when f.nota_wajib then null else now() end);
    n := n + 1;
  end loop;
  if n = 0 then
    raise exception 'Semua biaya tetap bulan % udah dicatat (atau belum ada biaya tetap yg aktif).', label using errcode = 'KT001';
  end if;
  return n;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.koreksi_biaya(uuid, uuid, text, numeric, date, uuid, uuid, uuid, text)',
    'public.hapus_biaya(uuid, text)',
    'public.simpan_biaya_tetap(uuid, text, uuid, numeric, boolean, text)',
    'public.catat_biaya_tetap(date, date)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
