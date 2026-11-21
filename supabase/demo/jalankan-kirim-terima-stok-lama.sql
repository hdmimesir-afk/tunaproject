-- Jalanin sekali di Supabase SQL Editor (produksi), SEBELUM push. Isinya sama persis dengan tiga migrasi:
--   20261122000300_kirim_reservasi: Kirim nggak boleh lebih dari pesanan dan nggak boleh makan jatah pesanan lain
--   20261122000400_terima_kapal_idempoten: Penerimaan anti dobel, asal kapal dan jenis ikan
--   20261122000500_tutup_jalur_stok_lama: Tutup jalur input stok manual lama
-- Semuanya dalam satu transaksi: kalau ada yg gagal, nggak ada yg berubah. Data lama nggak diubah.

begin;

-- =====================================================================
-- 20261122000300_kirim_reservasi
-- =====================================================================
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

-- =====================================================================
-- 20261122000400_terima_kapal_idempoten
-- =====================================================================
-- 22 Nov 2026: penerimaan ikan anti dobel, plus asal kapal dan jenis ikan.
--   1. Anti dobel (idempotency): tiap kali form Terima ikan dibuka, aplikasi bikin satu kunci permintaan (uuid).
--      Permintaan dengan kunci yang sama (klik dua kali, retry abis timeout, kirim ulang) cuma bikin SATU lot; permintaan
--      berikutnya balikin lot yang sama tanpa ngubah apa-apa. Dua penerimaan beneran dengan data persis sama tetap boleh,
--      karena kuncinya beda. Kunci dikunci pakai advisory lock per transaksi, jadi dua permintaan barengan nggak bisa
--      lolos dua-duanya; indeks unik jadi pengaman terakhir.
--   2. Asal kapal (lots.kapal) dan jenis ikan (lots.jenis_ikan) per lot. Cara catat per ekor udah punya jenis per ekor
--      (lot_ekor.spesies), jadi jenis_ikan lot dikosongin di cara itu (jenisnya dibaca dari ekornya, nggak didobel).
--      Satu lot per ekor boleh campur jenis. Berat total: satu jenis per lot.
--   3. Kapal dan jenis bisa dibenerin lewat Koreksi lot (parameter baru, kosong = nggak diubah).
-- Data lama aman: kolom baru boleh kosong, kunci permintaan lama kosong. Proyek, grade, dan stok nggak berubah.

alter table public.lots add column kapal text not null default '' check (length(kapal) <= 80);
alter table public.lots add column jenis_ikan text not null default '' check (length(jenis_ikan) <= 40);
alter table public.lots add column kunci_permintaan uuid;
create unique index lots_kunci_permintaan_key on public.lots (kunci_permintaan) where kunci_permintaan is not null;

