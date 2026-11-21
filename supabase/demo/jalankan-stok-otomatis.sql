-- Jalanin sekali di Supabase SQL Editor (produksi), SEBELUM push. Dua perubahan 21 Nov 2026:
--   1. Stok otomatis dari produksi yang disetujui (halaman Stok jadi dashboard).
--   2. Proyek dipilih di Produksi aja, terima ikan boleh tanpa proyek.
-- Isinya sama persis dengan dua berkas migrasi 20261121000100 dan 20261121000200.

begin;

-- Permintaan tim 21 Nov 2026: halaman Stok jadi dashboard, nggak ada input manual. Hasil produksi masuk stok sendiri.
--   1. Begitu produksi disetujui Owner (status diperiksa), hasilnya otomatis jadi unit stok:
--      loin per grade (produk "Loin tuna") dan hasil samping per jenis (produk dengan nama jenisnya).
--   2. Timbangan produksi yang dikoreksi setelah disetujui (koreksi timbangan) ikut ngubah unit stok otomatisnya.
--      Yang udah kejual atau keluar jadi batas bawah.
--   3. Produksi lama yang udah disetujui tapi belum masuk stok ikut dimasukin sekali di migrasi ini.
-- Produksi yang hasilnya udah dimasukin manual (cara lama) dibiarin, supaya nggak dobel.
-- Aturan (PRD): berat numeric(12,3); tidak ada hapus; setiap perubahan berat punya baris pergerakan.

alter table public.storage_units add column otomatis boolean not null default false;
alter table public.storage_units add column component_category_id uuid references public.component_categories (id);
alter table public.productions add column kondisi_hasil text not null default 'beku' check (kondisi_hasil in ('fresh', 'beku'));
create index storage_units_otomatis_idx on public.storage_units (production_id) where otomatis;

-- Satu unit otomatis: bikin baru, ubah beratnya, atau dikosongin (kalau beratnya jadi 0).
create or replace function private.atur_unit_otomatis(
  p public.productions, p_product uuid, p_product_nama text, p_grade uuid, p_kategori uuid, p_kg numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u public.storage_units;
  kode_grade text;
  selisih numeric(12,3);
begin
  select * into u from public.storage_units s
  where s.production_id = p.id and s.otomatis
    and s.grade_id is not distinct from p_grade and s.component_category_id is not distinct from p_kategori
  for update;

  if not found then
    if coalesce(p_kg, 0) <= 0 then
      return;
    end if;
    select g.kode into kode_grade from public.grades g where g.id = p_grade;
    insert into public.storage_units (
      product_id, product_nama, grade_id, grade_kode, kondisi, production_id, production_kode,
      kg_masuk, sisa_kg, sisa_dasar_masuk, otomatis, component_category_id, catatan
    ) values (
      p_product, p_product_nama, p_grade, kode_grade, p.kondisi_hasil, p.id, p.kode,
      p_kg, p_kg, p_kg, true, p_kategori, 'Otomatis dari produksi ' || p.kode
    ) returning * into u;
    insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan)
    values (u.id, 'masuk', p_kg, p_kg, 'Hasil produksi ' || p.kode);
    return;
  end if;

  selisih := round(coalesce(p_kg, 0), 3) - u.kg_masuk;
  if selisih = 0 then
    return;
  end if;
  if u.sisa_kg + selisih < 0 then
    raise exception 'Hasil % (%) udah keluar % kg, jadi beratnya nggak bisa kurang dari itu.',
      p.kode, u.product_nama || coalesce(' ' || u.grade_kode, ''), trim_scale(u.kg_masuk - u.sisa_kg)::text using errcode = 'KT001';
  end if;
  if coalesce(p_kg, 0) <= 0 then
    -- Hasilnya dikosongin: unit ditutup (nggak dihapus), berat masuk lama tetap tercatat.
    update public.storage_units set sisa_kg = 0, sisa_dasar_masuk = 0, status = 'habis' where id = u.id;
    insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan)
    values (u.id, 'koreksi', -u.sisa_kg, -u.sisa_dasar_masuk, 'Koreksi timbangan produksi ' || p.kode);
    return;
  end if;
  update public.storage_units
  set kg_masuk = round(p_kg, 3), sisa_kg = sisa_kg + selisih, sisa_dasar_masuk = greatest(sisa_dasar_masuk + selisih, 0),
      status = case when sisa_kg + selisih > 0 then 'aktif' else 'habis' end
  where id = u.id;
  insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan)
  values (u.id, 'koreksi', selisih, selisih, 'Koreksi timbangan produksi ' || p.kode);
end;
$$;

