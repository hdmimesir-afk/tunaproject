-- Fase 4 Â· Fungsi alur stok, titipan gudang dingin, mesin tarif, koreksi stok, dan jadwal ABF.
-- Galat aturan bisnis memakai SQLSTATE KT001; izin ditolak memakai 42501.

-- ------------------------------------------------------- mesin tarif
-- Murni: input yang sama selalu menghasilkan tagihan yang sama. Rumus yang sama ada di lib/logic/tarif.ts (diuji dengan kasus yang sama).
--   lama <= masa transit  -> tarif transit x berat
--   selain itu            -> hari = lama dibulatkan ke atas per 24 jam; sampai 1 hari ditagih 1 hari,
--                            lebih dari itu ditagih paling sedikit minimum hari; tarif x berat x hari ditagih
create or replace function public.hitung_biaya_simpan(
  p_kg numeric, p_masuk timestamptz, p_keluar timestamptz,
  p_tarif numeric, p_tarif_transit numeric, p_masa_transit_jam int, p_minimum_hari int
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  detik bigint;
  hari_bulat int;
  hari_tagih int;
  transit boolean;
  jumlah numeric(16,2);
begin
  if p_keluar < p_masuk then
    raise exception 'Waktu keluar lebih awal dari waktu masuk.' using errcode = 'KT001';
  end if;
  detik := ceil(extract(epoch from (p_keluar - p_masuk)))::bigint;
  transit := detik <= p_masa_transit_jam::bigint * 3600;
  if transit then
    hari_bulat := 0;
    hari_tagih := 0;
    jumlah := round(p_kg * p_tarif_transit, 2);
  else
    hari_bulat := ceil(detik::numeric / 86400)::int;
    hari_tagih := case when hari_bulat <= 1 then 1 else greatest(hari_bulat, p_minimum_hari) end;
    jumlah := round(p_kg * p_tarif * hari_tagih, 2);
  end if;
  return jsonb_build_object(
    'transit', transit, 'detik', detik, 'hari_bulat', hari_bulat, 'hari_ditagih', hari_tagih,
    'minimum_hari', p_minimum_hari, 'masa_transit_jam', p_masa_transit_jam,
    'tarif_per_kg', case when transit then p_tarif_transit else p_tarif end,
    'kg_dasar', p_kg, 'jumlah', jumlah
  );
end;
$$;

create or replace function private.aturan_tarif(p_jenis text, p_tanggal date)
returns public.tariff_rules
language plpgsql
stable
set search_path = ''
as $$
declare
  r public.tariff_rules;
begin
  -- Tarif yang berlaku pada tanggal itu (yang terbaru dengan berlaku_dari <= tanggal). Bila ikan masuk sebelum tarif pertama
  -- dicatat, dipakai tarif paling awal, supaya data lama tetap bisa ditagih.
  select * into r from public.tariff_rules
  where jenis = p_jenis
  order by (berlaku_dari <= p_tanggal) desc,
           case when berlaku_dari <= p_tanggal then berlaku_dari end desc nulls last,
           berlaku_dari asc
  limit 1;
  if not found then
    raise exception 'Tarif % belum diatur.', p_jenis using errcode = 'KT001';
  end if;
  return r;
end;
$$;

create or replace function private.valid_kg(p_kg numeric, p_apa text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_kg is null or p_kg <= 0 or round(p_kg, 3) <> p_kg then
    raise exception '% harus lebih dari nol dengan paling banyak tiga desimal.', p_apa using errcode = 'KT001';
  end if;
end;
$$;

-- ------------------------------------------- hasil produksi masuk stok
create or replace function public.masukkan_hasil_produksi(
  p_production uuid, p_product uuid, p_grade uuid, p_kondisi text, p_kg numeric,
  p_lokasi text default '', p_langsung_kirim boolean default false, p_catatan text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pr public.productions;
  prod public.products;
  gr public.grades;
  kode_grade text;
  sudah numeric;
  batas numeric;
  id_unit uuid;
begin
  perform private.wajib_izin('stok.write');
  perform private.valid_kg(p_kg, 'Berat hasil');
  select * into pr from public.productions where id = p_production for update;
  if not found then
    raise exception 'Produksi tidak ditemukan.' using errcode = 'KT001';
  end if;
  if pr.status <> 'diperiksa' then
    raise exception 'Hasil produksi % baru bisa masuk stok setelah diperiksa dan disetujui Owner.', pr.kode using errcode = 'KT001';
  end if;
  if p_kondisi not in ('fresh', 'beku') then
    raise exception 'Kondisi harus fresh atau beku.' using errcode = 'KT001';
  end if;
  if p_langsung_kirim and p_kondisi <> 'fresh' then
    raise exception 'Hanya ikan fresh yang boleh langsung dikirim tanpa masuk gudang.' using errcode = 'KT001';
  end if;
  select * into prod from public.products where id = p_product and aktif;
  if not found then
    raise exception 'Pilih produk.' using errcode = 'KT001';
  end if;
  if p_grade is not null then
    select * into gr from public.grades where id = p_grade and aktif;
    if not found then
      raise exception 'Grade tidak dikenal.' using errcode = 'KT001';
    end if;
    kode_grade := gr.kode;
  end if;

  select coalesce(sum(kg_masuk), 0) into sudah from public.storage_units where production_id = pr.id;
  select n.loin_kg + n.samping_kg into batas from public.v_neraca_produksi n where n.production_id = pr.id;
  if sudah + p_kg > batas then
    raise exception 'Melebihi hasil produksi %: sudah masuk stok % kg dari % kg.', pr.kode, sudah::text, batas::text using errcode = 'KT001';
  end if;

  insert into public.storage_units (
    product_id, product_nama, grade_id, grade_kode, kondisi, lokasi, production_id, production_kode,
    kg_masuk, sisa_kg, sisa_dasar_masuk, langsung_kirim, status, catatan
  ) values (
    prod.id, prod.nama, p_grade, kode_grade, p_kondisi, coalesce(p_lokasi, ''), pr.id, pr.kode,
    p_kg, case when p_langsung_kirim then 0 else p_kg end, case when p_langsung_kirim then 0 else p_kg end,
    p_langsung_kirim, case when p_langsung_kirim then 'habis' else 'aktif' end, coalesce(p_catatan, '')
  ) returning id into id_unit;

  insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan)
  values (id_unit, 'masuk', p_kg, p_kg, 'Hasil produksi ' || pr.kode);
  if p_langsung_kirim then
    insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan)
    values (id_unit, 'keluar', p_kg, p_kg, 'Fresh langsung kirim, tidak masuk gudang');
  end if;
  return id_unit;
end;
$$;

-- ------------------------------------------------------ titipan masuk
create or replace function public.terima_titipan(
  p_buyer uuid, p_product uuid, p_grade uuid, p_kondisi text, p_kg numeric,
  p_lokasi text default '', p_perlu_abf boolean default false, p_catatan text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.buyers;
  prod public.products;
  gr public.grades;
  kode_grade text;
  isi numeric;
  kap numeric;
  id_unit uuid;
  abf public.tariff_rules;
begin
  perform private.wajib_izin('gudang.write');
  perform private.valid_kg(p_kg, 'Berat titipan');
  select * into b from public.buyers where id = p_buyer and aktif;
  if not found then
    raise exception 'Pilih pelanggan pemilik titipan.' using errcode = 'KT001';
  end if;
  if p_kondisi not in ('fresh', 'beku') then
    raise exception 'Kondisi harus fresh atau beku.' using errcode = 'KT001';
  end if;
  if p_perlu_abf and p_kondisi <> 'fresh' then
    raise exception 'ABF hanya untuk ikan fresh yang dibekukan.' using errcode = 'KT001';
  end if;
  select * into prod from public.products where id = p_product and aktif;
  if not found then
    raise exception 'Pilih produk.' using errcode = 'KT001';
  end if;
  if p_grade is not null then
    select * into gr from public.grades where id = p_grade and aktif;
    if not found then
      raise exception 'Grade tidak dikenal.' using errcode = 'KT001';
    end if;
    kode_grade := gr.kode;
  end if;

  -- Kunci kapasitas supaya dua penerimaan bersamaan tidak sama-sama lolos.
  perform pg_advisory_xact_lock(hashtext('kapasitas_gudang'));
  select coalesce(sum(sisa_kg), 0) into isi from public.storage_units where status = 'aktif';
  select coalesce((nilai #>> '{}')::numeric, 17500) into kap from public.settings where kunci = 'kapasitas_gudang_kg';
  if isi + p_kg > coalesce(kap, 17500) then
    raise exception 'Kapasitas gudang % kg tidak cukup: terisi % kg, titipan baru % kg.', coalesce(kap, 17500)::text, isi::text, p_kg::text using errcode = 'KT001';
  end if;

  insert into public.storage_units (
    buyer_id, pemilik_nama, product_id, product_nama, grade_id, grade_kode, kondisi, lokasi,
    kg_masuk, sisa_kg, sisa_dasar_masuk, perlu_abf, catatan
  ) values (
    b.id, b.nama, prod.id, prod.nama, p_grade, kode_grade, p_kondisi, coalesce(p_lokasi, ''),
    p_kg, p_kg, p_kg, coalesce(p_perlu_abf, false), coalesce(p_catatan, '')
  ) returning id into id_unit;

  insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan)
  values (id_unit, 'masuk', p_kg, p_kg, 'Titipan ' || b.nama);

  if coalesce(p_perlu_abf, false) then
    abf := private.aturan_tarif('abf', current_date);
    insert into public.service_charges (unit_id, buyer_id, pemilik_nama, jenis, kg_dasar, tarif_per_kg, jumlah, rincian, masuk_pada)
    values (
      id_unit, b.id, b.nama, 'abf', p_kg, abf.tarif_per_kg, round(p_kg * abf.tarif_per_kg, 2),
      jsonb_build_object('kg_dasar', p_kg, 'tarif_per_kg', abf.tarif_per_kg, 'dikonfirmasi', abf.dikonfirmasi), now()
    );
  end if;
  return id_unit;
end;
$$;

-- --------------------------------------------------------- ambil stok
-- Keluar sebagian atau penuh; p_kg adalah berat hasil timbang ulang saat keluar.
-- Titipan: tagihan simpan dihitung saat keluar dari tariff_rules yang berlaku di hari ikan masuk.
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

-- ---------------------------------------------------------- koreksi
-- Koreksi (mis. selisih timbang ulang) baru berlaku setelah disetujui Owner.
create or replace function public.ajukan_koreksi_stok(p_unit uuid, p_selisih_kg numeric, p_alasan text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  u public.storage_units;
  id_gerak uuid;
begin
  perform private.wajib_izin('stok.write');
  select * into u from public.storage_units where id = p_unit;
  if not found then
    raise exception 'Unit stok tidak ditemukan.' using errcode = 'KT001';
  end if;
  if p_selisih_kg is null or p_selisih_kg = 0 or round(p_selisih_kg, 3) <> p_selisih_kg then
    raise exception 'Isi selisih berat (boleh minus) dengan paling banyak tiga desimal.' using errcode = 'KT001';
  end if;
  if u.sisa_kg + p_selisih_kg < 0 then
    raise exception 'Koreksi membuat sisa unit % negatif.', u.kode using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan koreksi.' using errcode = 'KT001';
  end if;
  insert into public.storage_movements (unit_id, jenis, kg, alasan, status)
  values (u.id, 'koreksi', p_selisih_kg, trim(p_alasan), 'diajukan')
  returning id into id_gerak;
  return id_gerak;
end;
$$;

create or replace function public.putuskan_koreksi_stok(p_movement uuid, p_setuju boolean, p_catatan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.storage_movements;
  u public.storage_units;
  baru numeric(12,3);
begin
  perform private.wajib_izin('stok.setuju');
  select * into m from public.storage_movements where id = p_movement for update;
  if not found or m.jenis <> 'koreksi' then
    raise exception 'Koreksi tidak ditemukan.' using errcode = 'KT001';
  end if;
  if m.status <> 'diajukan' then
    raise exception 'Koreksi ini sudah diputuskan.' using errcode = 'KT001';
  end if;
  if not coalesce(p_setuju, false) then
    if length(trim(coalesce(p_catatan, ''))) = 0 then
      raise exception 'Tulis alasan menolak koreksi.' using errcode = 'KT001';
    end if;
    update public.storage_movements
    set status = 'ditolak', diputuskan_oleh = (select auth.uid()), diputuskan_pada = now(), catatan_putusan = trim(p_catatan)
    where id = m.id;
    return;
  end if;
  select * into u from public.storage_units where id = m.unit_id for update;
  baru := u.sisa_kg + m.kg;
  if baru < 0 then
    raise exception 'Koreksi membuat sisa unit % negatif; berat sudah berubah sejak diajukan.', u.kode using errcode = 'KT001';
  end if;
  update public.storage_units
  set sisa_kg = baru,
      sisa_dasar_masuk = case when u.sisa_kg > 0 then round(u.sisa_dasar_masuk * baru / u.sisa_kg, 3) else baru end,
      status = case when baru = 0 then 'habis' else 'aktif' end
  where id = u.id;
  update public.storage_movements
  set status = 'disetujui', diputuskan_oleh = (select auth.uid()), diputuskan_pada = now(), catatan_putusan = coalesce(p_catatan, '')
  where id = m.id;
end;
$$;

-- ------------------------------------------------------------ tarif
-- Tarif baru = baris baru dengan tanggal berlaku; tagihan lama tetap memakai tarif saat ikan masuk.
create or replace function public.ubah_tarif(
  p_jenis text, p_tarif numeric, p_minimum_hari int, p_masa_transit_jam int, p_dasar_berat text,
  p_berlaku_dari date, p_dikonfirmasi boolean, p_catatan text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_aturan uuid;
begin
  perform private.wajib_izin('pengaturan.write');
  if p_jenis not in ('simpan', 'abf', 'transit') then
    raise exception 'Jenis tarif tidak dikenal.' using errcode = 'KT001';
  end if;
  if p_tarif is null or p_tarif < 0 or round(p_tarif, 2) <> p_tarif then
    raise exception 'Tarif tidak boleh negatif dan paling banyak dua desimal.' using errcode = 'KT001';
  end if;
  if p_minimum_hari is null or p_minimum_hari < 1 or p_masa_transit_jam is null or p_masa_transit_jam < 0 then
    raise exception 'Minimum hari dan masa transit tidak valid.' using errcode = 'KT001';
  end if;
  if p_dasar_berat not in ('masuk', 'keluar') then
    raise exception 'Dasar berat harus masuk atau keluar.' using errcode = 'KT001';
  end if;
  insert into public.tariff_rules (jenis, tarif_per_kg, minimum_hari, masa_transit_jam, dasar_berat, berlaku_dari, dikonfirmasi, catatan)
  values (p_jenis, p_tarif, p_minimum_hari, p_masa_transit_jam, p_dasar_berat, coalesce(p_berlaku_dari, current_date), coalesce(p_dikonfirmasi, false), coalesce(p_catatan, ''))
  on conflict (jenis, berlaku_dari) do update
    set tarif_per_kg = excluded.tarif_per_kg, minimum_hari = excluded.minimum_hari, masa_transit_jam = excluded.masa_transit_jam,
        dasar_berat = excluded.dasar_berat, dikonfirmasi = excluded.dikonfirmasi, catatan = excluded.catatan
  returning id into id_aturan;
  return id_aturan;
end;
$$;

-- ----------------------------------------------------------- jadwal
create or replace function public.cari_bentrok(p_mulai timestamptz, p_selesai timestamptz, p_kecuali uuid default null)
returns table (id uuid, label text, mulai timestamptz, selesai timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.wajib_izin('gudang.read');
  return query
  select b.id, b.label, b.mulai, b.selesai
  from public.bookings b
  where b.status = 'aktif' and b.mulai < p_selesai and b.selesai > p_mulai and (p_kecuali is null or b.id <> p_kecuali)
  order by b.mulai;
end;
$$;

-- Jam kosong pertama (sepanjang durasi) pada atau setelah p_dari. Mesin tunggal: lompat ke akhir jadwal yang bentrok.
create or replace function public.slot_kosong(p_durasi_menit int, p_dari timestamptz, p_kecuali uuid default null)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t timestamptz := p_dari;
  akhir timestamptz;
  putaran int := 0;
begin
  perform private.wajib_izin('gudang.read');
  if p_durasi_menit is null or p_durasi_menit <= 0 then
    raise exception 'Durasi harus lebih dari nol.' using errcode = 'KT001';
  end if;
  loop
    select max(b.selesai) into akhir
    from public.bookings b
    where b.status = 'aktif' and b.mulai < t + make_interval(mins => p_durasi_menit) and b.selesai > t
      and (p_kecuali is null or b.id <> p_kecuali);
    exit when akhir is null;
    t := akhir;
    putaran := putaran + 1;
    if putaran > 1000 then
      raise exception 'Tidak menemukan jam kosong.' using errcode = 'KT001';
    end if;
  end loop;
  return t;
end;
$$;

create or replace function private.cek_bentrok(p_mulai timestamptz, p_selesai timestamptz, p_kecuali uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings
  where status = 'aktif' and mulai < p_selesai and selesai > p_mulai and (p_kecuali is null or id <> p_kecuali)
  order by mulai limit 1;
  if found then
    raise exception 'Bentrok dengan "%" (% - %). Pilih jam lain atau pakai jam kosong pertama.',
      b.label,
      to_char(b.mulai at time zone 'Asia/Jakarta', 'DD Mon HH24:MI'),
      to_char(b.selesai at time zone 'Asia/Jakarta', 'DD Mon HH24:MI') using errcode = 'KT001';
  end if;
end;
$$;

create or replace function public.buat_booking(
  p_jenis text, p_partner uuid, p_label text, p_mulai timestamptz, p_selesai timestamptz, p_kg numeric default null, p_catatan text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_b uuid;
begin
  perform private.wajib_izin('gudang.write');
  if p_jenis not in ('produksi', 'abf') then
    raise exception 'Jenis jadwal harus produksi atau ABF.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_label, ''))) = 0 then
    raise exception 'Isi keterangan jadwal.' using errcode = 'KT001';
  end if;
  if p_mulai is null or p_selesai is null or p_selesai <= p_mulai then
    raise exception 'Jam selesai harus setelah jam mulai.' using errcode = 'KT001';
  end if;
  if p_partner is not null and not exists (select 1 from public.partners where id = p_partner and aktif) then
    raise exception 'Mitra tidak dikenal.' using errcode = 'KT001';
  end if;
  perform pg_advisory_xact_lock(hashtext('jadwal_mesin'));
  perform private.cek_bentrok(p_mulai, p_selesai, null);
  insert into public.bookings (jenis, partner_id, label, mulai, selesai, kg, catatan)
  values (p_jenis, p_partner, trim(p_label), p_mulai, p_selesai, p_kg, coalesce(p_catatan, ''))
  returning id into id_b;
  return id_b;
end;
$$;

-- Pindah jadwal (durasi tetap). Tanpa p_mulai: pindah ke jam kosong pertama setelah jam mulai sekarang.
create or replace function public.pindah_booking(p_id uuid, p_mulai timestamptz default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  durasi interval;
  baru timestamptz;
begin
  perform private.wajib_izin('gudang.write');
  perform pg_advisory_xact_lock(hashtext('jadwal_mesin'));
  select * into b from public.bookings where id = p_id for update;
  if not found or b.status <> 'aktif' then
    raise exception 'Jadwal tidak ditemukan atau sudah dibatalkan.' using errcode = 'KT001';
  end if;
  durasi := b.selesai - b.mulai;
  baru := coalesce(p_mulai, public.slot_kosong((extract(epoch from durasi) / 60)::int, b.mulai, b.id));
  perform private.cek_bentrok(baru, baru + durasi, b.id);
  update public.bookings set mulai = baru, selesai = baru + durasi where id = b.id;
  return baru;
end;
$$;

create or replace function public.batalkan_booking(p_id uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.wajib_izin('gudang.write');
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan membatalkan jadwal.' using errcode = 'KT001';
  end if;
  update public.bookings set status = 'dibatalkan', alasan_batal = trim(p_alasan) where id = p_id and status = 'aktif';
  if not found then
    raise exception 'Jadwal tidak ditemukan atau sudah dibatalkan.' using errcode = 'KT001';
  end if;
end;
$$;

-- ------------------------------------------------------------ hak panggil
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.hitung_biaya_simpan(numeric, timestamptz, timestamptz, numeric, numeric, int, int)',
    'public.masukkan_hasil_produksi(uuid, uuid, uuid, text, numeric, text, boolean, text)',
    'public.terima_titipan(uuid, uuid, uuid, text, numeric, text, boolean, text)',
    'public.ambil_stok(uuid, numeric, text)',
    'public.ajukan_koreksi_stok(uuid, numeric, text)',
    'public.putuskan_koreksi_stok(uuid, boolean, text)',
    'public.ubah_tarif(text, numeric, int, int, text, date, boolean, text)',
    'public.cari_bentrok(timestamptz, timestamptz, uuid)',
    'public.slot_kosong(int, timestamptz, uuid)',
    'public.buat_booking(text, uuid, text, timestamptz, timestamptz, numeric, text)',
    'public.pindah_booking(uuid, timestamptz)',
    'public.batalkan_booking(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

revoke all on function private.aturan_tarif(text, date) from public, anon, authenticated;
revoke all on function private.valid_kg(numeric, text) from public, anon, authenticated;
revoke all on function private.cek_bentrok(timestamptz, timestamptz, uuid) from public, anon, authenticated;
