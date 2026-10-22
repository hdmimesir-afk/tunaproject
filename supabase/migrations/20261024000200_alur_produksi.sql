-- Fase 3 · Fungsi alur produksi: mulai dari lot lulus mutu, simpan loin (aman diulang), komponen hasil,
-- selesai, periksa QC, setujui Owner, minta perbaikan. Galat aturan bisnis memakai SQLSTATE KT001.

-- Total yang sudah ditimbang tidak boleh melebihi ikan masuk (F09). Dipanggil setelah setiap perubahan berat.
create or replace function private.cek_tidak_melebihi(p_production uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  n public.v_neraca_produksi;
begin
  select * into n from public.v_neraca_produksi where production_id = p_production;
  if n.belum_jelas_kg < 0 then
    raise exception 'Total timbangan (% kg) melebihi ikan masuk (% kg). Periksa angka yang diisi.',
      (n.masuk_kg - n.belum_jelas_kg)::text, n.masuk_kg::text using errcode = 'KT001';
  end if;
end;
$$;

create or replace function private.produksi_terkunci(p_production uuid)
returns public.productions
language plpgsql
set search_path = ''
as $$
declare
  p public.productions;
begin
  select * into p from public.productions where id = p_production for update;
  if not found then
    raise exception 'Produksi tidak ditemukan.' using errcode = 'KT001';
  end if;
  return p;
end;
$$;

create or replace function private.wajib_berjalan(p public.productions)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p.status <> 'berjalan' then
    raise exception 'Produksi % sudah % dan tidak bisa diubah. Minta perbaikan dulu bila perlu koreksi.', p.kode, replace(p.status, '_', ' ') using errcode = 'KT001';
  end if;
end;
$$;

-- ------------------------------------------------------------- mulai
-- p_alokasi: [{"lot_id": "...", "kg": 100.5}, ...]. Lot harus lulus mutu dan cukup sisanya; sisa lot berkurang.
create or replace function public.mulai_produksi(p_alokasi jsonb, p_tanggal date default current_date, p_catatan text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  l public.lots;
  id_prod uuid;
  siklus uuid;
  banyak int := 0;
begin
  perform private.wajib_izin('produksi.write');
  if p_alokasi is null or jsonb_typeof(p_alokasi) <> 'array' or jsonb_array_length(p_alokasi) = 0 then
    raise exception 'Pilih minimal satu lot yang lulus mutu.' using errcode = 'KT001';
  end if;
  if (select count(distinct x ->> 'lot_id') from jsonb_array_elements(p_alokasi) x) <> jsonb_array_length(p_alokasi) then
    raise exception 'Satu lot hanya boleh muncul sekali dalam satu produksi.' using errcode = 'KT001';
  end if;

  insert into public.productions (tanggal, catatan) values (coalesce(p_tanggal, current_date), coalesce(p_catatan, ''))
  returning id into id_prod;

  for r in select (x ->> 'lot_id')::uuid as lot_id, (x ->> 'kg')::numeric as kg
           from jsonb_array_elements(p_alokasi) x order by 1 loop
    select * into l from public.lots where id = r.lot_id for update;
    if not found then
      raise exception 'Lot tidak ditemukan.' using errcode = 'KT001';
    end if;
    if l.qc <> 'lulus' then
      raise exception 'Lot % belum lulus mutu, tidak bisa diproduksi.', l.kode using errcode = 'KT001';
    end if;
    if r.kg is null or r.kg <= 0 or round(r.kg, 3) <> r.kg then
      raise exception 'Berat dari lot % harus lebih dari nol dengan paling banyak tiga desimal.', l.kode using errcode = 'KT001';
    end if;
    if r.kg > l.sisa_kg then
      raise exception 'Lot % hanya tersisa % kg.', l.kode, l.sisa_kg::text using errcode = 'KT001';
    end if;
    update public.lots set sisa_kg = sisa_kg - r.kg where id = l.id;
    insert into public.lot_allocations (production_id, lot_id, lot_kode, kg) values (id_prod, l.id, l.kode, r.kg);
    siklus := coalesce(siklus, l.cycle_id);
    banyak := banyak + 1;
  end loop;

  update public.productions set cycle_id = siklus where id = id_prod;
  return id_prod;
end;
$$;

-- ------------------------------------------------------- simpan loin
-- p_baris: [{"id": uuid, "no_ekor": 1|null, "no_loin": 1, "grade_id": uuid, "kg": 12.345, "versi": 1|null}, ...]
-- Aman diulang: baris dengan id sama dan isi sama tidak berubah (draf offline yang dikirim dua kali tidak menggandakan).
-- Bila "versi" dikirim dan sudah berbeda dari versi di database, baris dilewati dan dilaporkan sebagai konflik.
create or replace function public.simpan_loin(p_production uuid, p_baris jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  r record;
  ada public.production_items;
  simpan int := 0;
  sama int := 0;
  konflik uuid[] := array[]::uuid[];
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  perform private.wajib_berjalan(p);
  if p_baris is null or jsonb_typeof(p_baris) <> 'array' then
    raise exception 'Data loin tidak valid.' using errcode = 'KT001';
  end if;

  for r in select * from jsonb_to_recordset(p_baris) as x(id uuid, no_ekor int, no_loin int, grade_id uuid, kg numeric, versi int) loop
    if r.id is null or r.no_loin is null or r.no_loin <= 0 then
      raise exception 'Setiap loin butuh nomor loin lebih dari nol.' using errcode = 'KT001';
    end if;
    if r.kg is null or r.kg <= 0 or round(r.kg, 3) <> r.kg then
      raise exception 'Berat loin nomor % harus lebih dari nol dengan paling banyak tiga desimal.', r.no_loin using errcode = 'KT001';
    end if;
    if r.no_ekor is not null and r.no_ekor <= 0 then
      raise exception 'Nomor ekor loin nomor % tidak valid.', r.no_loin using errcode = 'KT001';
    end if;
    if not exists (select 1 from public.grades g where g.id = r.grade_id and g.aktif) then
      raise exception 'Pilih grade untuk loin nomor %.', r.no_loin using errcode = 'KT001';
    end if;

    select * into ada from public.production_items where id = r.id for update;
    if found then
      if ada.production_id <> p.id then
        raise exception 'Loin nomor % milik produksi lain.', r.no_loin using errcode = 'KT001';
      end if;
      if ada.batal then
        raise exception 'Loin nomor % sudah dibatalkan dan tidak bisa diubah. Tambahkan loin baru.', ada.no_loin using errcode = 'KT001';
      end if;
      if ada.no_ekor is not distinct from r.no_ekor and ada.no_loin = r.no_loin and ada.grade_id = r.grade_id and ada.kg = r.kg then
        sama := sama + 1;
      elsif r.versi is not null and r.versi <> ada.versi then
        konflik := konflik || ada.id;
      else
        begin
          update public.production_items
          set no_ekor = r.no_ekor, no_loin = r.no_loin, grade_id = r.grade_id, kg = r.kg, versi = versi + 1
          where id = ada.id;
        exception when unique_violation then
          raise exception 'Nomor loin % sudah dipakai di produksi ini.', r.no_loin using errcode = 'KT001';
        end;
        simpan := simpan + 1;
      end if;
    else
      begin
        insert into public.production_items (id, production_id, no_ekor, no_loin, grade_id, kg)
        values (r.id, p.id, r.no_ekor, r.no_loin, r.grade_id, r.kg);
      exception when unique_violation then
        raise exception 'Nomor loin % sudah dipakai di produksi ini.', r.no_loin using errcode = 'KT001';
      end;
      simpan := simpan + 1;
    end if;
  end loop;

  perform private.cek_tidak_melebihi(p.id);
  -- Versi terbaru tiap baris yang dikirim, supaya perangkat tahu versi dasar untuk simpan berikutnya.
  return jsonb_build_object(
    'disimpan', simpan, 'sama', sama, 'konflik', to_jsonb(konflik),
    'total_loin', (select loin_kg from public.v_neraca_produksi where production_id = p.id),
    'versi', coalesce((
      select jsonb_object_agg(i.id::text, i.versi)
      from public.production_items i
      where i.production_id = p.id and i.id in (select (x ->> 'id')::uuid from jsonb_array_elements(p_baris) x)
    ), '{}'::jsonb)
  );
end;
$$;

create or replace function public.batalkan_loin(p_item uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  it public.production_items;
  p public.productions;
begin
  perform private.wajib_izin('produksi.write');
  select * into it from public.production_items where id = p_item;
  if not found then
    raise exception 'Loin tidak ditemukan.' using errcode = 'KT001';
  end if;
  p := private.produksi_terkunci(it.production_id);
  perform private.wajib_berjalan(p);
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan membatalkan loin.' using errcode = 'KT001';
  end if;
  update public.production_items set batal = true, alasan_batal = trim(p_alasan), versi = versi + 1
  where id = p_item and not batal;
end;
$$;

-- ----------------------------------------------------- ikan utuh
-- p_baris: [{"no_ekor": 1, "berat_utuh_kg": 42.5}, ...]
create or replace function public.simpan_ekor(p_production uuid, p_baris jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  r record;
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  perform private.wajib_berjalan(p);
  for r in select * from jsonb_to_recordset(coalesce(p_baris, '[]'::jsonb)) as x(no_ekor int, berat_utuh_kg numeric) loop
    if r.no_ekor is null or r.no_ekor <= 0 or r.berat_utuh_kg is null or r.berat_utuh_kg <= 0 or round(r.berat_utuh_kg, 3) <> r.berat_utuh_kg then
      raise exception 'Setiap ekor butuh nomor dan berat lebih dari nol (maksimal tiga desimal).' using errcode = 'KT001';
    end if;
    insert into public.production_fish (production_id, no_ekor, berat_utuh_kg)
    values (p.id, r.no_ekor, r.berat_utuh_kg)
    on conflict (production_id, no_ekor) do update set berat_utuh_kg = excluded.berat_utuh_kg
      where public.production_fish.berat_utuh_kg <> excluded.berat_utuh_kg;
  end loop;
end;
$$;

-- --------------------------------------------------- komponen hasil
-- p_samping: [{"category_id": uuid, "kg": 12.5}, ...]; limbah dan susut ditimbang total, null = belum ditimbang.
create or replace function public.simpan_komponen(p_production uuid, p_samping jsonb, p_limbah numeric, p_susut numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  r record;
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  perform private.wajib_berjalan(p);
  if (p_limbah is not null and (p_limbah < 0 or round(p_limbah, 3) <> p_limbah))
     or (p_susut is not null and (p_susut < 0 or round(p_susut, 3) <> p_susut)) then
    raise exception 'Limbah dan susut tidak boleh negatif dan paling banyak tiga desimal.' using errcode = 'KT001';
  end if;

  for r in select * from jsonb_to_recordset(coalesce(p_samping, '[]'::jsonb)) as x(category_id uuid, kg numeric) loop
    if r.kg is null or r.kg < 0 or round(r.kg, 3) <> r.kg then
      raise exception 'Berat hasil samping tidak boleh negatif dan paling banyak tiga desimal.' using errcode = 'KT001';
    end if;
    if not exists (select 1 from public.component_categories c where c.id = r.category_id and c.aktif and c.komponen = 'hasil_samping') then
      raise exception 'Jenis hasil samping tidak dikenal.' using errcode = 'KT001';
    end if;
    insert into public.production_components (production_id, category_id, kg)
    values (p.id, r.category_id, r.kg)
    on conflict (production_id, category_id) do update set kg = excluded.kg
      where public.production_components.kg <> excluded.kg;
  end loop;

  update public.productions set limbah_kg = p_limbah, susut_kg = p_susut
  where id = p.id and (limbah_kg is distinct from p_limbah or susut_kg is distinct from p_susut);

  perform private.cek_tidak_melebihi(p.id);
end;
$$;

-- ----------------------------------------------------------- selesai
create or replace function public.selesaikan_produksi(p_production uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  perform private.wajib_berjalan(p);
  if not exists (select 1 from public.production_items where production_id = p.id and not batal) then
    raise exception 'Isi minimal satu loin sebelum produksi diselesaikan.' using errcode = 'KT001';
  end if;
  perform private.cek_tidak_melebihi(p.id);
  update public.productions set status = 'selesai', selesai_oleh = (select auth.uid()), selesai_pada = now(), catatan_perbaikan = ''
  where id = p.id;
end;
$$;

-- ----------------------------------------------------- periksa (QC)
-- Penimbang tidak boleh memeriksa produksi yang sama (kecuali pemegang semua izin).
-- Selisih belum jelas harus dijelaskan di sini, atau diterima Owner di langkah berikutnya.
create or replace function public.periksa_produksi(p_production uuid, p_penjelasan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  n public.v_neraca_produksi;
  pelaku uuid := (select auth.uid());
begin
  perform private.wajib_izin('produksi.periksa');
  p := private.produksi_terkunci(p_production);
  if p.status <> 'selesai' then
    raise exception 'Produksi % belum selesai ditimbang atau sudah diperiksa (status %).', p.kode, replace(p.status, '_', ' ') using errcode = 'KT001';
  end if;
  if not private.punya_semua_izin() and (
       p.selesai_oleh = pelaku or p.dibuat_oleh = pelaku
       or exists (select 1 from public.production_items i where i.production_id = p.id and i.dibuat_oleh = pelaku)
     ) then
    raise exception 'Yang menimbang tidak boleh memeriksa produksi yang sama.' using errcode = 'KT001';
  end if;
  select * into n from public.v_neraca_produksi where production_id = p.id;
  if n.belum_jelas_kg > 0 and length(trim(coalesce(p_penjelasan, ''))) = 0 then
    raise exception 'Ada selisih belum jelas % kg. Tulis penjelasannya, atau teruskan ke Owner untuk diterima.', n.belum_jelas_kg::text using errcode = 'KT001';
  end if;
  update public.productions
  set status = 'diperiksa_qc', qc_oleh = pelaku, qc_pada = now(), penjelasan_selisih = trim(coalesce(p_penjelasan, ''))
  where id = p.id;
end;
$$;

-- ------------------------------------------------------ setujui (Owner)
-- "Diperiksa" final hanya bila selisih sudah dijelaskan QC atau diterima Owner lewat p_terima_selisih.
create or replace function public.setujui_produksi(p_production uuid, p_terima_selisih boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  n public.v_neraca_produksi;
begin
  perform private.wajib_izin('produksi.setuju');
  p := private.produksi_terkunci(p_production);
  if p.status <> 'diperiksa_qc' then
    raise exception 'Produksi % belum diperiksa QC (status %).', p.kode, replace(p.status, '_', ' ') using errcode = 'KT001';
  end if;
  select * into n from public.v_neraca_produksi where production_id = p.id;
  if n.belum_jelas_kg > 0 and length(trim(p.penjelasan_selisih)) = 0 and not coalesce(p_terima_selisih, false) then
    raise exception 'Selisih % kg belum dijelaskan. Terima selisih apa adanya atau minta perbaikan.', n.belum_jelas_kg::text using errcode = 'KT001';
  end if;
  update public.productions
  set status = 'diperiksa', owner_oleh = (select auth.uid()), owner_pada = now(),
      selisih_diterima = (n.belum_jelas_kg > 0 and length(trim(p.penjelasan_selisih)) = 0)
  where id = p.id;
end;
$$;

-- ------------------------------------------------------- perbaikan
create or replace function public.minta_perbaikan_produksi(p_production uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
begin
  if not (private.has_permission('produksi.periksa') or private.has_permission('produksi.setuju')) then
    raise exception 'Peran Anda tidak boleh meminta perbaikan.' using errcode = '42501';
  end if;
  p := private.produksi_terkunci(p_production);
  if p.status not in ('selesai', 'diperiksa_qc') then
    raise exception 'Produksi % tidak sedang menunggu pemeriksaan (status %).', p.kode, replace(p.status, '_', ' ') using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis apa yang perlu diperbaiki.' using errcode = 'KT001';
  end if;
  update public.productions
  set status = 'berjalan', catatan_perbaikan = trim(p_alasan), qc_oleh = null, qc_pada = null, penjelasan_selisih = ''
  where id = p.id;
end;
$$;

-- ------------------------------------------------------------ hak panggil
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.mulai_produksi(jsonb, date, text)',
    'public.simpan_loin(uuid, jsonb)',
    'public.batalkan_loin(uuid, text)',
    'public.simpan_ekor(uuid, jsonb)',
    'public.simpan_komponen(uuid, jsonb, numeric, numeric)',
    'public.selesaikan_produksi(uuid)',
    'public.periksa_produksi(uuid, text)',
    'public.setujui_produksi(uuid, boolean)',
    'public.minta_perbaikan_produksi(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

revoke all on function private.cek_tidak_melebihi(uuid) from public, anon, authenticated;
revoke all on function private.produksi_terkunci(uuid) from public, anon, authenticated;
revoke all on function private.wajib_berjalan(public.productions) from public, anon, authenticated;
