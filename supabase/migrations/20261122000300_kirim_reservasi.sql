-- 22 Nov 2026: validasi pengiriman dan reservasi stok.
--   Reservasi = berat pesanan draf (sale_allocations yang nggak batal di pesanan berstatus draf). Stok tetap baru
--   berkurang pas Kirim, bukan pas draf.
--   1. kirim_pesanan: berat kirim tiap baris nggak boleh lebih dari berat pesanannya, dan nggak boleh makan jatah
--      pesanan draf lain. Pengiriman sebagian (kirim kurang dari pesanan) tetap boleh; cuma ada satu kali kirim per
--      pesanan, sisanya dilepas begitu pesanan jadi terkirim (perilaku lama).
--      Semua unit yang dipakai pesanan dikunci sekaligus, urut id, biar dua pengiriman barengan nggak saling kunci.
--   2. ambil_stok (stok sendiri): nggak boleh ngambil berat yang udah dipesan pesanan draf.
--   3. Koreksi timbangan produksi (stok otomatis): nggak boleh nurunin stok di bawah yang udah dipesan.
-- Data lama nggak diubah. Pesanan draf lama yang dipesannya udah lebih dari stok tetap tersimpan; cuma nanti ditolak
-- pas dikirim kalau stoknya emang nggak cukup.

-- Berat yang udah dipesan pesanan draf di satu unit (kecuali satu pesanan, biasanya pesanan yang lagi diproses).
create or replace function private.kg_dipesan(p_unit uuid, p_kecuali uuid default null)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(a.kg_pesan), 0)::numeric(12,3)
  from public.sale_allocations a
  join public.sales_orders s on s.id = a.order_id
  where a.unit_id = p_unit and not a.batal and s.status = 'draf' and s.id is distinct from p_kecuali;
$$;

-- Kode pesanan draf yang pegang jatah di satu unit (buat pesan galat).
create or replace function private.pesanan_pemegang(p_unit uuid, p_kecuali uuid default null)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(string_agg(distinct s.kode, ', ' order by s.kode), '')
  from public.sale_allocations a
  join public.sales_orders s on s.id = a.order_id
  where a.unit_id = p_unit and not a.batal and s.status = 'draf' and s.id is distinct from p_kecuali;
$$;

