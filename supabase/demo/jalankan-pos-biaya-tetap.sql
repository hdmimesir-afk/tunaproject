-- Jalanin sekali di Supabase SQL Editor (produksi), SEBELUM push. Isinya sama persis dengan migrasi:
--   20261123000500_pos_biaya_tetap: biaya tetap jadi pos (kelompok + bulanan/tahunan), lima kelompok jadi kategori biaya
-- Semuanya dalam satu transaksi: kalau ada yg gagal, nggak ada yg berubah. Biaya yg udah ada nggak diubah.

begin;

-- =====================================================================
-- 20261123000500_pos_biaya_tetap
-- =====================================================================
-- 23 Nov 2026: biaya tetap jadi "pos" sesuai format tim finance Katalis. Tiap pos punya:
--   nama, kelompok (Tenaga kerja, Overhead pabrik, Sertifikasi dan izin, Kantor, Keuangan), dan cara bayar:
--   bulanan (nominal per bulan, dicatat tiap bulan) atau tahunan (nominal per tahun, dicatat sekali setahun di bulan bayarnya).
-- Kelompok sekaligus jadi kategori biaya di buku kas (lima kategori baru, nggak wajib nota; admin bisa ubah di Pengaturan),
-- jadi pos nggak perlu milih kategori lagi. Komponen tiap pos diisi sendiri sama tim finance.

-- ============================================================ kategori dari kelompok
insert into public.expense_categories (nama, urutan, nota_wajib)
select v.nama, v.urutan, false
from (values ('Tenaga kerja', 20), ('Overhead pabrik', 21), ('Sertifikasi dan izin', 22), ('Kantor', 23), ('Keuangan', 24)) v(nama, urutan)
where not exists (select 1 from public.expense_categories k where lower(k.nama) = lower(v.nama));

create or replace function private.label_kelompok_biaya(p_kelompok text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_kelompok
    when 'tenaga_kerja' then 'Tenaga kerja'
    when 'overhead_pabrik' then 'Overhead pabrik'
    when 'sertifikasi_izin' then 'Sertifikasi dan izin'
    when 'kantor' then 'Kantor'
    when 'keuangan' then 'Keuangan'
  end;
$$;
revoke all on function private.label_kelompok_biaya(text) from public, anon, authenticated;

-- ============================================================ kolom pos
alter table public.fixed_costs add column kelompok text not null default 'kantor'
  check (kelompok in ('tenaga_kerja', 'overhead_pabrik', 'sertifikasi_izin', 'kantor', 'keuangan'));
alter table public.fixed_costs add column cara_bayar text not null default 'bulanan' check (cara_bayar in ('bulanan', 'tahunan'));
alter table public.fixed_costs add column bulan_bayar smallint check (bulan_bayar between 1 and 12);
alter table public.fixed_costs add constraint fixed_costs_bulan_tahunan check ((cara_bayar = 'tahunan') = (bulan_bayar is not null));

-- Pos lama (kalau udah ada yg sempat diisi) ikut kelompok sesuai kategorinya kalau namanya cocok, sisanya Kantor.
update public.fixed_costs f
set kelompok = case lower(k.nama)
    when 'tenaga kerja' then 'tenaga_kerja' when 'overhead pabrik' then 'overhead_pabrik'
    when 'sertifikasi dan izin' then 'sertifikasi_izin' when 'keuangan' then 'keuangan' else 'kantor' end
from public.expense_categories k
where k.id = f.category_id;

-- ============================================================ simpan pos
drop function public.simpan_biaya_tetap(uuid, text, uuid, numeric, boolean, text);

create or replace function public.simpan_biaya_tetap(
  p_id uuid, p_nama text, p_kelompok text, p_cara_bayar text, p_jumlah numeric, p_bulan_bayar int, p_aktif boolean, p_catatan text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_b uuid;
  kat uuid;
begin
  perform private.wajib_izin('keuangan.write');
  if length(trim(coalesce(p_nama, ''))) = 0 then
    raise exception 'Tulis nama posnya.' using errcode = 'KT001';
  end if;
  if private.label_kelompok_biaya(p_kelompok) is null then
    raise exception 'Pilih kelompok posnya.' using errcode = 'KT001';
  end if;
  if p_cara_bayar not in ('bulanan', 'tahunan') then
    raise exception 'Pilih cara bayarnya: bulanan atau tahunan.' using errcode = 'KT001';
  end if;
  if p_cara_bayar = 'tahunan' and (p_bulan_bayar is null or p_bulan_bayar not between 1 and 12) then
    raise exception 'Pilih bulan bayarnya buat pos tahunan.' using errcode = 'KT001';
  end if;
  if p_jumlah is null or p_jumlah <= 0 or round(p_jumlah, 2) <> p_jumlah then
    raise exception 'Nominalnya harus lebih dari nol dengan paling banyak dua desimal.' using errcode = 'KT001';
  end if;
  select k.id into kat from public.expense_categories k where lower(k.nama) = lower(private.label_kelompok_biaya(p_kelompok)) and k.aktif;
  if kat is null then
    raise exception 'Kategori biaya "%" nggak aktif. Aktifin dulu di Pengaturan.', private.label_kelompok_biaya(p_kelompok) using errcode = 'KT001';
  end if;
  if coalesce(p_aktif, true) and exists (
    select 1 from public.fixed_costs f where f.aktif and lower(trim(f.nama)) = lower(trim(p_nama)) and f.id is distinct from p_id
  ) then
    raise exception 'Pos "%" udah ada.', trim(p_nama) using errcode = 'KT001';
  end if;
  if p_id is null then
    insert into public.fixed_costs (nama, category_id, kelompok, cara_bayar, bulan_bayar, jumlah, aktif, catatan)
    values (trim(p_nama), kat, p_kelompok, p_cara_bayar, case when p_cara_bayar = 'tahunan' then p_bulan_bayar end, p_jumlah,
      coalesce(p_aktif, true), trim(coalesce(p_catatan, '')))
    returning id into id_b;
  else
    update public.fixed_costs
    set nama = trim(p_nama), category_id = kat, kelompok = p_kelompok, cara_bayar = p_cara_bayar,
        bulan_bayar = case when p_cara_bayar = 'tahunan' then p_bulan_bayar end, jumlah = p_jumlah,
        aktif = coalesce(p_aktif, true), catatan = trim(coalesce(p_catatan, ''))
    where id = p_id
    returning id into id_b;
    if id_b is null then
      raise exception 'Pos tidak ditemukan.' using errcode = 'KT001';
    end if;
  end if;
  return id_b;
end;
$$;

-- ============================================================ catat bulan ini
-- Pos bulanan dicatat tiap bulan. Pos tahunan cuma dicatat di bulan bayarnya (sekali setahun, nominal setahun penuh).
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

revoke all on function public.simpan_biaya_tetap(uuid, text, text, text, numeric, int, boolean, text) from public, anon;
grant execute on function public.simpan_biaya_tetap(uuid, text, text, text, numeric, int, boolean, text) to authenticated;

-- Catat migrasinya biar Supabase tahu udah jalan.
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261123000500', 'pos_biaya_tetap')
on conflict do nothing;

commit;

-- Cek abis jalan (cuma baca): harus keluar 1 baris migrasi.
select version, name from supabase_migrations.schema_migrations where version = '20261123000500';
notify pgrst, 'reload schema';