-- ============================================================ terima ikan lengkap
drop function public.terima_ikan_lengkap(uuid, date, uuid, text, text, numeric, int, jsonb, jsonb);
create function public.terima_ikan_lengkap(
  p_supplier uuid, p_tanggal date default current_date, p_cycle uuid default null, p_catatan text default '',
  p_proyek_baru text default null, p_kg numeric default null, p_jumlah_ekor int default null,
  p_ekor jsonb default null, p_grade jsonb default null,
  p_kapal text default '', p_jenis text default '', p_kunci uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_lot uuid;
  per_ekor boolean := p_ekor is not null and jsonb_typeof(p_ekor) = 'array' and jsonb_array_length(p_ekor) > 0;
  tot numeric;
  ada_grade int;
  n int;
  v_kapal text := trim(coalesce(p_kapal, ''));
  v_jenis text := trim(coalesce(p_jenis, ''));
begin
  perform private.wajib_izin('penerimaan.write');
  -- Permintaan yang sama (kunci sama) cuma diproses sekali. Yang kedua nunggu yang pertama selesai, terus dapet lot yang sama.
  if p_kunci is not null then
    perform pg_advisory_xact_lock(hashtextextended('terima_ikan:' || p_kunci::text, 0));
    select id into id_lot from public.lots where kunci_permintaan = p_kunci;
    if found then
      return id_lot;
    end if;
  end if;
  if length(v_kapal) > 80 then
    raise exception 'Nama kapal kepanjangan, maksimal 80 huruf.' using errcode = 'KT001';
  end if;
  if length(v_jenis) > 40 then
    raise exception 'Jenis ikan kepanjangan, maksimal 40 huruf.' using errcode = 'KT001';
  end if;

  if per_ekor then
    select coalesce(sum((x ->> 'kg')::numeric), 0), count(*) filter (where nullif(x ->> 'grade_id', '') is not null), count(*)
    into tot, ada_grade, n from jsonb_array_elements(p_ekor) x;
    id_lot := public.terima_ikan(p_supplier, round(tot, 3), p_tanggal, p_cycle, p_catatan, p_proyek_baru);
    perform private.isi_ekor(id_lot, p_ekor);
    perform private.sinkron_ekor_lot(id_lot);
    if ada_grade > 0 then
      if ada_grade < n then
        raise exception 'Grade-nya baru diisi di % dari % ekor. Isi semua, atau kosongin semua biar digrading belakangan.', ada_grade, n using errcode = 'KT001';
      end if;
      perform public.cek_mutu_grade(id_lot, 'lulus', '[]'::jsonb, '');
    end if;
    -- Per ekor: jenisnya ada di tiap ekor, jadi jenis lot nggak diisi (biar nggak dobel).
    v_jenis := '';
  else
    id_lot := public.terima_ikan(p_supplier, p_kg, p_tanggal, p_cycle, p_catatan, p_proyek_baru);
    if p_jumlah_ekor is not null then
      if p_jumlah_ekor <= 0 or p_jumlah_ekor > 100000 then
        raise exception 'Jumlah ekornya nggak masuk akal.' using errcode = 'KT001';
      end if;
      update public.lots set jumlah_ekor = p_jumlah_ekor where id = id_lot;
    end if;
    if p_grade is not null and jsonb_typeof(p_grade) = 'array' and jsonb_array_length(p_grade) > 0 then
      perform public.cek_mutu_grade(id_lot, 'lulus', p_grade, '');
    end if;
  end if;
  update public.lots set kapal = v_kapal, jenis_ikan = v_jenis, kunci_permintaan = p_kunci where id = id_lot;
  return id_lot;
end;
$$;

-- ============================================================ koreksi lot (plus kapal dan jenis)
drop function public.koreksi_lot(uuid, numeric, date, uuid, uuid, text, text);
create function public.koreksi_lot(
  p_lot uuid, p_kg numeric, p_tanggal date, p_supplier uuid, p_cycle uuid, p_catatan text, p_alasan text,
  p_kapal text default null, p_jenis text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lots;
  baru public.lots;
  terpakai numeric(12,3);
  digrade numeric(12,3);
begin
  perform private.wajib_izin('penerimaan.write');
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
  end if;
  perform private.valid_kg(p_kg, 'Berat lot');
  terpakai := l.kg - l.sisa_kg;
  if p_kg < terpakai then
    raise exception 'Lot % udah dipakai produksi % kg, jadi beratnya nggak boleh kurang dari itu.', l.kode, trim_scale(terpakai)::text using errcode = 'KT001';
  end if;
  select coalesce(sum(kg), 0) into digrade from public.lot_grades where lot_id = l.id and l.qc = 'lulus';
  if p_kg < digrade then
    raise exception 'Hasil grading lot % totalnya % kg. Koreksi grading-nya dulu kalau beratnya mau dikurangi.', l.kode, trim_scale(digrade)::text using errcode = 'KT001';
  end if;
  if p_supplier is distinct from l.supplier_id then
    if l.po_id is not null then
      raise exception 'Lot % udah masuk pembelian. Ganti pemasoknya lewat koreksi pembelian.', l.kode using errcode = 'KT001';
    end if;
    if not exists (select 1 from public.suppliers s where s.id = p_supplier and s.aktif) then
      raise exception 'Pilih pemasok atau nelayannya.' using errcode = 'KT001';
    end if;
  end if;
  if p_cycle is distinct from l.cycle_id and p_cycle is not null
     and not exists (select 1 from public.cycles c where c.id = p_cycle and c.status = 'terbuka') then
    raise exception 'Proyeknya nggak ketemu atau udah ditutup.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_kapal, ''))) > 80 or length(trim(coalesce(p_jenis, ''))) > 40 then
    raise exception 'Nama kapal maksimal 80 huruf, jenis ikan maksimal 40 huruf.' using errcode = 'KT001';
  end if;

  update public.lots
  set kg = round(p_kg, 3), sisa_kg = round(p_kg, 3) - terpakai,
      tanggal_terima = coalesce(p_tanggal, tanggal_terima), supplier_id = p_supplier, cycle_id = p_cycle,
      catatan = coalesce(p_catatan, ''),
      kapal = coalesce(trim(p_kapal), kapal),
      jenis_ikan = coalesce(trim(p_jenis), jenis_ikan)
  where id = l.id
  returning * into baru;

  perform private.catat_koreksi('lots', l.id, l.kode, p_alasan,
    jsonb_build_object('kg', l.kg, 'tanggal', l.tanggal_terima, 'supplier_id', l.supplier_id, 'cycle_id', l.cycle_id, 'catatan', l.catatan, 'kapal', l.kapal, 'jenis_ikan', l.jenis_ikan),
    jsonb_build_object('kg', baru.kg, 'tanggal', baru.tanggal_terima, 'supplier_id', baru.supplier_id, 'cycle_id', baru.cycle_id, 'catatan', baru.catatan, 'kapal', baru.kapal, 'jenis_ikan', baru.jenis_ikan));
  if private.po_per_grade(l.po_id) then
    perform private.hitung_ulang_po(l.po_id, null, 'Koreksi lot ' || l.kode || ': ' || trim(p_alasan));
  end if;
end;
$$;

do $$
begin
  execute 'revoke all on function public.terima_ikan_lengkap(uuid, date, uuid, text, text, numeric, int, jsonb, jsonb, text, text, uuid) from public, anon';
  execute 'grant execute on function public.terima_ikan_lengkap(uuid, date, uuid, text, text, numeric, int, jsonb, jsonb, text, text, uuid) to authenticated';
  execute 'revoke all on function public.koreksi_lot(uuid, numeric, date, uuid, uuid, text, text, text, text) from public, anon';
  execute 'grant execute on function public.koreksi_lot(uuid, numeric, date, uuid, uuid, text, text, text, text) to authenticated';
end;
$$;

-- =====================================================================
-- 20261122000500_tutup_jalur_stok_lama
-- =====================================================================
-- 22 Nov 2026: tutup jalur input stok manual lama.
-- Sejak 21 Nov stok hasil produksi masuk sendiri dari produksi yg disetujui Owner (private.atur_unit_otomatis), dan koreksi
-- stok lewat Koreksi produksi. Dua fungsi lama di bawah udah nggak dipanggil dari aplikasi, tapi masih bisa dipanggil
-- langsung lewat API. Kalau dipakai, bisa bikin unit stok dobel atau sisa stok beda sama produksinya.
--   masukkan_hasil_produksi  : DITUTUP (hak eksekusi pengguna dicabut). Unit lama yg dibikin dari sini tetap ada dan tetap jalan.
--   ajukan_koreksi_stok      : DITUTUP. Pengajuan lama yg masih nunggu tetap ada di Stok.
--   putuskan_koreksi_stok    : TETAP. Owner masih perlu mutusin pengajuan lama yg masih nunggu.
-- Nggak ada fungsi atau data yang dihapus. Kalau perlu dibuka lagi: grant execute ... to authenticated.

do $$
begin
  execute 'revoke execute on function public.masukkan_hasil_produksi(uuid, uuid, uuid, text, numeric, text, boolean, text, uuid) from public, anon, authenticated';
  execute 'revoke execute on function public.ajukan_koreksi_stok(uuid, numeric, text) from public, anon, authenticated';
end;
$$;

comment on function public.masukkan_hasil_produksi(uuid, uuid, uuid, text, numeric, text, boolean, text, uuid) is
  'DITUTUP 22 Nov 2026. Stok hasil produksi masuk otomatis dari produksi yg disetujui Owner. Disimpan buat riwayat.';
comment on function public.ajukan_koreksi_stok(uuid, numeric, text) is
  'DITUTUP 22 Nov 2026. Koreksi stok lewat Koreksi produksi. Pengajuan lama tetap bisa diputuskan lewat putuskan_koreksi_stok.';

-- Catat migrasinya biar Supabase tahu udah jalan.
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261122000300', 'kirim_reservasi'),
  ('20261122000400', 'terima_kapal_idempoten'),
  ('20261122000500', 'tutup_jalur_stok_lama')
on conflict do nothing;

commit;

-- Cek abis jalan (cuma baca): harus keluar 3 baris migrasi, dan jumlah pengajuan koreksi stok lama yg masih nunggu Owner.
select version, name from supabase_migrations.schema_migrations where version in ('20261122000300', '20261122000400', '20261122000500') order by version;
select count(*) as koreksi_stok_lama_masih_nunggu from public.storage_movements where jenis = 'koreksi' and status = 'diajukan';
