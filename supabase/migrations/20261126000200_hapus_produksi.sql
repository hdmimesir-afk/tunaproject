-- 26 Nov 2026 (permintaan tim Katalis, tahap 3): hapus record di produksi, buat yang kecatat dobel. Permanen, wajib alasan,
-- kecatat di log hapus (sama kayak hapus lot, pesanan, titipan).
--   1. hapus_baris_produksi: satu baris di produksi yang masih berjalan (pemakaian lot, loin per potong, ekor, komponen,
--      loin total per grade). Pemakaian lot yang dihapus, beratnya balik ke sisa lot. Produksi yang udah selesai dibuka lagi
--      dulu (Buka lagi), biar nggak ngubah yang udah diperiksa diam-diam.
--   2. hapus_produksi: satu produksi utuh. Ditolak kalau hasilnya udah dijual, diambil, atau ditagih. Kalau hasilnya udah
--      masuk stok (otomatis) tapi belum kemana-mana, stoknya ikut kehapus. Berat lot balik, biaya yg nyambung dilepas.

create or replace function public.hapus_baris_produksi(p_tabel text, p_id uuid, p_alasan text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
  p public.productions;
  label text;
  rincian text;
  a public.lot_allocations;
  n_riwayat int := 0;
begin
  perform private.wajib_izin('produksi.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan kenapa barisnya dihapus.');
  if p_tabel not in ('lot_allocations', 'production_items', 'production_fish', 'production_components', 'production_loin_totals') then
    raise exception 'Jenis baris produksi nggak dikenal.' using errcode = 'KT001';
  end if;
  execute format('select production_id from public.%I where id = $1', p_tabel) into pid using p_id;
  if pid is null then
    raise exception 'Barisnya nggak ketemu.' using errcode = 'KT001';
  end if;
  select * into p from public.productions where id = pid for update;
  if p.status <> 'berjalan' then
    raise exception 'Produksi % udah %. Pencet Buka lagi dulu kalau mau hapus barisnya.', p.kode, replace(p.status, '_', ' ') using errcode = 'KT001';
  end if;

  perform set_config('katalis.hapus_resmi', 'ya', true);
  if p_tabel = 'lot_allocations' then
    select * into a from public.lot_allocations where id = p_id for update;
    if (select count(*) from public.lot_allocations where production_id = pid) <= 1 and coalesce(p.kg_masuk_pt, 0) = 0 then
      perform set_config('katalis.hapus_resmi', '', true);
      raise exception 'Ini lot satu-satunya di produksi %. Kalau produksinya dobel, hapus produksinya aja.', p.kode using errcode = 'KT001';
    end if;
    update public.lots set sisa_kg = sisa_kg + a.kg where id = a.lot_id;
    delete from public.lot_allocations where id = p_id;
    label := 'Pemakaian lot';
    rincian := a.lot_kode || ' · ' || trim_scale(a.kg)::text || ' kg';
  elsif p_tabel = 'production_items' then
    select count(*) into n_riwayat from public.production_items_history where item_id = p_id;
    select 'Loin no ' || coalesce(i.no_loin::text, '?') || ' · ' || trim_scale(i.kg)::text || ' kg' into rincian from public.production_items i where i.id = p_id;
    delete from public.production_items_history where item_id = p_id;
    delete from public.production_items where id = p_id;
    label := 'Loin per potong';
  elsif p_tabel = 'production_fish' then
    select 'Ekor no ' || f.no_ekor || ' · ' || trim_scale(f.berat_utuh_kg)::text || ' kg' into rincian from public.production_fish f where f.id = p_id;
    delete from public.production_fish where id = p_id;
    label := 'Berat per ekor';
  elsif p_tabel = 'production_components' then
    select coalesce(k.nama, 'Komponen') || ' · ' || coalesce(trim_scale(c.kg)::text, '-') || ' kg' into rincian
    from public.production_components c left join public.component_categories k on k.id = c.category_id where c.id = p_id;
    delete from public.production_components where id = p_id;
    label := 'Hasil samping, limbah, susut';
  else
    select coalesce(g.kode, 'Grade') || ' · ' || trim_scale(t.kg)::text || ' kg' into rincian
    from public.production_loin_totals t left join public.grades g on g.id = t.grade_id where t.id = p_id;
    delete from public.production_loin_totals where id = p_id;
    label := 'Loin total per grade';
  end if;
  perform set_config('katalis.hapus_resmi', '', true);

  return private.log_hapus_satu('produksi', p_alasan,
    private.baris_log(p_tabel, label || ' di ' || p.kode, 1, array[coalesce(rincian, '')])
    || private.baris_log('production_items_history', 'Riwayat timbangan', n_riwayat));
end;
$$;

create or replace function public.hapus_produksi(p_production uuid, p_alasan text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  unit_ids uuid[];
  n_lot int; n_item int; n_riwayat int; n_ekor int; n_komp int; n_total int; n_unit int; n_gerak int; n_kor int;
begin
  perform private.wajib_izin('produksi.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan kenapa produksinya dihapus.');
  select * into p from public.productions where id = p_production for update;
  if not found then
    raise exception 'Produksi nggak ketemu.' using errcode = 'KT001';
  end if;
  select coalesce(array_agg(id), '{}') into unit_ids from public.storage_units where production_id = p.id;
  if exists (select 1 from public.sale_allocations where (unit_id = any(unit_ids) or production_id = p.id) and not batal) then
    raise exception 'Hasil produksi % udah masuk pesanan jual, jadi nggak bisa dihapus. Pakai Koreksi aja.', p.kode using errcode = 'KT001';
  end if;
  if exists (select 1 from public.storage_movements where unit_id = any(unit_ids) and jenis = 'keluar')
     or exists (select 1 from public.service_charges where unit_id = any(unit_ids)) then
    raise exception 'Hasil produksi % udah ada yang diambil dari gudang, jadi nggak bisa dihapus. Pakai Koreksi aja.', p.kode using errcode = 'KT001';
  end if;

  select count(*) into n_lot from public.lot_allocations where production_id = p.id;
  select count(*) into n_item from public.production_items where production_id = p.id;
  select count(*) into n_riwayat from public.production_items_history where production_id = p.id;
  select count(*) into n_ekor from public.production_fish where production_id = p.id;
  select count(*) into n_komp from public.production_components where production_id = p.id;
  select count(*) into n_total from public.production_loin_totals where production_id = p.id;
  n_unit := cardinality(unit_ids);
  select count(*) into n_gerak from public.storage_movements where unit_id = any(unit_ids);
  select count(*) into n_kor from public.koreksi_data where tabel = 'productions' and ref_id = p.id;

  perform set_config('katalis.hapus_resmi', 'ya', true);
  update public.lots l set sisa_kg = l.sisa_kg + g.kg
  from (select lot_id, sum(kg) as kg from public.lot_allocations where production_id = p.id group by lot_id) g
  where l.id = g.lot_id;
  update public.expenses set production_id = null where production_id = p.id;
  update public.sale_allocations set production_id = null where production_id = p.id;
  delete from public.storage_movements where unit_id = any(unit_ids);
  delete from public.storage_units where id = any(unit_ids);
  delete from public.lot_allocations where production_id = p.id;
  delete from public.production_items_history where production_id = p.id;
  delete from public.production_items where production_id = p.id;
  delete from public.production_loin_totals where production_id = p.id;
  delete from public.production_components where production_id = p.id;
  delete from public.production_fish where production_id = p.id;
  delete from public.koreksi_data where tabel = 'productions' and ref_id = p.id;
  delete from public.productions where id = p.id;
  perform set_config('katalis.hapus_resmi', '', true);

  return private.log_hapus_satu('produksi', p_alasan,
    private.baris_log('productions', 'Produksi', 1, array[p.kode || ' · ' || to_char(p.tanggal, 'YYYY-MM-DD') || ' · ' || replace(p.status, '_', ' ')])
    || private.baris_log('lot_allocations', 'Pemakaian lot (beratnya balik ke lot)', n_lot)
    || private.baris_log('production_loin_totals', 'Loin total per grade', n_total)
    || private.baris_log('production_items', 'Loin per potong', n_item)
    || private.baris_log('production_items_history', 'Riwayat timbangan', n_riwayat)
    || private.baris_log('production_components', 'Hasil samping, limbah, susut', n_komp)
    || private.baris_log('production_fish', 'Berat per ekor', n_ekor)
    || private.baris_log('storage_units', 'Stok hasil produksi', n_unit)
    || private.baris_log('storage_movements', 'Gerakan stok', n_gerak)
    || private.baris_log('koreksi_data', 'Riwayat koreksi', n_kor));
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.hapus_baris_produksi(text, uuid, text)', 'public.hapus_produksi(uuid, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