-- ============================================================ 1. kirim pesanan
-- p_baris: [{"id": alokasi, "kg_kirim": 49.5, "kg_diterima": null}, ...] untuk semua baris pesanan.
create or replace function public.kirim_pesanan(p_order uuid, p_baris jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  a public.sale_allocations;
  u public.storage_units;
  r record;
  porsi numeric(12,3);
  lain numeric(12,3);
  bisa numeric(12,3);
begin
  perform private.wajib_izin('pengiriman.write');
  select * into o from public.sales_orders where id = p_order for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'KT001';
  end if;
  if o.status = 'terkirim' then
    raise exception 'Pesanan % udah pernah dikirim, nggak bisa dikirim lagi.', o.kode using errcode = 'KT001';
  end if;
  if o.status <> 'draf' then
    raise exception 'Pesanan % udah %, nggak bisa dikirim.', o.kode, o.status using errcode = 'KT001';
  end if;
  if p_baris is null or jsonb_typeof(p_baris) <> 'array' then
    raise exception 'Isi berat kirim untuk semua baris.' using errcode = 'KT001';
  end if;
  if (select count(*) from public.sale_allocations where order_id = o.id and not batal) <> jsonb_array_length(p_baris)
     or (select count(distinct x ->> 'id') from jsonb_array_elements(p_baris) x) <> jsonb_array_length(p_baris) then
    raise exception 'Isi berat kirim untuk semua baris pesanan, masing-masing sekali.' using errcode = 'KT001';
  end if;

  -- Kunci semua unit yang dipakai pesanan ini sekaligus, urut id (urutan yang sama dengan simpan_pesanan).
  perform 1 from public.storage_units
  where id in (select unit_id from public.sale_allocations where order_id = o.id and not batal)
  order by id for update;

  for r in select * from jsonb_to_recordset(p_baris) as x(id uuid, kg_kirim numeric, kg_diterima numeric) order by id loop
    select * into a from public.sale_allocations where id = r.id and order_id = o.id and not batal;
    if not found then
      raise exception 'Baris pesanan tidak ditemukan.' using errcode = 'KT001';
    end if;
    perform private.valid_kg(r.kg_kirim, 'Berat kirim');
    if r.kg_kirim > a.kg_pesan then
      raise exception 'Berat kirim % (% kg) lebih dari yang dipesan (% kg). Kalau emang mau kirim lebih, ubah dulu pesanannya.',
        a.unit_kode || ' ' || a.product_nama || coalesce(' ' || a.grade_kode, ''), trim_scale(r.kg_kirim)::text, trim_scale(a.kg_pesan)::text
        using errcode = 'KT001';
    end if;
    if r.kg_diterima is not null then
      perform private.valid_kg(r.kg_diterima, 'Berat diterima pembeli');
      if r.kg_diterima > r.kg_kirim then
        raise exception 'Berat diterima pembeli tidak boleh lebih dari berat kirim.' using errcode = 'KT001';
      end if;
    end if;

    -- Baca ulang unit (bisa udah berkurang oleh baris sebelumnya di pesanan yang sama).
    select * into u from public.storage_units where id = a.unit_id;
    lain := private.kg_dipesan(u.id, o.id);
    bisa := greatest(u.sisa_kg - lain, 0);
    if u.status <> 'aktif' or r.kg_kirim > bisa then
      raise exception 'Stok % tinggal % kg%, jadi yang bisa dikirim maksimal % kg.',
        u.kode, trim_scale(u.sisa_kg)::text,
        case when lain > 0 then format(', %s kg di antaranya udah dipesan %s', trim_scale(lain), private.pesanan_pemegang(u.id, o.id)) else '' end,
        trim_scale(bisa)::text
        using errcode = 'KT001';
    end if;

    porsi := case when r.kg_kirim = u.sisa_kg then u.sisa_dasar_masuk else round(u.sisa_dasar_masuk * r.kg_kirim / u.sisa_kg, 3) end;
    update public.storage_units
    set sisa_kg = sisa_kg - r.kg_kirim, sisa_dasar_masuk = sisa_dasar_masuk - porsi, status = case when sisa_kg - r.kg_kirim = 0 then 'habis' else 'aktif' end
    where id = u.id;
    insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan) values (u.id, 'keluar', r.kg_kirim, porsi, 'Penjualan ' || o.kode);
    update public.sale_allocations set kg_kirim = r.kg_kirim, kg_diterima = r.kg_diterima where id = a.id;
  end loop;

  update public.sales_orders set status = 'terkirim', dikirim_pada = now(), dikirim_oleh = (select auth.uid()) where id = o.id;
end;
$$;

