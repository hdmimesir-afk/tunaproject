-- Fase 8 · Ruangan gudang dingin (ABF dan CS), stok penunjang (kerja dan pekerja), dan perbaikan angka dashboard.
-- Aturan (PRD): berat numeric(12,3); tidak ada hapus; perubahan hanya lewat fungsi; semua perubahan tercatat.

-- ============================================================ ruangan gudang dingin
-- Gudang dingin terdiri dari beberapa ruangan fisik: ABF (pembeku cepat, ada 3) dan CS (cold storage, ada 1).
-- Kapasitas per ruangan sementara dibagi dari kapasitas gudang yang sudah ada (17.500 kg) dan belum dikonfirmasi owner.
create table public.cold_rooms (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique check (length(trim(kode)) > 0),
  nama text not null check (length(trim(nama)) > 0),
  jenis text not null check (jenis in ('abf', 'cs')),
  kapasitas_kg numeric(12,3) not null check (kapasitas_kg > 0),
  urutan int not null default 0,
  dikonfirmasi boolean not null default false,
  catatan text not null default '',
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
select private.pasang_aturan_tabel('public.cold_rooms');
revoke insert, update on public.cold_rooms from authenticated;
create policy "ruangan terbaca" on public.cold_rooms
  for select to authenticated
  using ((select private.has_permission('gudang.read')) or (select private.has_permission('stok.read')));

insert into public.cold_rooms (kode, nama, jenis, kapasitas_kg, urutan, catatan) values
  ('ABF-1', 'ABF 1', 'abf', 2500, 1, 'Kapasitas sementara, menunggu angka dari owner'),
  ('ABF-2', 'ABF 2', 'abf', 2500, 2, 'Kapasitas sementara, menunggu angka dari owner'),
  ('ABF-3', 'ABF 3', 'abf', 2500, 3, 'Kapasitas sementara, menunggu angka dari owner'),
  ('CS-1', 'Cold Storage 1', 'cs', 10000, 4, 'Kapasitas sementara, menunggu angka dari owner');

alter table public.storage_units add column room_id uuid references public.cold_rooms (id);
create index storage_units_room_idx on public.storage_units (room_id) where status = 'aktif';

-- Kapasitas seluruh gudang = jumlah kapasitas ruangan yang aktif; bila belum ada ruangan, memakai pengaturan lama.
create or replace function private.kapasitas_total()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select sum(r.kapasitas_kg) from public.cold_rooms r where r.aktif),
    (select (s.nilai #>> '{}')::numeric from public.settings s where s.kunci = 'kapasitas_gudang_kg'),
    17500
  );
$$;
revoke all on function private.kapasitas_total() from public, anon;
grant execute on function private.kapasitas_total() to authenticated;

create or replace view public.v_gudang_isi with (security_invoker = true) as
select
  private.kapasitas_total()::numeric(12,3) as kapasitas_kg,
  coalesce(sum(u.sisa_kg) filter (where u.buyer_id is null), 0)::numeric(12,3) as isi_sendiri_kg,
  coalesce(sum(u.sisa_kg) filter (where u.buyer_id is not null), 0)::numeric(12,3) as isi_titipan_kg
from public.storage_units u
where u.status = 'aktif';

-- Isi tiap ruangan: milik sendiri dan titipan dipisah.
create view public.v_ruangan_isi with (security_invoker = true) as
select
  r.id, r.kode, r.nama, r.jenis, r.kapasitas_kg, r.urutan, r.dikonfirmasi, r.catatan, r.aktif,
  coalesce(sum(u.sisa_kg) filter (where u.buyer_id is null), 0)::numeric(12,3) as isi_sendiri_kg,
  coalesce(sum(u.sisa_kg) filter (where u.buyer_id is not null), 0)::numeric(12,3) as isi_titipan_kg,
  coalesce(sum(u.sisa_kg), 0)::numeric(12,3) as isi_kg,
  count(u.id)::int as jumlah_unit
from public.cold_rooms r
left join public.storage_units u on u.room_id = r.id and u.status = 'aktif'
group by r.id;
revoke all on public.v_ruangan_isi from anon;

-- Cek ruangan: ada, aktif, dan muat berat tambahan. Dikunci per ruangan supaya dua penempatan bersamaan tidak sama-sama lolos.
create or replace function private.cek_ruangan(p_room uuid, p_tambah numeric)
returns void
language plpgsql
set search_path = ''
as $$
declare
  r public.cold_rooms;
  isi numeric;
begin
  perform pg_advisory_xact_lock(hashtext('ruangan:' || p_room::text));
  select * into r from public.cold_rooms where id = p_room;
  if not found or not r.aktif then
    raise exception 'Ruangan tidak dikenal atau sudah nonaktif.' using errcode = 'KT001';
  end if;
  select coalesce(sum(sisa_kg), 0) into isi from public.storage_units where room_id = r.id and status = 'aktif';
  if isi + p_tambah > r.kapasitas_kg then
    raise exception 'Ruangan % tidak muat: terisi % kg dari %, tambahan % kg.', r.nama, isi::text, r.kapasitas_kg::text, p_tambah::text using errcode = 'KT001';
  end if;
end;
$$;
revoke all on function private.cek_ruangan(uuid, numeric) from public, anon, authenticated;

-- Hasil produksi masuk stok, kini dengan ruangan (boleh kosong untuk data lama).
drop function public.masukkan_hasil_produksi(uuid, uuid, uuid, text, numeric, text, boolean, text);
create function public.masukkan_hasil_produksi(
  p_production uuid, p_product uuid, p_grade uuid, p_kondisi text, p_kg numeric,
  p_lokasi text default '', p_langsung_kirim boolean default false, p_catatan text default '', p_room uuid default null
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
  if p_room is not null and not p_langsung_kirim then
    perform private.cek_ruangan(p_room, p_kg);
  end if;

  insert into public.storage_units (
    product_id, product_nama, grade_id, grade_kode, kondisi, lokasi, production_id, production_kode,
    kg_masuk, sisa_kg, sisa_dasar_masuk, langsung_kirim, status, catatan, room_id
  ) values (
    prod.id, prod.nama, p_grade, kode_grade, p_kondisi, coalesce(p_lokasi, ''), pr.id, pr.kode,
    p_kg, case when p_langsung_kirim then 0 else p_kg end, case when p_langsung_kirim then 0 else p_kg end,
    p_langsung_kirim, case when p_langsung_kirim then 'habis' else 'aktif' end, coalesce(p_catatan, ''),
    case when p_langsung_kirim then null else p_room end
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

-- Titipan masuk, kini dengan ruangan. Kapasitas total dari jumlah kapasitas ruangan.
drop function public.terima_titipan(uuid, uuid, uuid, text, numeric, text, boolean, text);
create function public.terima_titipan(
  p_buyer uuid, p_product uuid, p_grade uuid, p_kondisi text, p_kg numeric,
  p_lokasi text default '', p_perlu_abf boolean default false, p_catatan text default '', p_room uuid default null
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
  kap := private.kapasitas_total();
  if isi + p_kg > kap then
    raise exception 'Kapasitas gudang % kg tidak cukup: terisi % kg, titipan baru % kg.', kap::text, isi::text, p_kg::text using errcode = 'KT001';
  end if;
  if p_room is not null then
    perform private.cek_ruangan(p_room, p_kg);
  end if;

  insert into public.storage_units (
    buyer_id, pemilik_nama, product_id, product_nama, grade_id, grade_kode, kondisi, lokasi,
    kg_masuk, sisa_kg, sisa_dasar_masuk, perlu_abf, catatan, room_id
  ) values (
    b.id, b.nama, prod.id, prod.nama, p_grade, kode_grade, p_kondisi, coalesce(p_lokasi, ''),
    p_kg, p_kg, p_kg, coalesce(p_perlu_abf, false), coalesce(p_catatan, ''), p_room
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

-- Pindah satu unit stok ke ruangan lain (misalnya dari ABF ke CS setelah beku). Perubahan tercatat di jejak.
create or replace function public.pindah_ruangan(p_unit uuid, p_room uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u public.storage_units;
begin
  select * into u from public.storage_units where id = p_unit for update;
  if not found then
    raise exception 'Unit stok tidak ditemukan.' using errcode = 'KT001';
  end if;
  perform private.wajib_izin(case when u.buyer_id is null then 'stok.write' else 'gudang.write' end);
  if u.status <> 'aktif' then
    raise exception 'Unit % sudah habis, tidak perlu dipindah.', u.kode using errcode = 'KT001';
  end if;
  if p_room is not null and u.room_id is distinct from p_room then
    perform private.cek_ruangan(p_room, u.sisa_kg);
  end if;
  update public.storage_units set room_id = p_room where id = u.id;
end;
$$;

-- Ubah kapasitas atau status ruangan. Kapasitas tidak boleh di bawah isi saat ini.
create or replace function public.ubah_ruangan(p_room uuid, p_kapasitas numeric, p_dikonfirmasi boolean, p_catatan text default '', p_aktif boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  isi numeric;
begin
  perform private.wajib_izin('pengaturan.write');
  if p_kapasitas is null or p_kapasitas <= 0 or round(p_kapasitas, 3) <> p_kapasitas then
    raise exception 'Kapasitas harus lebih dari nol dengan paling banyak tiga desimal.' using errcode = 'KT001';
  end if;
  perform pg_advisory_xact_lock(hashtext('ruangan:' || p_room::text));
  select coalesce(sum(sisa_kg), 0) into isi from public.storage_units where room_id = p_room and status = 'aktif';
  if p_kapasitas < isi then
    raise exception 'Kapasitas tidak boleh di bawah isi ruangan sekarang (% kg).', isi::text using errcode = 'KT001';
  end if;
  if not coalesce(p_aktif, true) and isi > 0 then
    raise exception 'Ruangan masih berisi % kg. Pindahkan isinya dulu sebelum dinonaktifkan.', isi::text using errcode = 'KT001';
  end if;
  update public.cold_rooms
  set kapasitas_kg = p_kapasitas, dikonfirmasi = coalesce(p_dikonfirmasi, false), catatan = coalesce(p_catatan, ''), aktif = coalesce(p_aktif, true)
  where id = p_room;
  if not found then
    raise exception 'Ruangan tidak ditemukan.' using errcode = 'KT001';
  end if;
end;
$$;

-- ============================================================ stok penunjang
-- Barang habis pakai di luar ikan: penunjang kerja (kemasan, es, label, dan sejenisnya) dan penunjang pekerja (apron, masker, dan sejenisnya).
-- Stok tidak disimpan sebagai angka, melainkan dihitung dari riwayat masuk, keluar, dan koreksi (tidak bisa diubah atau dihapus).
create sequence public.supply_item_kode_seq;

create table public.supply_items (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default ('BRG-' || lpad(nextval('public.supply_item_kode_seq')::text, 3, '0')),
  kategori text not null check (kategori in ('kerja', 'pekerja')),
  nama text not null check (length(trim(nama)) > 0),
  satuan text not null default 'pcs' check (length(trim(satuan)) > 0),
  stok_minimum numeric(14,3) not null default 0 check (stok_minimum >= 0),
  lokasi text not null default '',
  keterangan text not null default '',
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create unique index supply_items_nama_unik on public.supply_items (kategori, lower(nama));

create table public.supply_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.supply_items (id),
  jenis text not null check (jenis in ('masuk', 'keluar', 'koreksi')),
  -- masuk dan keluar selalu positif; koreksi bertanda (minus mengurangi).
  jumlah numeric(14,3) not null check (jumlah <> 0),
  tanggal date not null default current_date,
  penerima text not null default '',
  catatan text not null default '',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  check (jenis = 'koreksi' or jumlah > 0)
);
create index supply_movements_item_idx on public.supply_movements (item_id, tanggal desc, dibuat_pada desc);

select private.pasang_aturan_tabel('public.supply_items');
select private.pasang_aturan_tabel('public.supply_movements', false);
revoke insert, update on public.supply_items, public.supply_movements from authenticated;
create policy "barang terbaca" on public.supply_items for select to authenticated using ((select private.has_permission('stok.read')));
create policy "gerak barang terbaca" on public.supply_movements for select to authenticated using ((select private.has_permission('stok.read')));

create view public.v_supply_stok with (security_invoker = true) as
select
  i.id, i.kode, i.kategori, i.nama, i.satuan, i.stok_minimum, i.lokasi, i.keterangan, i.aktif,
  coalesce(s.stok, 0)::numeric(14,3) as stok,
  case when coalesce(s.stok, 0) <= 0 then 'habis' when coalesce(s.stok, 0) <= i.stok_minimum then 'menipis' else 'aman' end as status_stok,
  s.terakhir
from public.supply_items i
left join lateral (
  select sum(case m.jenis when 'keluar' then -m.jumlah else m.jumlah end) as stok, max(m.tanggal) as terakhir
  from public.supply_movements m where m.item_id = i.id
) s on true;
revoke all on public.v_supply_stok from anon;

create or replace function private.valid_jumlah(p numeric, p_apa text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p is null or p <= 0 or round(p, 3) <> p then
    raise exception '% harus lebih dari nol dengan paling banyak tiga desimal.', p_apa using errcode = 'KT001';
  end if;
end;
$$;
revoke all on function private.valid_jumlah(numeric, text) from public, anon, authenticated;

create or replace function private.tanggal_barang(p date)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  hari date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if p is null then
    return hari;
  end if;
  if p > hari then
    raise exception 'Tanggal tidak boleh di masa depan.' using errcode = 'KT001';
  end if;
  return p;
end;
$$;
revoke all on function private.tanggal_barang(date) from public, anon, authenticated;

-- Tambah atau ubah barang. Barang tidak dihapus; yang tidak dipakai lagi dinonaktifkan.
create or replace function public.simpan_barang(
  p_id uuid, p_kategori text, p_nama text, p_satuan text, p_minimum numeric, p_lokasi text default '', p_keterangan text default '', p_aktif boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_b uuid;
begin
  perform private.wajib_izin('stok.write');
  if p_kategori not in ('kerja', 'pekerja') then
    raise exception 'Pilih kategori penunjang kerja atau penunjang pekerja.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_nama, ''))) = 0 then
    raise exception 'Isi nama barang.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_satuan, ''))) = 0 then
    raise exception 'Isi satuan, misalnya pcs, box, atau kg.' using errcode = 'KT001';
  end if;
  if p_minimum is null or p_minimum < 0 or round(p_minimum, 3) <> p_minimum then
    raise exception 'Stok minimum tidak boleh negatif dan paling banyak tiga desimal.' using errcode = 'KT001';
  end if;
  begin
    if p_id is null then
      insert into public.supply_items (kategori, nama, satuan, stok_minimum, lokasi, keterangan)
      values (p_kategori, trim(p_nama), trim(p_satuan), p_minimum, trim(coalesce(p_lokasi, '')), trim(coalesce(p_keterangan, '')))
      returning id into id_b;
    else
      update public.supply_items
      set kategori = p_kategori, nama = trim(p_nama), satuan = trim(p_satuan), stok_minimum = p_minimum,
          lokasi = trim(coalesce(p_lokasi, '')), keterangan = trim(coalesce(p_keterangan, '')), aktif = coalesce(p_aktif, true)
      where id = p_id
      returning id into id_b;
      if id_b is null then
        raise exception 'Barang tidak ditemukan.' using errcode = 'KT001';
      end if;
    end if;
  exception when unique_violation then
    raise exception 'Nama barang ini sudah dipakai di kategori yang sama.' using errcode = 'KT001';
  end;
  return id_b;
end;
$$;

create or replace function public.catat_barang_masuk(p_item uuid, p_jumlah numeric, p_tanggal date default null, p_catatan text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  it public.supply_items;
  id_g uuid;
begin
  perform private.wajib_izin('stok.write');
  perform private.valid_jumlah(p_jumlah, 'Jumlah masuk');
  select * into it from public.supply_items where id = p_item and aktif for update;
  if not found then
    raise exception 'Barang tidak ditemukan atau sudah nonaktif.' using errcode = 'KT001';
  end if;
  insert into public.supply_movements (item_id, jenis, jumlah, tanggal, catatan)
  values (it.id, 'masuk', p_jumlah, private.tanggal_barang(p_tanggal), trim(coalesce(p_catatan, '')))
  returning id into id_g;
  return id_g;
end;
$$;

create or replace function public.catat_barang_keluar(p_item uuid, p_jumlah numeric, p_tanggal date default null, p_penerima text default '', p_catatan text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  it public.supply_items;
  sekarang numeric;
  id_g uuid;
begin
  perform private.wajib_izin('stok.write');
  perform private.valid_jumlah(p_jumlah, 'Jumlah keluar');
  select * into it from public.supply_items where id = p_item and aktif for update;
  if not found then
    raise exception 'Barang tidak ditemukan atau sudah nonaktif.' using errcode = 'KT001';
  end if;
  select coalesce(sum(case jenis when 'keluar' then -jumlah else jumlah end), 0) into sekarang from public.supply_movements where item_id = it.id;
  if p_jumlah > sekarang then
    raise exception 'Stok % hanya tersisa % %.', it.nama, sekarang::text, it.satuan using errcode = 'KT001';
  end if;
  insert into public.supply_movements (item_id, jenis, jumlah, tanggal, penerima, catatan)
  values (it.id, 'keluar', p_jumlah, private.tanggal_barang(p_tanggal), trim(coalesce(p_penerima, '')), trim(coalesce(p_catatan, '')))
  returning id into id_g;
  return id_g;
end;
$$;

-- Koreksi hasil hitung fisik (opname). Berlaku langsung, wajib beralasan, dan tidak boleh membuat stok negatif.
create or replace function public.koreksi_barang(p_item uuid, p_selisih numeric, p_alasan text, p_tanggal date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  it public.supply_items;
  sekarang numeric;
  id_g uuid;
begin
  perform private.wajib_izin('stok.write');
  if p_selisih is null or p_selisih = 0 or round(p_selisih, 3) <> p_selisih then
    raise exception 'Isi selisih jumlah (boleh minus) dengan paling banyak tiga desimal.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan koreksi.' using errcode = 'KT001';
  end if;
  select * into it from public.supply_items where id = p_item and aktif for update;
  if not found then
    raise exception 'Barang tidak ditemukan atau sudah nonaktif.' using errcode = 'KT001';
  end if;
  select coalesce(sum(case jenis when 'keluar' then -jumlah else jumlah end), 0) into sekarang from public.supply_movements where item_id = it.id;
  if sekarang + p_selisih < 0 then
    raise exception 'Koreksi membuat stok % negatif (sekarang % %).', it.nama, sekarang::text, it.satuan using errcode = 'KT001';
  end if;
  insert into public.supply_movements (item_id, jenis, jumlah, tanggal, catatan)
  values (it.id, 'koreksi', p_selisih, private.tanggal_barang(p_tanggal), trim(p_alasan))
  returning id into id_g;
  return id_g;
end;
$$;

-- ============================================================ perbaikan angka dashboard dan laba rugi
-- v_dashboard: tambah jumlah barang penunjang yang menipis dan habis (kolom baru di akhir).
create or replace view public.v_dashboard with (security_invoker = true) as
select
  (select coalesce(sum(po.total), 0) from public.purchase_orders po where po.status_persetujuan = 'disetujui')::numeric(16,2)
    - (select coalesce(sum(p.jumlah), 0) from public.payments p)::numeric(16,2) as hutang_pemasok,
  (select coalesce(sum(i.sisa), 0) from public.v_invoices i where i.status_tagihan <> 'dibatalkan')::numeric(16,2) as piutang,
  (select count(*) from public.v_invoices i where i.status_tagihan = 'terlambat')::int as invoice_terlambat,
  (select coalesce(sum(i.sisa), 0) from public.v_invoices i where i.status_tagihan = 'terlambat')::numeric(16,2) as piutang_terlambat,
  (select coalesce(sum(l.jumlah), 0) from public.ledger l where l.arah = 'masuk' and date_trunc('month', l.tanggal) = date_trunc('month', (now() at time zone 'Asia/Jakarta')::date))::numeric(16,2) as kas_masuk_bulan_ini,
  (select coalesce(sum(l.jumlah), 0) from public.ledger l where l.arah = 'keluar' and date_trunc('month', l.tanggal) = date_trunc('month', (now() at time zone 'Asia/Jakarta')::date))::numeric(16,2) as kas_keluar_bulan_ini,
  (select count(*) from public.approvals a where a.status in ('diajukan', 'diperiksa'))::int as persetujuan_menunggu,
  (select count(*) from public.expenses e where e.status = 'diajukan')::int as biaya_menunggu,
  (select count(*) from public.storage_movements m where m.jenis = 'koreksi' and m.status = 'diajukan')::int as koreksi_menunggu,
  (select count(*) from public.productions p where p.status in ('selesai', 'diperiksa_qc'))::int as produksi_menunggu,
  (select count(*) from public.productions p where p.status = 'berjalan')::int as produksi_berjalan,
  (select count(*) from public.lots l where l.qc = 'menunggu')::int as lot_menunggu_mutu,
  (select coalesce(sum(u.sisa_kg), 0) from public.storage_units u where u.status = 'aktif' and u.buyer_id is null)::numeric(12,3) as stok_sendiri_kg,
  (select coalesce(sum(u.sisa_kg), 0) from public.storage_units u where u.status = 'aktif' and u.buyer_id is not null)::numeric(12,3) as stok_titipan_kg,
  (select count(*) from public.sales_orders s where s.status = 'draf')::int as pesanan_belum_dikirim,
  (
    (select count(*) from public.purchase_orders po where po.status_persetujuan in ('diajukan', 'disetujui')
       and not exists (select 1 from public.documents d where d.ref_tabel = 'purchase_orders' and d.ref_id = po.id and d.jenis = 'nota'))
    + (select count(*) from public.expenses e join public.expense_categories k on k.id = e.category_id where e.status in ('diajukan', 'disetujui') and k.nota_wajib
       and not exists (select 1 from public.documents d where d.ref_tabel = 'expenses' and d.ref_id = e.id and d.jenis = 'nota'))
    + (select count(*) from public.payments p where not exists (select 1 from public.documents d where d.ref_tabel = 'payments' and d.ref_id = p.id))
    + (select count(*) from public.customer_payments cp where not exists (select 1 from public.documents d where d.ref_tabel = 'customer_payments' and d.ref_id = cp.id))
  )::int as dokumen_kurang,
  (select count(*) from public.v_supply_stok s where s.aktif and s.status_stok = 'menipis')::int as barang_menipis,
  (select count(*) from public.v_supply_stok s where s.aktif and s.status_stok = 'habis')::int as barang_habis;

-- v_laba_rugi_siklus: tambah kg_diolah (ikan yang benar-benar masuk produksi). Persen hasil olahan sebelumnya memakai kg PO (yang dipesan),
-- sehingga tampak kecil selama sebagian ikan belum diolah. Kolom baru di akhir.
create or replace view public.v_laba_rugi_siklus with (security_invoker = true) as
select
  c.id as cycle_id, c.kode, c.ref_po_pembeli, c.status,
  coalesce(j.pendapatan_loin, 0)::numeric(16,2) as pendapatan_loin,
  coalesce(j.pendapatan_samping, 0)::numeric(16,2) as pendapatan_samping,
  coalesce(j.pendapatan_total, 0)::numeric(16,2) as pendapatan_total,
  coalesce(j.kg_loin_terjual, 0)::numeric(12,3) as kg_loin_terjual,
  coalesce(b.biaya_ikan, 0)::numeric(16,2) as biaya_ikan,
  coalesce(b.kg_ikan, 0)::numeric(12,3) as kg_ikan,
  coalesce(x.biaya_lain, 0)::numeric(16,2) as biaya_lain,
  (coalesce(b.biaya_ikan, 0) + coalesce(x.biaya_lain, 0))::numeric(16,2) as biaya_total,
  (coalesce(j.pendapatan_total, 0) - coalesce(b.biaya_ikan, 0) - coalesce(x.biaya_lain, 0))::numeric(16,2) as laba_kotor,
  case when coalesce(j.pendapatan_total, 0) > 0
    then round((coalesce(j.pendapatan_total, 0) - coalesce(b.biaya_ikan, 0) - coalesce(x.biaya_lain, 0)) / j.pendapatan_total * 100, 1)
  end as margin_pct,
  coalesce(pr.loin_kg, 0)::numeric(12,3) as loin_kg,
  coalesce(pr.masuk_kg, 0)::numeric(12,3) as kg_diolah
from public.cycles c
left join lateral (
  select
    sum(round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2)) filter (where a.kelompok = 'loin') as pendapatan_loin,
    sum(round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2)) filter (where a.kelompok <> 'loin') as pendapatan_samping,
    sum(round(coalesce(a.kg_diterima, a.kg_kirim) * a.harga_per_kg, 2)) as pendapatan_total,
    sum(coalesce(a.kg_diterima, a.kg_kirim)) filter (where a.kelompok = 'loin') as kg_loin_terjual
  from public.sale_allocations a join public.sales_orders s on s.id = a.order_id
  where s.cycle_id = c.id and s.status = 'terkirim' and not a.batal
) j on true
left join lateral (
  select sum(po.total) as biaya_ikan, sum(po.kg) as kg_ikan
  from public.purchase_orders po where po.cycle_id = c.id and po.status_persetujuan = 'disetujui'
) b on true
left join lateral (
  select sum(e.jumlah) as biaya_lain from public.expenses e where e.cycle_id = c.id and e.status = 'disetujui'
) x on true
left join lateral (
  select sum(n.loin_kg) as loin_kg, sum(n.masuk_kg) as masuk_kg
  from public.productions p join public.v_neraca_produksi n on n.production_id = p.id where p.cycle_id = c.id
) pr on true;

-- ============================================================ hak panggil
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.masukkan_hasil_produksi(uuid, uuid, uuid, text, numeric, text, boolean, text, uuid)',
    'public.terima_titipan(uuid, uuid, uuid, text, numeric, text, boolean, text, uuid)',
    'public.pindah_ruangan(uuid, uuid)',
    'public.ubah_ruangan(uuid, numeric, boolean, text, boolean)',
    'public.simpan_barang(uuid, text, text, text, numeric, text, text, boolean)',
    'public.catat_barang_masuk(uuid, numeric, date, text)',
    'public.catat_barang_keluar(uuid, numeric, date, text, text)',
    'public.koreksi_barang(uuid, numeric, text, date)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
grant usage on sequence public.supply_item_kode_seq to authenticated;

-- ============================================================ data contoh penunjang
-- Daftar sementara sampai owner mengirim daftar asli. Semua bertanda "contoh" di keterangan; ganti dengan menonaktifkan lalu menambah yang asli.
do $$
declare
  r record;
  id_b uuid;
begin
  for r in
    select * from (values
      ('kerja', 'Kantong vakum 30x40 cm', 'pcs', 500, 2400, 'Gudang kemasan'),
      ('kerja', 'Karton master loin', 'pcs', 200, 140, 'Gudang kemasan'),
      ('kerja', 'Styrofoam box', 'pcs', 100, 320, 'Gudang kemasan'),
      ('kerja', 'Es batu curah', 'kg', 500, 1200, 'Ruang produksi'),
      ('kerja', 'Label kemasan', 'rol', 20, 45, 'Gudang kemasan'),
      ('kerja', 'Plastik wrap', 'rol', 10, 4, 'Gudang kemasan'),
      ('kerja', 'Lakban', 'rol', 24, 0, 'Gudang kemasan'),
      ('kerja', 'Tali pengikat', 'rol', 10, 18, 'Gudang kemasan'),
      ('pekerja', 'Apron plastik', 'pcs', 60, 150, 'Loker pekerja'),
      ('pekerja', 'Masker', 'box', 5, 2, 'Loker pekerja'),
      ('pekerja', 'Sarung tangan karet', 'pasang', 40, 120, 'Loker pekerja'),
      ('pekerja', 'Sarung tangan anti-potong', 'pasang', 10, 14, 'Loker pekerja'),
      ('pekerja', 'Sepatu boot', 'pasang', 8, 12, 'Loker pekerja'),
      ('pekerja', 'Penutup kepala', 'pcs', 100, 260, 'Loker pekerja'),
      ('pekerja', 'Jaket cold storage', 'pcs', 6, 9, 'Loker pekerja')
    ) as t(kategori, nama, satuan, minimum, stok, lokasi)
  loop
    insert into public.supply_items (kategori, nama, satuan, stok_minimum, lokasi, keterangan)
    values (r.kategori, r.nama, r.satuan, r.minimum, r.lokasi, 'Contoh sementara, daftar asli menyusul.')
    returning id into id_b;
    if r.stok > 0 then
      insert into public.supply_movements (item_id, jenis, jumlah, tanggal, catatan)
      values (id_b, 'masuk', r.stok + case when r.nama in ('Apron plastik', 'Masker', 'Sarung tangan karet') then 10 else 0 end, (now() at time zone 'Asia/Jakarta')::date - 14, 'Stok awal (contoh)');
      if r.nama in ('Apron plastik', 'Masker', 'Sarung tangan karet') then
        insert into public.supply_movements (item_id, jenis, jumlah, tanggal, penerima, catatan)
        values (id_b, 'keluar', 10, (now() at time zone 'Asia/Jakarta')::date - 7, 'Tim potong loin', 'Pembagian mingguan (contoh)');
      end if;
    end if;
  end loop;
end;
$$;