-- Samain stok otomatis dengan timbangan produksi yang udah disetujui.
create or replace function private.sinkron_stok_produksi(p_production uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  loin_id uuid;
  r record;
begin
  select * into p from public.productions where id = p_production;
  if not found or p.status <> 'diperiksa' then
    return;
  end if;
  -- Hasil yang dulu dimasukin manual: dibiarin, biar nggak dobel.
  if exists (select 1 from public.storage_units s where s.production_id = p.id and not s.otomatis) then
    return;
  end if;
  select id into loin_id from public.products where lower(nama) = 'loin tuna';
  if loin_id is null then
    raise exception 'Produk "Loin tuna" nggak ada di data master.' using errcode = 'KT001';
  end if;

  -- Loin per grade: total per grade ditambah timbang per potong (yang nggak batal).
  for r in
    select g.id as grade_id, coalesce(x.kg, 0) as kg
    from public.grades g
    left join (
      select grade_id, sum(kg) as kg from (
        select t.grade_id, t.kg from public.production_loin_totals t where t.production_id = p.id
        union all
        select i.grade_id, i.kg from public.production_items i where i.production_id = p.id and not i.batal
      ) a group by grade_id
    ) x on x.grade_id = g.id
    where x.kg > 0 or exists (select 1 from public.storage_units s where s.production_id = p.id and s.otomatis and s.grade_id = g.id and s.component_category_id is null)
  loop
    perform private.atur_unit_otomatis(p, loin_id, 'Loin tuna', r.grade_id, null, r.kg);
  end loop;

  -- Hasil samping per jenis: produknya pakai nama jenisnya (dibikin kalau belum ada).
  for r in
    select c.id as kategori, c.nama, coalesce(x.kg, 0) as kg
    from public.component_categories c
    left join public.production_components x on x.category_id = c.id and x.production_id = p.id
    where c.komponen = 'hasil_samping'
      and (x.kg > 0 or exists (select 1 from public.storage_units s where s.production_id = p.id and s.otomatis and s.component_category_id = c.id))
  loop
    insert into public.products (nama, satuan) values (r.nama, 'kg') on conflict ((lower(nama))) do nothing;
    perform private.atur_unit_otomatis(p, (select id from public.products where lower(nama) = lower(r.nama)), r.nama, null, r.kategori, r.kg);
  end loop;
end;
$$;

-- Pemicu: produksi disetujui Owner, atau timbangannya dikoreksi setelah disetujui.
create or replace function private.picu_stok_produksi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'productions' then
    perform private.sinkron_stok_produksi(new.id);
  else
    perform private.sinkron_stok_produksi(new.production_id);
  end if;
  return new;
end;
$$;
create trigger productions_stok_otomatis after update of status on public.productions
  for each row when (new.status = 'diperiksa' and old.status is distinct from 'diperiksa')
  execute function private.picu_stok_produksi();
create trigger loin_totals_stok_otomatis after insert or update on public.production_loin_totals
  for each row execute function private.picu_stok_produksi();
create trigger items_stok_otomatis after insert or update on public.production_items
  for each row execute function private.picu_stok_produksi();
create trigger components_stok_otomatis after insert or update on public.production_components
  for each row execute function private.picu_stok_produksi();

-- Kondisi hasil (fresh atau beku) ikut ke unit otomatisnya.
create or replace function public.atur_kondisi_hasil(p_production uuid, p_kondisi text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
begin
  perform private.wajib_izin('produksi.write');
  if p_kondisi not in ('fresh', 'beku') then
    raise exception 'Kondisi harus fresh atau beku.' using errcode = 'KT001';
  end if;
  p := private.produksi_terkunci(p_production);
  update public.productions set kondisi_hasil = p_kondisi where id = p.id;
  update public.storage_units set kondisi = p_kondisi where production_id = p.id and otomatis and kondisi <> p_kondisi;
end;
$$;

-- Produksi lama yang udah disetujui tapi hasilnya belum masuk stok.
do $$
declare
  r record;
begin
  for r in select p.id from public.productions p
           where p.status = 'diperiksa' and not exists (select 1 from public.storage_units s where s.production_id = p.id) loop
    perform private.sinkron_stok_produksi(r.id);
  end loop;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['private.atur_unit_otomatis(public.productions, uuid, text, uuid, uuid, numeric)', 'private.sinkron_stok_produksi(uuid)', 'private.picu_stok_produksi()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  execute 'revoke all on function public.atur_kondisi_hasil(uuid, text) from public, anon';
  execute 'grant execute on function public.atur_kondisi_hasil(uuid, text) to authenticated';
end;
$$;

-- Permintaan tim 21 Nov 2026: proyek nggak dipilih lagi pas terima ikan (takut salah input), cuma di Produksi.
--   1. Terima ikan boleh tanpa proyek. Lot tanpa proyek tetap bisa digrading dan diajukan pembeliannya.
--   2. Begitu lot tanpa proyek dipakai produksi, lotnya ikut proyek produksinya.
--      Kalau lotnya udah masuk pembelian yang belum punya proyek, pembeliannya (dan lot lain di pembelian itu) ikut juga.
--   3. Lot yang udah punya proyek tetap dikunci ke proyeknya (aturan kunci proyek 18 Nov).
-- Data lama nggak diubah.

-- ============================================================ 1. terima ikan tanpa proyek
create or replace function public.terima_ikan(
  p_supplier uuid, p_kg numeric, p_tanggal date default current_date, p_cycle uuid default null,
  p_catatan text default '', p_proyek_baru text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_lot uuid;
  proyek uuid := p_cycle;
begin
  perform private.wajib_izin('penerimaan.write');
  perform private.valid_kg(p_kg, 'Berat ikan');
  if not exists (select 1 from public.suppliers s where s.id = p_supplier and s.aktif) then
    raise exception 'Pilih pemasok atau nelayannya.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_proyek_baru, ''))) > 0 then
    proyek := private.buat_proyek_inti(p_proyek_baru, 'jual', null, p_tanggal);
  elsif proyek is not null and not exists (select 1 from public.cycles c where c.id = proyek and c.status = 'terbuka') then
    raise exception 'Proyeknya nggak ketemu atau udah ditutup.' using errcode = 'KT001';
  end if;
  insert into public.lots (supplier_id, cycle_id, kg, sisa_kg, tanggal_terima, catatan)
  values (p_supplier, proyek, round(p_kg, 3), round(p_kg, 3), coalesce(p_tanggal, current_date), coalesce(p_catatan, ''))
  returning id into id_lot;
  return id_lot;
end;
$$;

-- ============================================================ 2. penjaga proyek lot
-- Lot masuk pengajuan: proyeknya harus sama dengan pengajuannya (dua-duanya boleh kosong).
create or replace function private.jaga_proyek_lot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  po public.purchase_orders;
  prd text;
begin
  if new.po_id is not null and new.po_id is distinct from old.po_id then
    select * into po from public.purchase_orders where id = new.po_id;
    if po.kode is null and po.cycle_id is distinct from new.cycle_id then
      raise exception 'Satu pengajuan cuma buat satu proyek. Lot % beda proyek.', new.kode using errcode = 'KT001';
    end if;
  end if;

  if new.cycle_id is distinct from old.cycle_id then
    if new.po_id is not null then
      select * into po from public.purchase_orders where id = new.po_id;
      if po.cycle_id is not null and po.cycle_id is distinct from new.cycle_id then
        raise exception 'Lot % udah masuk pembelian proyek lain.', new.kode using errcode = 'KT001';
      end if;
    end if;
    select p.kode into prd from public.lot_allocations a join public.productions p on p.id = a.production_id
    where a.lot_id = new.id and p.cycle_id is not null and p.cycle_id is distinct from new.cycle_id limit 1;
    if prd is not null then
      raise exception 'Lot % udah dipakai produksi % di proyek lain, jadi proyeknya nggak bisa diganti.', new.kode, prd using errcode = 'KT001';
    end if;
  end if;
  return new;
end;
$$;

-- Proyek PO diganti: lot yang belum punya proyek atau masih di proyek lamanya ikut pindah.
create or replace function private.ikut_proyek_po()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cycle_id is null and old.cycle_id is not null then
    raise exception 'Proyek pembelian nggak boleh dikosongin.' using errcode = 'KT001';
  end if;
  update public.lots set cycle_id = new.cycle_id
  where po_id = new.id and (cycle_id is null or cycle_id = old.cycle_id) and cycle_id is distinct from new.cycle_id;
  return new;
end;
$$;

-- ============================================================ 3. lot ikut proyek produksi
create or replace function private.jaga_proyek_alokasi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  l public.lots;
  po public.purchase_orders;
begin
  select * into p from public.productions where id = new.production_id;
  select * into l from public.lots where id = new.lot_id;
  if l.cycle_id is null then
    if p.cycle_id is not null then
      if l.po_id is not null then
        select * into po from public.purchase_orders where id = l.po_id;
        if po.cycle_id is null then
          -- Pembeliannya ikut proyek ini; lot lain di pembelian itu ikut lewat ikut_proyek_po.
          update public.purchase_orders set cycle_id = p.cycle_id where id = po.id;
        end if;
      end if;
      update public.lots set cycle_id = p.cycle_id where id = l.id and cycle_id is null;
    end if;
    return new;
  end if;
  if p.cycle_id is null then
    update public.productions set cycle_id = l.cycle_id where id = p.id;
  elsif p.cycle_id <> l.cycle_id then
    raise exception 'Lot % udah masuk proyek lain. Satu produksi cuma boleh pakai ikan dari proyeknya sendiri.', l.kode using errcode = 'KT001';
  end if;
  return new;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['private.jaga_proyek_lot()', 'private.ikut_proyek_po()', 'private.jaga_proyek_alokasi()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  execute 'revoke all on function public.terima_ikan(uuid, numeric, date, uuid, text, text) from public, anon';
  execute 'grant execute on function public.terima_ikan(uuid, numeric, date, uuid, text, text) to authenticated';
end;
$$;

-- Catat migrasinya biar Supabase tahu udah jalan.
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261121000100', 'stok_otomatis'),
  ('20261121000200', 'proyek_di_produksi')
on conflict do nothing;

commit;