-- ============================================================ 2. ambil stok
create or replace function public.ambil_stok(p_unit uuid, p_kg numeric, p_alasan text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u public.storage_units;
  porsi numeric(12,3);
  id_gerak uuid;
  id_tagih uuid;
  simpan public.tariff_rules;
  transit public.tariff_rules;
  dasar numeric;
  biaya jsonb;
  sekarang timestamptz := now();
  dipesan numeric(12,3) := 0;
begin
  select * into u from public.storage_units where id = p_unit for update;
  if not found then
    raise exception 'Unit stok tidak ditemukan.' using errcode = 'KT001';
  end if;
  perform private.wajib_izin(case when u.buyer_id is null then 'stok.write' else 'gudang.write' end);
  perform private.valid_kg(p_kg, 'Berat keluar');
  if u.status <> 'aktif' then
    raise exception 'Unit % sudah habis.', u.kode using errcode = 'KT001';
  end if;
  if p_kg > u.sisa_kg then
    raise exception 'Unit % hanya tersisa % kg.', u.kode, u.sisa_kg::text using errcode = 'KT001';
  end if;
  -- Stok sendiri yang udah dipesan nggak boleh diambil di luar pengiriman pesanannya.
  if u.buyer_id is null then
    dipesan := private.kg_dipesan(u.id);
    if p_kg > u.sisa_kg - dipesan then
      raise exception 'Unit % tinggal % kg, % kg di antaranya udah dipesan %. Yang bisa diambil maksimal % kg.',
        u.kode, trim_scale(u.sisa_kg)::text, trim_scale(dipesan)::text, private.pesanan_pemegang(u.id), trim_scale(greatest(u.sisa_kg - dipesan, 0))::text
        using errcode = 'KT001';
    end if;
  end if;

  porsi := case when p_kg = u.sisa_kg then u.sisa_dasar_masuk else round(u.sisa_dasar_masuk * p_kg / u.sisa_kg, 3) end;
  update public.storage_units
  set sisa_kg = sisa_kg - p_kg, sisa_dasar_masuk = sisa_dasar_masuk - porsi,
      status = case when sisa_kg - p_kg = 0 then 'habis' else 'aktif' end
  where id = u.id;
  insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan, waktu)
  values (u.id, 'keluar', p_kg, porsi, coalesce(p_alasan, ''), sekarang)
  returning id into id_gerak;

  if u.buyer_id is not null then
    simpan := private.aturan_tarif('simpan', (u.masuk_pada at time zone 'Asia/Jakarta')::date);
    transit := private.aturan_tarif('transit', (u.masuk_pada at time zone 'Asia/Jakarta')::date);
    dasar := case when simpan.dasar_berat = 'masuk' then porsi else p_kg end;
    biaya := public.hitung_biaya_simpan(dasar, u.masuk_pada, sekarang, simpan.tarif_per_kg, transit.tarif_per_kg, simpan.masa_transit_jam, simpan.minimum_hari);
    insert into public.service_charges (unit_id, movement_id, buyer_id, pemilik_nama, jenis, kg_dasar, tarif_per_kg, hari_ditagih, jumlah, rincian, masuk_pada, keluar_pada)
    values (
      u.id, id_gerak, u.buyer_id, u.pemilik_nama,
      case when (biaya ->> 'transit')::boolean then 'transit' else 'simpan' end,
      dasar, (biaya ->> 'tarif_per_kg')::numeric, (biaya ->> 'hari_ditagih')::int, (biaya ->> 'jumlah')::numeric,
      biaya || jsonb_build_object('dasar_berat', simpan.dasar_berat, 'kg_timbang_keluar', p_kg, 'dikonfirmasi', simpan.dikonfirmasi),
      u.masuk_pada, sekarang
    ) returning id into id_tagih;
  end if;
  return jsonb_build_object('movement_id', id_gerak, 'charge_id', id_tagih, 'jumlah', (biaya ->> 'jumlah')::numeric);
end;
$$;

-- ============================================================ 3. koreksi timbangan vs reservasi
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
  dipesan numeric(12,3);
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
  -- Yang udah dipesan pesanan draf juga jadi batas bawah, biar jatah pesanan nggak ilang diam-diam.
  dipesan := private.kg_dipesan(u.id);
  if selisih < 0 and u.sisa_kg + selisih < dipesan then
    raise exception 'Hasil % (%) udah dipesan % kg di %. Kurangin atau batalin pesanannya dulu, baru timbangannya bisa diturunin.',
      p.kode, u.product_nama || coalesce(' ' || u.grade_kode, ''), trim_scale(dipesan)::text, private.pesanan_pemegang(u.id) using errcode = 'KT001';
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

do $$
declare
  f text;
begin
  foreach f in array array['private.kg_dipesan(uuid, uuid)', 'private.pesanan_pemegang(uuid, uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end;
$$;
