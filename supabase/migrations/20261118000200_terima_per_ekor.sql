-- Hasil meeting operasional 18 Nov 2026 (transkrip):
--   1. Penerimaan per ekor (desain Figma Mas Bisma): tiap ekor punya nomor tag, spesies, berat, grade tuna utuh, dan jumlah
--      tusukan gancu. Potongan gancu (bawaan 1 kg per tusukan, bisa diubah di Pengaturan) nggak dibayar.
--      Berat lot = jumlah berat ekor; hasil grading lot = jumlah berat dibayar per grade. Cara lama (berat total) tetap ada.
--   2. Terima, timbang, dan grading bisa sekali jalan (grading tetap butuh izin mutu).
--   3. Jumlah ekor dicatat di lot dan di produksi, buat laporan produksi.
--   4. Koreksi timbangan produksi yang udah selesai, diperiksa, atau udah disetujui (termasuk yang hasilnya udah masuk stok),
--      wajib alasan dan tercatat. Hasil yang udah masuk stok jadi batas bawahnya.
-- Aturan (PRD): berat numeric(12,3); tidak ada hapus (ekor yang dibuang ditandai batal); perubahan lewat fungsi; tercatat.

insert into public.settings (kunci, nilai, keterangan) values
  ('potongan_gancu_kg', '1', 'Potongan berat per tusukan gancu waktu penerimaan per ekor, kg')
on conflict (kunci) do nothing;

alter table public.lots add column jumlah_ekor int check (jumlah_ekor is null or jumlah_ekor > 0);
alter table public.productions add column jumlah_ekor int check (jumlah_ekor is null or jumlah_ekor > 0);

-- ============================================================ ekor per lot
create table public.lot_ekor (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id),
  urutan int not null default 1,
  no_tag text not null default '' check (length(no_tag) <= 30),
  spesies text not null default 'Tuna' check (length(spesies) <= 40),
  kg numeric(12,3) not null check (kg > 0),
  grade_id uuid references public.grades (id),
  gancu int not null default 0 check (gancu between 0 and 50),
  potongan_kg numeric(12,3) not null default 0 check (potongan_kg >= 0 and potongan_kg < kg),
  kg_bayar numeric(12,3) generated always as (kg - potongan_kg) stored,
  batal boolean not null default false,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
create index lot_ekor_lot_idx on public.lot_ekor (lot_id) where not batal;
select private.pasang_aturan_tabel('public.lot_ekor');
revoke insert, update on public.lot_ekor from authenticated;
create policy "ekor lot terbaca" on public.lot_ekor for select to authenticated using (
  (select private.has_permission('mutu.read')) or (select private.has_permission('pembelian.read')) or (select private.has_permission('produksi.read'))
);
create trigger lot_ekor_jenis before insert or update of grade_id on public.lot_ekor
  for each row execute function private.cek_jenis_grade('utuh');

-- Lot yang dicatat per ekor: berat dan jumlah ekornya harus sama dengan data ekornya.
create or replace function private.jaga_lot_ekor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tot numeric(12,3);
  n int;
begin
  select coalesce(sum(e.kg), 0), count(*) into tot, n from public.lot_ekor e where e.lot_id = new.id and not e.batal;
  if n > 0 and (new.kg <> tot or new.jumlah_ekor is distinct from n) then
    raise exception 'Lot % dicatat per ekor. Berat dan jumlah ekornya diubah lewat koreksi ekor.', new.kode using errcode = 'KT001';
  end if;
  return new;
end;
$$;
create trigger lots_jaga_ekor before update of kg, jumlah_ekor on public.lots
  for each row execute function private.jaga_lot_ekor();

