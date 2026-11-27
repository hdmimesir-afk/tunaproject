-- Jalanin sekali di Supabase SQL Editor (produksi), SEBELUM push. Isinya sama persis dengan migrasi:
--   20261127000200_total_biaya_tetap: input total biaya tetap sebulan tanpa rincian per pos
-- Satu transaksi: kalau ada yg gagal, nggak ada yg berubah. Aman dijalanin ulang.

begin;

-- 27 Nov 2026: permintaan Mas Zuhud lewat Mas Bisma. Data finance confidential, jadi biaya tetap boleh diinput TOTAL sebulan
-- aja tanpa rincian per pos (misal Oktober 200 juta). Rinciannya dikirim terpisah ke investor. Fitur pos biaya tetap tetap ada.
--   - Satu bulan cuma boleh satu total.
--   - Satu bulan pilih salah satu: catat per pos ATAU total. Kalau dua duanya, biayanya kehitung dobel, jadi ditolak.
--   - Totalnya masuk jadi biaya biasa (kategori "Biaya tetap bulanan", nggak wajib nota), diajukan ke Owner, dan setelah
--     disetujui masuk buku kas, jadi otomatis ngurangin laba bulan itu. Koreksi dan hapus pakai fitur biaya yg udah ada.

insert into public.expense_categories (nama, urutan, nota_wajib)
select 'Biaya tetap bulanan', 19, false
where not exists (select 1 from public.expense_categories k where lower(k.nama) = 'biaya tetap bulanan');

alter table public.expenses add column if not exists total_tetap date
  check (total_tetap is null or total_tetap = date_trunc('month', total_tetap)::date);
alter table public.expenses drop constraint if exists expenses_total_tetap_bukan_pos;
alter table public.expenses add constraint expenses_total_tetap_bukan_pos check (total_tetap is null or fixed_cost_id is null);
create unique index if not exists expenses_total_tetap_sebulan on public.expenses (total_tetap) where total_tetap is not null;

-- ============================================================ input total sebulan
create or replace function public.catat_total_biaya_tetap(p_bulan date, p_tanggal date, p_jumlah numeric)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  bulan date := date_trunc('month', p_bulan)::date;
  tgl date := coalesce(p_tanggal, (now() at time zone 'Asia/Jakarta')::date);
  nama_bulan text[] := array['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  label text;
  k public.expense_categories;
  id_b uuid;
begin
  perform private.wajib_izin('keuangan.write');
  if p_bulan is null then
    raise exception 'Pilih bulannya.' using errcode = 'KT001';
  end if;
  if date_trunc('month', tgl)::date <> bulan then
    raise exception 'Tanggal biayanya harus di bulan yg dicatat.' using errcode = 'KT001';
  end if;
  if p_jumlah is null or p_jumlah <= 0 or round(p_jumlah, 2) <> p_jumlah then
    raise exception 'Totalnya harus lebih dari nol dengan paling banyak dua desimal.' using errcode = 'KT001';
  end if;
  label := nama_bulan[extract(month from bulan)::int] || ' ' || extract(year from bulan)::int;
  if exists (select 1 from public.expenses e where e.total_tetap = bulan) then
    raise exception 'Total biaya tetap % udah diinput. Kalau angkanya salah, koreksi biayanya aja.', label using errcode = 'KT001';
  end if;
  if exists (select 1 from public.expenses e where e.bulan_tetap = bulan) then
    raise exception 'Biaya tetap % udah dicatat per pos, jadi totalnya nggak bisa diinput lagi (nanti kehitung dobel).', label using errcode = 'KT001';
  end if;
  select * into k from public.expense_categories where lower(nama) = 'biaya tetap bulanan' and aktif;
  if not found then
    raise exception 'Kategori biaya "Biaya tetap bulanan" nggak aktif. Aktifin dulu di Pengaturan.' using errcode = 'KT001';
  end if;

  insert into public.expenses (category_id, kategori_nama, uraian, jumlah, tanggal, total_tetap, status, diajukan_oleh, diajukan_pada)
  values (k.id, k.nama, 'Total biaya tetap bulan ' || label, p_jumlah, tgl, bulan,
    case when k.nota_wajib then 'draf' else 'diajukan' end,
    case when k.nota_wajib then null else (select auth.uid()) end,
    case when k.nota_wajib then null else now() end)
  returning id into id_b;
  return id_b;
end;
$$;

-- ============================================================ catat per pos: tolak kalau bulannya udah pakai total
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
  if exists (select 1 from public.expenses e where e.total_tetap = bulan) then
    raise exception 'Biaya tetap % udah diinput totalnya, jadi nggak bisa dicatat per pos lagi (nanti kehitung dobel).', label using errcode = 'KT001';
  end if;
  for f in
    select fc.*, k.nama as kategori_nama, k.nota_wajib
    from public.fixed_costs fc join public.expense_categories k on k.id = fc.category_id
    where fc.aktif
      and (fc.cara_bayar = 'bulanan' or fc.bulan_bayar = extract(month from bulan)::int)
      and not exists (select 1 from public.expenses e where e.fixed_cost_id = fc.id and e.bulan_tetap = bulan)
    order by fc.kelompok, fc.nama
  loop
    insert into public.expenses (category_id, kategori_nama, uraian, jumlah, tanggal, fixed_cost_id, bulan_tetap, status, diajukan_oleh, diajukan_pada)
    values (f.category_id, f.kategori_nama,
      f.nama || case when f.cara_bayar = 'tahunan' then ' tahun ' || extract(year from bulan)::int else ' bulan ' || label end,
      f.jumlah, tgl, f.id, bulan,
      case when f.nota_wajib then 'draf' else 'diajukan' end,
      case when f.nota_wajib then null else (select auth.uid()) end,
      case when f.nota_wajib then null else now() end);
    n := n + 1;
  end loop;
  if n = 0 then
    raise exception 'Semua pos bulan % udah dicatat (atau belum ada pos yg jatuh tempo bulan itu).', label using errcode = 'KT001';
  end if;
  return n;
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
  e.lini_bisnis,
  e.total_tetap
from public.expenses e
left join public.cycles c on c.id = e.cycle_id
left join public.purchase_orders p on p.id = e.po_id
left join public.productions pr on pr.id = e.production_id
left join public.expense_categories k on k.id = e.category_id;
revoke all on public.v_expenses from anon;

revoke all on function public.catat_total_biaya_tetap(date, date, numeric) from public, anon;
grant execute on function public.catat_total_biaya_tetap(date, date, numeric) to authenticated;

-- Catat migrasinya biar Supabase tahu udah jalan.
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261127000200', 'total_biaya_tetap')
on conflict do nothing;

commit;

-- Cek abis jalan (cuma baca): harus keluar kategori Biaya tetap bulanan.
select nama, nota_wajib, aktif from public.expense_categories where nama = 'Biaya tetap bulanan';
notify pgrst, 'reload schema';