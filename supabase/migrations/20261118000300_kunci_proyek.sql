-- Meeting operasional 18 Nov 2026 poin 4: tiap transaksi dan produksi nyambung ke proyek, data antarproyek nggak boleh kecampur.
--   1. Terima ikan wajib pilih proyek (atau bikin proyek baru).
--   2. Satu pengajuan pembelian cuma buat lot dari satu proyek, dan lotnya wajib punya proyek.
--   3. Satu produksi cuma boleh pakai lot dari proyeknya sendiri.
--   4. Ganti proyek di lot, pembelian, atau produksi dijaga biar ketiganya tetap nyambung. Proyek PO yang diganti ikut ke lotnya.
-- Data lama nggak diubah; aturannya cuma berlaku waktu data dibikin atau diubah.

-- ============================================================ 1. terima ikan wajib proyek
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
  elsif proyek is null then
    raise exception 'Pilih proyeknya, atau bikin proyek baru.' using errcode = 'KT001';
  elsif not exists (select 1 from public.cycles c where c.id = proyek and c.status = 'terbuka') then
    raise exception 'Proyeknya nggak ketemu atau udah ditutup.' using errcode = 'KT001';
  end if;
  insert into public.lots (supplier_id, cycle_id, kg, sisa_kg, tanggal_terima, catatan)
  values (p_supplier, proyek, round(p_kg, 3), round(p_kg, 3), coalesce(p_tanggal, current_date), coalesce(p_catatan, ''))
  returning id into id_lot;
  return id_lot;
end;
$$;

-- ============================================================ 2-4. penjaga proyek
-- Lot masuk pengajuan pembelian (alur baru, PO belum punya kode): lot wajib punya proyek dan proyeknya sama dengan pengajuannya.
-- Ganti proyek lot: nggak boleh beda dari PO-nya atau dari produksi yang udah pakai lot itu.
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
    if po.kode is null then
      if new.cycle_id is null then
        raise exception 'Lot % belum ada proyeknya. Pilih proyeknya dulu lewat tombol Koreksi.', new.kode using errcode = 'KT001';
      end if;
      if po.cycle_id is distinct from new.cycle_id then
        raise exception 'Satu pengajuan cuma buat satu proyek. Lot % beda proyek.', new.kode using errcode = 'KT001';
      end if;
    end if;
  end if;

  if new.cycle_id is distinct from old.cycle_id then
    if new.po_id is not null then
      select * into po from public.purchase_orders where id = new.po_id;
      if po.cycle_id is not null and po.cycle_id is distinct from new.cycle_id then
        raise exception 'Lot % udah masuk pembelian. Ganti proyeknya lewat koreksi pembelian.', new.kode using errcode = 'KT001';
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
create trigger lots_jaga_proyek before update of po_id, cycle_id on public.lots
  for each row execute function private.jaga_proyek_lot();

-- Proyek PO diganti: lotnya ikut pindah. PO alur baru nggak boleh dikosongin proyeknya.
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
  update public.lots set cycle_id = new.cycle_id where po_id = new.id and cycle_id is distinct from new.cycle_id;
  return new;
end;
$$;
create trigger purchase_orders_ikut_proyek after update of cycle_id on public.purchase_orders
  for each row when (new.cycle_id is distinct from old.cycle_id)
  execute function private.ikut_proyek_po();

-- Lot yang dipakai produksi harus dari proyek produksinya. Produksi tanpa proyek ikut proyek lot pertamanya.
create or replace function private.jaga_proyek_alokasi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  l public.lots;
begin
  select * into p from public.productions where id = new.production_id;
  select * into l from public.lots where id = new.lot_id;
  if l.cycle_id is null then
    return new;
  end if;
  if p.cycle_id is null then
    update public.productions set cycle_id = l.cycle_id where id = p.id;
  elsif p.cycle_id <> l.cycle_id then
    raise exception 'Lot % dari proyek lain. Satu produksi cuma boleh pakai ikan dari proyeknya sendiri.', l.kode using errcode = 'KT001';
  end if;
  return new;
end;
$$;
create trigger lot_allocations_jaga_proyek before insert or update of lot_id, production_id on public.lot_allocations
  for each row execute function private.jaga_proyek_alokasi();

-- Proyek produksi diganti: harus tetap sama dengan proyek lot yang dipakai.
create or replace function private.jaga_proyek_produksi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  kode_lot text;
begin
  select l.kode into kode_lot from public.lot_allocations a join public.lots l on l.id = a.lot_id
  where a.production_id = new.id and l.cycle_id is not null and l.cycle_id is distinct from new.cycle_id limit 1;
  if kode_lot is not null then
    raise exception 'Produksi % pakai lot % dari proyek lain. Proyeknya harus sama dengan proyek lotnya.', new.kode, kode_lot using errcode = 'KT001';
  end if;
  return new;
end;
$$;
create trigger productions_jaga_proyek before update of cycle_id on public.productions
  for each row when (new.cycle_id is distinct from old.cycle_id)
  execute function private.jaga_proyek_produksi();

do $$
declare
  f text;
begin
  foreach f in array array['private.jaga_proyek_lot()', 'private.ikut_proyek_po()', 'private.jaga_proyek_alokasi()', 'private.jaga_proyek_produksi()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end;
$$;