create or replace function private.potongan_gancu()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select nullif(s.nilai #>> '{}', '')::numeric from public.settings s where s.kunci = 'potongan_gancu_kg'), 1);
$$;

-- Simpan isian ekor satu lot. p_ekor: [{"id": uuid|null, "no_tag", "spesies", "kg", "grade_id": uuid|null, "gancu": int}].
-- Ekor yang nggak ada lagi di isian ditandai batal (nggak dihapus).
create or replace function private.isi_ekor(p_lot uuid, p_ekor jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  per numeric := private.potongan_gancu();
  n int := 0;
  ids uuid[] := array[]::uuid[];
  id_e uuid;
  pot numeric(12,3);
  ganda text;
begin
  if p_ekor is null or jsonb_typeof(p_ekor) <> 'array' or jsonb_array_length(p_ekor) = 0 then
    raise exception 'Isi minimal satu ekor.' using errcode = 'KT001';
  end if;
  if jsonb_array_length(p_ekor) > 500 then
    raise exception 'Maksimal 500 ekor sekali catat.' using errcode = 'KT001';
  end if;
  for r in select * from jsonb_to_recordset(p_ekor) as x(id uuid, no_tag text, spesies text, kg numeric, grade_id uuid, gancu int) loop
    n := n + 1;
    if r.kg is null or r.kg <= 0 or round(r.kg, 3) <> r.kg then
      raise exception 'Berat ekor ke-% harus lebih dari nol, paling banyak tiga angka di belakang koma.', n using errcode = 'KT001';
    end if;
    if coalesce(r.gancu, 0) < 0 or coalesce(r.gancu, 0) > 50 then
      raise exception 'Jumlah tusukan gancu ekor ke-% nggak masuk akal.', n using errcode = 'KT001';
    end if;
    pot := round(coalesce(r.gancu, 0) * per, 3);
    if pot >= r.kg then
      raise exception 'Potongan gancu ekor ke-% lebih besar dari beratnya.', n using errcode = 'KT001';
    end if;
    if length(trim(coalesce(r.no_tag, ''))) > 30 or length(trim(coalesce(r.spesies, ''))) > 40 then
      raise exception 'Nomor tag atau spesies ekor ke-% kepanjangan.', n using errcode = 'KT001';
    end if;
    if r.grade_id is not null and not exists (select 1 from public.grades g where g.id = r.grade_id and g.aktif) then
      raise exception 'Grade ekor ke-% udah nggak aktif.', n using errcode = 'KT001';
    end if;
    if r.id is not null and exists (select 1 from public.lot_ekor e where e.id = r.id and e.lot_id <> p_lot) then
      raise exception 'Data ekor nggak valid. Muat ulang halaman, terus coba lagi.' using errcode = 'KT001';
    end if;
    insert into public.lot_ekor (id, lot_id, urutan, no_tag, spesies, kg, grade_id, gancu, potongan_kg, batal)
    values (coalesce(r.id, gen_random_uuid()), p_lot, n, trim(coalesce(r.no_tag, '')), coalesce(nullif(trim(r.spesies), ''), 'Tuna'),
            r.kg, r.grade_id, coalesce(r.gancu, 0), pot, false)
    on conflict (id) do update set urutan = excluded.urutan, no_tag = excluded.no_tag, spesies = excluded.spesies, kg = excluded.kg,
      grade_id = excluded.grade_id, gancu = excluded.gancu, potongan_kg = excluded.potongan_kg, batal = false
    returning id into id_e;
    ids := ids || id_e;
  end loop;
  update public.lot_ekor set batal = true where lot_id = p_lot and not batal and id <> all(ids);

  select e.no_tag into ganda from public.lot_ekor e where e.lot_id = p_lot and not e.batal and e.no_tag <> ''
  group by e.no_tag having count(*) > 1 limit 1;
  if ganda is not null then
    raise exception 'Nomor tag % dipakai lebih dari sekali.', ganda using errcode = 'KT001';
  end if;
end;
$$;

-- Berat, sisa, dan jumlah ekor lot ikut data ekornya.
create or replace function private.sinkron_ekor_lot(p_lot uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lots;
  tot numeric(12,3);
  n int;
  terpakai numeric(12,3);
begin
  select * into l from public.lots where id = p_lot for update;
  select coalesce(sum(e.kg), 0), count(*) into tot, n from public.lot_ekor e where e.lot_id = l.id and not e.batal;
  terpakai := l.kg - l.sisa_kg;
  if tot < terpakai then
    raise exception 'Lot % udah dipakai produksi % kg, jadi total berat ekornya nggak boleh kurang dari itu.', l.kode, trim_scale(terpakai)::text using errcode = 'KT001';
  end if;
  if tot < coalesce((select sum(lg.kg) from public.lot_grades lg where lg.lot_id = l.id and l.qc = 'lulus' and not exists (
       select 1 from public.lot_ekor e where e.lot_id = l.id and not e.batal and e.grade_id is not null)), 0) then
    raise exception 'Hasil grading lot % lebih berat dari total ekornya. Grading ulang dulu.', l.kode using errcode = 'KT001';
  end if;
  update public.lots set kg = tot, sisa_kg = tot - terpakai, jumlah_ekor = n where id = l.id;
end;
$$;

-- Hasil grading lot dari ekornya: berat dibayar (berat dikurangi potongan gancu) per grade.
create or replace function private.grade_dari_ekor(p_lot uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  hasil jsonb;
begin
  if exists (select 1 from public.lot_ekor e where e.lot_id = p_lot and not e.batal and e.grade_id is null) then
    raise exception 'Ada ekor yang belum ada grade-nya. Lengkapi grade tiap ekor dulu.' using errcode = 'KT001';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('grade_id', x.grade_id, 'kg', x.kg)), '[]'::jsonb) into hasil
  from (select e.grade_id, sum(e.kg_bayar) as kg from public.lot_ekor e where e.lot_id = p_lot and not e.batal group by e.grade_id) x;
  return hasil;
end;
$$;

create or replace function private.lot_per_ekor(p_lot uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.lot_ekor e where e.lot_id = p_lot and not e.batal);
$$;

-- ============================================================ grading (lot per ekor ikut ekornya)
-- Sama dengan versi 17 Nov, ditambah: lot yang dicatat per ekor, grading-nya diambil dari grade tiap ekor.
create or replace function public.cek_mutu_grade(p_lot uuid, p_hasil text, p_baris jsonb default '[]'::jsonb, p_catatan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lots;
  r record;
  total numeric(12,3) := 0;
  utama uuid;
  sebelum jsonb;
  sesudah jsonb;
begin
  perform private.wajib_izin('mutu.write');
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
  end if;
  if p_hasil is null or p_hasil not in ('lulus', 'ditahan') then
    raise exception 'Isi grading-nya, atau tandai ditahan.' using errcode = 'KT001';
  end if;
  if p_hasil = 'ditahan' and l.sisa_kg < l.kg then
    raise exception 'Lot % udah dipakai produksi, jadi nggak bisa ditahan.', l.kode using errcode = 'KT001';
  end if;
  if p_hasil = 'ditahan' and private.po_per_grade(l.po_id) then
    raise exception 'Lot % udah masuk pembelian, jadi nggak bisa ditahan. Koreksi pembeliannya dulu.', l.kode using errcode = 'KT001';
  end if;
  if p_hasil = 'lulus' and private.lot_per_ekor(l.id) then
    p_baris := private.grade_dari_ekor(l.id);
  end if;

  if p_hasil = 'lulus' then
    if p_baris is null or jsonb_typeof(p_baris) <> 'array' or jsonb_array_length(p_baris) = 0 then
      raise exception 'Isi berat buat minimal satu grade.' using errcode = 'KT001';
    end if;
    if (select count(distinct x ->> 'grade_id') from jsonb_array_elements(p_baris) x) <> jsonb_array_length(p_baris) then
      raise exception 'Satu grade cuma boleh diisi sekali.' using errcode = 'KT001';
    end if;
    for r in select * from jsonb_to_recordset(p_baris) as x(grade_id uuid, kg numeric) loop
      if r.kg is null or r.kg <= 0 or round(r.kg, 3) <> r.kg then
        raise exception 'Berat tiap grade harus lebih dari nol, paling banyak tiga angka di belakang koma.' using errcode = 'KT001';
      end if;
      if not exists (select 1 from public.grades g where g.id = r.grade_id and g.aktif) then
        raise exception 'Pilih grade yang masih aktif.' using errcode = 'KT001';
      end if;
      total := total + r.kg;
    end loop;
    if total > l.kg then
      raise exception 'Jumlah berat per grade (% kg) lebih dari berat lot % (% kg).', trim_scale(total)::text, l.kode, trim_scale(l.kg)::text using errcode = 'KT001';
    end if;
  end if;

  select jsonb_build_object('qc', l.qc, 'grade', coalesce(jsonb_object_agg(g.kode, lg.kg) filter (where lg.kg > 0), '{}'::jsonb))
  into sebelum
  from public.lot_grades lg join public.grades g on g.id = lg.grade_id where lg.lot_id = l.id;

  update public.lot_grades lg set kg = 0
  where lg.lot_id = l.id and lg.kg <> 0
    and (p_hasil = 'ditahan' or lg.grade_id not in (select (x ->> 'grade_id')::uuid from jsonb_array_elements(p_baris) x));

  if p_hasil = 'lulus' then
    insert into public.lot_grades (lot_id, grade_id, kg)
    select l.id, x.grade_id, x.kg from jsonb_to_recordset(p_baris) as x(grade_id uuid, kg numeric)
    on conflict (lot_id, grade_id) do update set kg = excluded.kg
      where public.lot_grades.kg <> excluded.kg;
    select lg.grade_id into utama
    from public.lot_grades lg join public.grades g on g.id = lg.grade_id
    where lg.lot_id = l.id and lg.kg > 0
    order by lg.kg desc, g.urutan, g.kode
    limit 1;
  end if;

  update public.lots
  set qc = p_hasil, grade_id = utama,
      qc_oleh = (select auth.uid()), qc_pada = now(), qc_catatan = coalesce(p_catatan, '')
  where id = l.id;

  -- Grading ulang lot yang udah digrading dicatat sebagai koreksi.
  if l.qc <> 'menunggu' then
    select jsonb_build_object('qc', p_hasil, 'grade', coalesce(jsonb_object_agg(g.kode, lg.kg) filter (where lg.kg > 0), '{}'::jsonb))
    into sesudah
    from public.lot_grades lg join public.grades g on g.id = lg.grade_id where lg.lot_id = l.id;
    perform private.catat_koreksi('lots', l.id, l.kode,
      'Grading ulang' || case when length(trim(coalesce(p_catatan, ''))) > 0 then ': ' || trim(p_catatan) else '' end,
      sebelum, sesudah);
  end if;

  if private.po_per_grade(l.po_id) then
    perform private.hitung_ulang_po(l.po_id, null, 'Grading ulang lot ' || l.kode);
  end if;
end;
$$;

-- ============================================================ terima sekali jalan
-- Per ekor (p_ekor diisi): berat dan jumlah ekor dihitung dari ekornya; kalau semua ekor udah ada grade-nya, lot langsung digrading.
-- Berat total (p_ekor kosong): p_kg wajib, jumlah ekor boleh kosong, grading (p_grade) boleh langsung diisi.
-- Grading di sini tetap butuh izin mutu.write (dicek di cek_mutu_grade).
create or replace function public.terima_ikan_lengkap(
  p_supplier uuid, p_tanggal date default current_date, p_cycle uuid default null, p_catatan text default '',
  p_proyek_baru text default null, p_kg numeric default null, p_jumlah_ekor int default null,
  p_ekor jsonb default null, p_grade jsonb default null
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
begin
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
  return id_lot;
end;
$$;

-- ============================================================ koreksi ekor
-- Ganti isian ekor satu lot (dipakai juga buat ngubah lot berat total jadi per ekor). Wajib alasan.
-- Ganti grade ekor di lot yang udah digrading butuh izin mutu.write. Pembelian per grade ikut dihitung ulang.
create or replace function public.koreksi_ekor(p_lot uuid, p_ekor jsonb, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lots;
  baru public.lots;
  sebelum jsonb;
  sesudah jsonb;
  grade_lama jsonb;
  grade_baru jsonb;
  utama uuid;
begin
  perform private.wajib_izin('penerimaan.write');
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan koreksinya.' using errcode = 'KT001';
  end if;
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('tag', e.no_tag, 'kg', e.kg, 'grade', g.kode, 'gancu', e.gancu) order by e.urutan), '[]'::jsonb)
  into grade_lama
  from public.lot_ekor e left join public.grades g on g.id = e.grade_id where e.lot_id = l.id and not e.batal;
  sebelum := jsonb_build_object('kg', l.kg, 'jumlah_ekor', l.jumlah_ekor, 'ekor', grade_lama);
  select coalesce(jsonb_object_agg(x.id, x.grade_id), '{}'::jsonb) into grade_lama
  from (select e.id, e.grade_id from public.lot_ekor e where e.lot_id = l.id and not e.batal) x;

  perform private.isi_ekor(l.id, p_ekor);
  perform private.sinkron_ekor_lot(l.id);

  select coalesce(jsonb_object_agg(x.id, x.grade_id), '{}'::jsonb) into grade_baru
  from (select e.id, e.grade_id from public.lot_ekor e where e.lot_id = l.id and not e.batal) x;
  if l.qc = 'lulus' and grade_baru is distinct from grade_lama then
    perform private.wajib_izin('mutu.write');
  end if;

  -- Lot yang udah digrading: hasil grading ikut ekornya.
  if l.qc = 'lulus' then
    update public.lot_grades lg set kg = 0
    where lg.lot_id = l.id and lg.kg <> 0
      and lg.grade_id not in (select (x ->> 'grade_id')::uuid from jsonb_array_elements(private.grade_dari_ekor(l.id)) x);
    insert into public.lot_grades (lot_id, grade_id, kg)
    select l.id, x.grade_id, x.kg from jsonb_to_recordset(private.grade_dari_ekor(l.id)) as x(grade_id uuid, kg numeric)
    on conflict (lot_id, grade_id) do update set kg = excluded.kg where public.lot_grades.kg <> excluded.kg;
    select lg.grade_id into utama from public.lot_grades lg join public.grades g on g.id = lg.grade_id
    where lg.lot_id = l.id and lg.kg > 0 order by lg.kg desc, g.urutan, g.kode limit 1;
    update public.lots set grade_id = utama where id = l.id;
  end if;

  select * into baru from public.lots where id = l.id;
  select coalesce(jsonb_agg(jsonb_build_object('tag', e.no_tag, 'kg', e.kg, 'grade', g.kode, 'gancu', e.gancu) order by e.urutan), '[]'::jsonb)
  into sesudah
  from public.lot_ekor e left join public.grades g on g.id = e.grade_id where e.lot_id = l.id and not e.batal;
  perform private.catat_koreksi('lots', l.id, l.kode, p_alasan,
    sebelum, jsonb_build_object('kg', baru.kg, 'jumlah_ekor', baru.jumlah_ekor, 'ekor', sesudah));
  if private.po_per_grade(l.po_id) then
    perform private.hitung_ulang_po(l.po_id, null, 'Koreksi ekor lot ' || l.kode || ': ' || trim(p_alasan));
  end if;
end;
$$;

-- Jumlah ekor lot yang dicatat berat total. Pertama kali diisi nggak perlu alasan; ngubah angka yang udah ada wajib alasan.
create or replace function public.isi_ekor_lot(p_lot uuid, p_jumlah int, p_alasan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lots;
begin
  perform private.wajib_izin('penerimaan.write');
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
  end if;
  if private.lot_per_ekor(l.id) then
    raise exception 'Lot % dicatat per ekor, jumlah ekornya ngikut data ekor.', l.kode using errcode = 'KT001';
  end if;
  if p_jumlah is not null and (p_jumlah <= 0 or p_jumlah > 100000) then
    raise exception 'Jumlah ekornya nggak masuk akal.' using errcode = 'KT001';
  end if;
  if p_jumlah is not distinct from l.jumlah_ekor then
    return;
  end if;
  if l.jumlah_ekor is not null then
    perform private.catat_koreksi('lots', l.id, l.kode, p_alasan,
      jsonb_build_object('jumlah_ekor', l.jumlah_ekor), jsonb_build_object('jumlah_ekor', p_jumlah));
  end if;
  update public.lots set jumlah_ekor = p_jumlah where id = l.id;
end;
$$;

-- Jumlah ekor yang masuk produksi. Pertama kali diisi nggak perlu alasan; ngubah angka yang udah ada wajib alasan.
create or replace function public.isi_ekor_produksi(p_production uuid, p_jumlah int, p_alasan text default '')
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
  if p_jumlah is not null and (p_jumlah <= 0 or p_jumlah > 100000) then
    raise exception 'Jumlah ekornya nggak masuk akal.' using errcode = 'KT001';
  end if;
  if p_jumlah is not distinct from p.jumlah_ekor then
    return;
  end if;
  if p.jumlah_ekor is not null then
    perform private.catat_koreksi('productions', p.id, p.kode, p_alasan,
      jsonb_build_object('jumlah_ekor', p.jumlah_ekor), jsonb_build_object('jumlah_ekor', p_jumlah));
  end if;
  update public.productions set jumlah_ekor = p_jumlah where id = p.id;
end;
$$;

-- ============================================================ koreksi timbangan produksi
-- Buat produksi yang udah selesai, diperiksa, atau disetujui (yang masih berjalan langsung diisi di formnya).
-- p_loin: [{"grade_id", "kg"}] total per grade (null = nggak diubah; produksi per potong dikoreksi lewat Buka lagi).
-- p_samping: [{"category_id", "kg"}] (null = nggak diubah). Limbah dan susut: null = belum ditimbang.
-- Status produksi nggak berubah. Hasil yang udah masuk stok jadi batas bawah loin + hasil samping.
create or replace function public.koreksi_timbangan(
  p_production uuid, p_loin jsonb, p_samping jsonb, p_limbah numeric, p_susut numeric, p_alasan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  r record;
  sebelum jsonb;
  sesudah jsonb;
  stok numeric(12,3);
  hasil numeric(12,3);
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  if p.status = 'berjalan' then
    raise exception 'Produksi % masih berjalan, timbangannya langsung diisi di formnya.', p.kode using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan koreksinya.' using errcode = 'KT001';
  end if;
  if (p_limbah is not null and (p_limbah < 0 or round(p_limbah, 3) <> p_limbah))
     or (p_susut is not null and (p_susut < 0 or round(p_susut, 3) <> p_susut)) then
    raise exception 'Limbah dan susut nggak boleh negatif, paling banyak tiga angka di belakang koma.' using errcode = 'KT001';
  end if;

  select jsonb_build_object(
    'loin', (select coalesce(jsonb_object_agg(g.kode, t.kg) filter (where t.kg > 0), '{}'::jsonb) from public.production_loin_totals t join public.grades g on g.id = t.grade_id where t.production_id = p.id),
    'samping', (select coalesce(jsonb_object_agg(c.nama, x.kg), '{}'::jsonb) from public.production_components x join public.component_categories c on c.id = x.category_id where x.production_id = p.id),
    'limbah', p.limbah_kg, 'susut', p.susut_kg)
  into sebelum;

  if p_loin is not null then
    if jsonb_typeof(p_loin) <> 'array' then
      raise exception 'Data loin nggak valid.' using errcode = 'KT001';
    end if;
    if exists (select 1 from public.production_items i where i.production_id = p.id and not i.batal) then
      raise exception 'Produksi % ditimbang per potong. Koreksi loinnya lewat Buka lagi.', p.kode using errcode = 'KT001';
    end if;
    if (select count(distinct x ->> 'grade_id') from jsonb_array_elements(p_loin) x) <> jsonb_array_length(p_loin) then
      raise exception 'Satu grade cuma boleh diisi sekali.' using errcode = 'KT001';
    end if;
    for r in select * from jsonb_to_recordset(p_loin) as x(grade_id uuid, kg numeric) loop
      if r.kg is null or r.kg < 0 or round(r.kg, 3) <> r.kg then
        raise exception 'Berat loin per grade nggak boleh negatif, paling banyak tiga angka di belakang koma.' using errcode = 'KT001';
      end if;
      if not exists (select 1 from public.grades g where g.id = r.grade_id and (g.aktif or r.kg = 0)) then
        raise exception 'Grade nggak dikenal.' using errcode = 'KT001';
      end if;
      if r.kg = 0 and not exists (select 1 from public.production_loin_totals t where t.production_id = p.id and t.grade_id = r.grade_id) then
        continue;
      end if;
      insert into public.production_loin_totals (production_id, grade_id, kg) values (p.id, r.grade_id, r.kg)
      on conflict (production_id, grade_id) do update set kg = excluded.kg where public.production_loin_totals.kg <> excluded.kg;
    end loop;
  end if;

  if p_samping is not null then
    if jsonb_typeof(p_samping) <> 'array' then
      raise exception 'Data hasil samping nggak valid.' using errcode = 'KT001';
    end if;
    for r in select * from jsonb_to_recordset(p_samping) as x(category_id uuid, kg numeric) loop
      if r.kg is null or r.kg < 0 or round(r.kg, 3) <> r.kg then
        raise exception 'Berat hasil samping nggak boleh negatif, paling banyak tiga angka di belakang koma.' using errcode = 'KT001';
      end if;
      if not exists (select 1 from public.component_categories c where c.id = r.category_id and c.komponen = 'hasil_samping' and (c.aktif or r.kg = 0)) then
        raise exception 'Jenis hasil samping nggak dikenal.' using errcode = 'KT001';
      end if;
      insert into public.production_components (production_id, category_id, kg) values (p.id, r.category_id, r.kg)
      on conflict (production_id, category_id) do update set kg = excluded.kg where public.production_components.kg <> excluded.kg;
    end loop;
  end if;

  update public.productions set limbah_kg = p_limbah, susut_kg = p_susut
  where id = p.id and (limbah_kg is distinct from p_limbah or susut_kg is distinct from p_susut);

  perform private.cek_tidak_melebihi(p.id);
  select coalesce(sum(u.kg_masuk), 0) into stok from public.storage_units u where u.production_id = p.id;
  select n.loin_kg + n.samping_kg into hasil from public.v_neraca_produksi n where n.production_id = p.id;
  if stok > hasil then
    raise exception 'Hasil % yang udah masuk stok % kg, jadi loin ditambah hasil samping nggak boleh kurang dari itu.', p.kode, trim_scale(stok)::text using errcode = 'KT001';
  end if;

  select jsonb_build_object(
    'loin', (select coalesce(jsonb_object_agg(g.kode, t.kg) filter (where t.kg > 0), '{}'::jsonb) from public.production_loin_totals t join public.grades g on g.id = t.grade_id where t.production_id = p.id),
    'samping', (select coalesce(jsonb_object_agg(c.nama, x.kg), '{}'::jsonb) from public.production_components x join public.component_categories c on c.id = x.category_id where x.production_id = p.id),
    'limbah', p_limbah, 'susut', p_susut)
  into sesudah;
  perform private.catat_koreksi('productions', p.id, p.kode, 'Koreksi timbangan: ' || trim(p_alasan), sebelum, sesudah);
end;
$$;

-- ============================================================ koreksi berat masuk setelah masuk stok
-- Versi 17 Nov nolak koreksi berat masuk kalau hasilnya udah masuk stok. Berat masuk nggak ngubah stok, jadi sekarang boleh;
-- produksi yang udah masuk stok statusnya tetap (nggak balik ke Berjalan).
create or replace function public.koreksi_produksi(
  p_production uuid, p_tanggal date, p_cycle uuid, p_kg_pt numeric, p_catatan text, p_alasan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  baru public.productions;
  c public.cycles;
  ada_lot boolean;
  balik boolean := false;
  sudah_stok boolean;
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  ada_lot := exists (select 1 from public.lot_allocations a where a.production_id = p.id);
  sudah_stok := exists (select 1 from public.storage_units u where u.production_id = p.id);
  if p_cycle is not null then
    select * into c from public.cycles where id = p_cycle;
    if not found then
      raise exception 'Proyeknya nggak ketemu.' using errcode = 'KT001';
    end if;
    if p_cycle is distinct from p.cycle_id and c.status <> 'terbuka' then
      raise exception 'Proyek % udah ditutup.', c.kode using errcode = 'KT001';
    end if;
    if c.lini_bisnis = 'titip' then
      raise exception 'Proyek % itu titip saja, nggak bisa dipakai buat produksi.', c.kode using errcode = 'KT001';
    end if;
    if c.lini_bisnis = 'jasa' and ada_lot then
      raise exception 'Produksi ini pakai lot pembelian, jadi nggak bisa masuk proyek jasa produksi %.', c.kode using errcode = 'KT001';
    end if;
    if c.lini_bisnis = 'jual' and p_kg_pt is not null then
      raise exception 'Proyek % itu jual, jadi berat ikan dari PT nggak dipakai.', c.kode using errcode = 'KT001';
    end if;
  end if;
  if p_kg_pt is distinct from p.kg_masuk_pt then
    if ada_lot then
      raise exception 'Produksi ini pakai lot pembelian, jadi berat ikan dari PT nggak dipakai.' using errcode = 'KT001';
    end if;
    perform private.valid_kg(p_kg_pt, 'Berat ikan dari PT');
    balik := p.status <> 'berjalan' and not sudah_stok;
  end if;

  update public.productions
  set tanggal = coalesce(p_tanggal, tanggal), cycle_id = p_cycle, kg_masuk_pt = round(p_kg_pt, 3), catatan = coalesce(p_catatan, ''),
      status = case when balik then 'berjalan' else status end
  where id = p.id
  returning * into baru;
  perform private.cek_tidak_melebihi(p.id);
  perform private.catat_koreksi('productions', p.id, p.kode, p_alasan,
    jsonb_build_object('tanggal', p.tanggal, 'cycle_id', p.cycle_id, 'kg_masuk_pt', p.kg_masuk_pt, 'catatan', p.catatan, 'status', p.status),
    jsonb_build_object('tanggal', baru.tanggal, 'cycle_id', baru.cycle_id, 'kg_masuk_pt', baru.kg_masuk_pt, 'catatan', baru.catatan, 'status', baru.status));
end;
$$;

create or replace function public.ubah_alokasi_lot(p_production uuid, p_lot uuid, p_kg numeric, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  l public.lots;
  lama numeric(12,3) := 0;
  selisih numeric(12,3);
  status_baru text;
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  if p.kg_masuk_pt is not null then
    raise exception 'Produksi % pakai ikan dari PT, nggak pakai lot.', p.kode using errcode = 'KT001';
  end if;
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
  end if;
  if l.qc = 'ditahan' then
    raise exception 'Lot % ditahan (gugur/bau), nggak bisa diolah.', l.kode using errcode = 'KT001';
  end if;
  perform private.valid_kg(p_kg, 'Berat dari lot');
  select a.kg into lama from public.lot_allocations a where a.production_id = p.id and a.lot_id = l.id;
  lama := coalesce(lama, 0);
  selisih := round(p_kg, 3) - lama;
  if selisih > l.sisa_kg then
    raise exception 'Lot % cuma sisa % kg.', l.kode, l.sisa_kg::text using errcode = 'KT001';
  end if;
  update public.lots set sisa_kg = sisa_kg - selisih where id = l.id;
  insert into public.lot_allocations (production_id, lot_id, lot_kode, kg) values (p.id, l.id, l.kode, round(p_kg, 3))
  on conflict (production_id, lot_id) do update set kg = excluded.kg;
  -- Yang belum masuk stok balik ke Berjalan biar diperiksa ulang; yang udah masuk stok statusnya tetap.
  status_baru := case when exists (select 1 from public.storage_units u where u.production_id = p.id) then p.status else 'berjalan' end;
  if p.status <> status_baru then
    update public.productions set status = status_baru where id = p.id;
  end if;
  perform private.cek_tidak_melebihi(p.id);
  perform private.catat_koreksi('productions', p.id, p.kode, p_alasan,
    jsonb_build_object('lot', l.kode, 'kg', lama, 'status', p.status),
    jsonb_build_object('lot', l.kode, 'kg', round(p_kg, 3), 'status', status_baru));
end;
$$;

-- ============================================================ tampilan
-- Kolom baru di akhir view supaya kolom lama nggak bergeser.
create or replace view public.v_productions with (security_invoker = true) as
select
  p.id, p.kode, p.tanggal, p.status, p.cycle_id, cy.kode as siklus_kode, p.catatan,
  n.masuk_kg, n.loin_kg, n.jumlah_loin, n.samping_kg, n.limbah_kg, n.susut_kg, n.belum_jelas_kg, n.hasil_pct, n.belum_jelas_pct,
  p.penjelasan_selisih, p.selisih_diterima, p.catatan_perbaikan,
  p.selesai_oleh, p.selesai_pada, p.qc_oleh, p.qc_pada, p.owner_oleh, p.owner_pada, p.dibuat_pada,
  p.kg_masuk_pt, cy.nama as proyek_nama, coalesce(cy.lini_bisnis, 'jual') as lini_bisnis, cy.pt_id, b.nama as pt_nama,
  exists (select 1 from public.storage_units u where u.production_id = p.id) as sudah_stok,
  p.jumlah_ekor
from public.productions p
left join public.cycles cy on cy.id = p.cycle_id
left join public.buyers b on b.id = cy.pt_id
left join public.v_neraca_produksi n on n.production_id = p.id;

-- Laporan harga beli: potongan gancu nggak dibayar, jadi nggak dihitung sebagai "Belum dinilai".
create or replace view public.v_harga_beli with (security_invoker = true) as
select
  l.tanggal_terima as tanggal, l.supplier_id, coalesce(s.nama, '-') as supplier_nama,
  coalesce(g.kode, 'Belum dinilai') as grade_kode,
  sum(x.kg)::numeric(12,3) as kg,
  sum(round(x.kg * coalesce(pl.harga_per_kg, po.harga_per_kg), 2))::numeric(16,2) as nilai,
  count(distinct l.id)::int as jumlah_lot
from public.lots l
join public.purchase_orders po on po.id = l.po_id
left join public.suppliers s on s.id = l.supplier_id
cross join lateral (
  select lg.grade_id, lg.kg from public.lot_grades lg where lg.lot_id = l.id and lg.kg > 0 and l.qc = 'lulus'
  union all
  select null::uuid, l.kg
    - coalesce((select sum(lg.kg) from public.lot_grades lg where lg.lot_id = l.id and l.qc = 'lulus'), 0)
    - coalesce((select sum(e.potongan_kg) from public.lot_ekor e where e.lot_id = l.id and not e.batal and l.qc = 'lulus'), 0)
) x
left join public.grades g on g.id = x.grade_id
left join public.purchase_order_lines pl on pl.po_id = po.id and pl.grade_id = x.grade_id and pl.kg > 0
where x.kg > 0
group by l.tanggal_terima, l.supplier_id, s.nama, g.kode;

-- ============================================================ hak panggil
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.terima_ikan_lengkap(uuid, date, uuid, text, text, numeric, integer, jsonb, jsonb)',
    'public.koreksi_ekor(uuid, jsonb, text)',
    'public.isi_ekor_lot(uuid, integer, text)',
    'public.isi_ekor_produksi(uuid, integer, text)',
    'public.koreksi_timbangan(uuid, jsonb, jsonb, numeric, numeric, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array[
    'private.jaga_lot_ekor()', 'private.potongan_gancu()', 'private.isi_ekor(uuid, jsonb)', 'private.sinkron_ekor_lot(uuid)',
    'private.grade_dari_ekor(uuid)', 'private.lot_per_ekor(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end;
$$;
