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
